import {
  convertModelMessages,
  generateProjectTitle,
} from "@/app/action/action";
import { getAuthServer } from "@/lib/insforge-server";
import {
  SLEEK_CHAT_PROMPT,
  SLEEK_INTENT_PROMPT,
  WEB_ANALYSIS_PROMPT,
} from "@/lib/prompt";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  UIMessage,
} from "ai";
import { NextRequest, NextResponse } from "next/server";

class AbortError extends Error {
  constructor() {
    super("Request aborted");
    this.name = "AbortError";
  }
}

const emit = (
  writer: any,
  type: string,
  data: object = {},
  options?: {
    id?: string;
    transient?: boolean;
  },
) => {
  writer.write({
    id: options?.id,
    type: `data-${type}`,
    data,
    transient: options?.transient,
  });
};

async function runGenerationWorker({
  insforge,
  writer,
  projectId,
  analysis,
  existingPages,
  latestUserMessage,
  checkAbort,
}: any) {
  const { pages } = analysis;
  console.log(pages?.length, pages, "pages")

  if (!analysis || !pages || pages?.length === 0) {
    throw new Error("No pages generated");
  }

  emit(writer, "generation", {
    status: "generating",
    pages: pages.map((page: any) => ({
      id: page.id,
      name: page.name,
      done: false
    }))
  }, { id: "gen-card" })

  emit(writer, "pages-skeleton", {
    pages: pages.map((page: any) => ({
      id: page.id,
      name: page.name,
      rootStyles: page.rootStyles,
      htmlContent: "",
      isLoading: true
    }))
  }, { transient: true });

  
}

