import {
  convertModelMessages,
  generateProjectTitle,
} from "@/app/action/action";
import { getAuthServer } from "@/lib/insforge-server";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  UIMessage,
} from "ai";
import { NextRequest, NextResponse } from "next/server";

const emit = (
  writer: any,
  type: string,
  data: object = {},
  options?: {
    id?: string;
    transient?: boolean
  }
) => {
  writer.write({
    id: options?.id,
    type: `data-${type}`,
    data,
    transient: options?.transient
  })
}

export async function POST(request: NextRequest) {
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

    const uiStream = createUIMessageStream({
      generateId: generateId,
      async execute({ writer }) {
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
          }
        } catch (error) {
          console.log(error)
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