export async function POST(request: NextRequest) {
  const { signal } = request;
  try {
    const { messages, slugId, selectedPageId } = (await request.json()) as {
      messages: UIMessage[];
      slugId: string;
      selectedPageId: string;
    };

    const { user, insforge } = await getAuthServer();
    if (!user?.id)
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        { status: 401 },
      );

    let { data: project, error: projectError } = await insforge.database
      .from("projects")
      .select("id, title")
      .eq("slugId", slugId)
      .single();

    if (!project) {
      console.log("creating new project");
      const lastMessage = messages[messages.length - 1];
      const messageText = lastMessage?.parts.find(
        (part) => part.type === "text",
      )?.text as string;
      const title = await generateProjectTitle(messageText);
      const { data: newProject, error } = await insforge.database
        .from("projects")
        .insert([
          {
            slugId,
            title,
            userId: user.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      if (!newProject) throw new Error("Failed to create project");

      project = newProject;
    }

    const projectId = project!.id;

    const { data: existingPages } = await insforge.database
      .from("pages")
      .select("id, name, rootStyles, htmlContent")
      .eq("projectId", projectId)
      .order("createdAt", { ascending: true })
      .limit(2);

    const hasExistingPages = existingPages && existingPages.length;

    const lastMessage = messages[messages.length - 1];
    await insforge.database.from("messages").insert([
      {
        projectId,
        role: "user",
        parts: lastMessage.parts,
      },
    ]);

    const modelMessages = await convertModelMessages(messages.slice(10));

    const latestUserMessage = (
      lastMessage.parts?.find((p: any) => p.type === "text") as any
    )?.text;
    const imageParts = lastMessage.parts
      .filter(
        (part) => part.type === "file" && part.mediaType.startsWith("image/"),
      )
      .map((p: any) => ({
        type: "image_url" as const,
        image_url: {
          url: p.url,
        },
      }));

    const { data: selectedPage } = selectedPageId
      ? await insforge.database
          .from("pages")
          .select("id, name, rootStyles, htmlContent")
          .eq("id", selectedPageId)
          .single()
      : { data: null };

    const checkAbort = () => {
      if (signal.aborted) throw new AbortError();
    };

    const uiStream = createUIMessageStream({
      generateId: generateId,
      async execute({ writer }) {
        let genCardEmitted = false;
        try {
          if (project?.title) {
            emit(
              writer,
              "project-title",
              {
                title: project.title,
              },
              { id: "proj-title", transient: true },
            );

            checkAbort();
            const result = await insforge.ai.chat.completions.create({
              model: "anthropic/claude-sonnet-4.5",
              messages: [
                {
                  role: "system",
                  content: SLEEK_INTENT_PROMPT,
                },
                {
                  role: "user",
                  content: `${latestUserMessage}\nCLASSIFY THE INTENT NOW. ONE WORD ONLY`,
                },
              ],
            });

            const classify_output = result.choices[0].message.content
              .trim()
              .toLowerCase();

            const firstWord = classify_output.split(" ")[0];
            const validIntents = ["chat", "generate", "regenerate"];
            const intent = validIntents.includes(firstWord)
              ? (firstWord as any)
              : "chat";

            const classification = { intent };

            if (classification.intent === "chat") {
              const chatResult = await insforge.ai.chat.completions.create({
                model: "google/gemini-2.5-pro",
                messages: [
                  {
                    role: "system",
                    content: SLEEK_CHAT_PROMPT,
                  },
                  ...modelMessages,
                ],
                stream: true,
                webSearch: { enabled: false },
              });

              const chatId = generateId();
              let chatText = "";

              writer.write({ type: "text-start", id: chatId });

              for await (const chunk of chatResult) {
                checkAbort();
                const delta = chunk.choices[0]?.delta?.content || "";
                chatText += delta;
                if (delta) {
                  writer.write({
                    type: "text-delta",
                    id: chatId,
                    delta,
                  });
                }
              }

              writer.write({ type: "text-end", id: chatId });
              checkAbort();

              await insforge.database.from("messages").insert([
                {
                  projectId,
                  role: "assistant",
                  parts: [{ type: "text", text: chatText }],
                },
              ]);

              return;
            }

            const isRegen =
              classification.intent === "regenerate" && !!selectedPage;

            console.log(classification, "classification", isRegen);

            emit(
              writer,
              "generation",
              {
                status: "analyzing",
                page: [],
              },
              {
                id: "gen-card",
              },
            );

            genCardEmitted = true

            const analysisResult = await insforge.ai.chat.completions.create({
              model: "anthropic/claude-sonnet-4.5",
              messages: [
                {
                  role: "system",
                  content: WEB_ANALYSIS_PROMPT,
                },
                {
                  role: "user",
                  content: [
                    ...imageParts,
                    {
                      type: "text",
                      text: `${
                        imageParts.length > 0
                          ? `Reference image attached — extract EVERY detail: colors, layout, components, spacing. Match it precisely.\n\n`
                          : ""
                      }
    ${
      selectedPage && isRegen
        ? `EDITING THIS PAGE:\n- Name: ${selectedPage.name}\n- Current Styles:\n${selectedPage.rootStyles}\n- Current HTML:\n${selectedPage.htmlContent}\nBe surgical apply only requested changes.\n\n`
        : selectedPage && !isRegen
          ? `STYLE REFERENCE (match this brand DNA):
                              - Name: ${selectedPage.name}
                              - Brand Colors & Fonts: See Styles below.
                              - Logo/Header Pattern: ${selectedPage.htmlContent.substring(0, 1500)}
                              - Styles:${selectedPage.rootStyles}\n\n`
          : ""
    }
        ${
          hasExistingPages && !isRegen
            ? `EXISTING PAGES (do NOT recreate):\n${existingPages!.map((p: any) => `- ${p.name}\n${p.rootStyles}`).join("\n")}\n\n`
            : ""
        }
        USER REQUEST: "${latestUserMessage}"OUTPUT RAW JSON ONLY.`.trim(),
                    },
                  ],
                },
              ],
              maxTokens: 28000,
            });

            checkAbort();

            let analysis: any;
            const analysisText =
              analysisResult.choices[0].message.content || "{}";
              
            try {
              const jsonStart = analysisText.indexOf('{');
              const jsonEnd = analysisText.lastIndexOf('}');
              if (jsonStart === -1 || jsonEnd === -1) throw new Error("No JSON object found");
              const cleanJson = analysisText.substring(jsonStart, jsonEnd + 1);
              analysis = JSON.parse(cleanJson)
            } catch (error) {
              console.log("Analysis error", error);
              throw new Error("Failed to parse json output");
            }

            if (isRegen && selectedPageId) {
              checkAbort();
              // await runRegenerateWorker({
              //   insforge,
              //   writer,
              //   projectId,
              //   selectedPage,
              //   latestUserMessage,
              //   analysis,
              //   checkAbort,
              // })
              return
            }

            checkAbort();
            await runGenerationWorker({
              insforge,
              writer,
              projectId,
              analysis,
              existingPages,
              latestUserMessage,
              checkAbort,
            });
          }
        } catch (error) {
          console.log(error);
          if (error instanceof AbortError) {
            if (genCardEmitted) {
              emit(writer, "generation", { status: "canceled" }, {
                id: "gen-card"
              })
              writer.write({ type: "abort", })
            }
            return
          }
        }
      },
    });

    return createUIMessageStreamResponse({
      stream: uiStream,
    });
  } catch (error) {
    console.log(error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
