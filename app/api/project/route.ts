import { convertModelMessages, generateProjectTitle } from "@/app/action/action";
import { getAuthServer } from "@/lib/insforge-server";
import { createUIMessageStream, generateId, UIMessage } from "ai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
      const { messages, slugId, selectedPageId } = await request.json() as {
      messages: UIMessage[];
      slugId: string;
      selectedPageId: string;
    }

    const { user, insforge } = await getAuthServer()
    if (!user?.id) return NextResponse.json({
      error: "Unauthorized"
    }, { status: 401 })

    let { data: project, error: projectError } = await insforge.database
      .from("projects")
      .select("id, title")
      .eq("slugId", slugId)
      .single();

    if (!project) {
      console.log("creating new project");
      const lastMessage = messages[messages.length - 1];
      const messageText = lastMessage?.parts.find((part) =>
        part.type === "text"
      )?.text as string
      const title = await generateProjectTitle(messageText);
      const { data: newProject, error } = await insforge
        .database
        .from("projects")
        .insert([
          {
            slugId,
            title,
            userId: user.id
          }
        ])
        .select()
        .single()

      if (error) throw error;
      if (!newProject) throw new Error("Failed to create project");

      project = newProject
    }

    const projectId = project!.id;

    const { data: existingPages } = await insforge.database.from("pages")
      .select("id, name, rootStyles, htmlContent")
      .eq("projectId", projectId)
      .order("createdAt", { ascending: true })
      .limit(2)

    const hasExistingPages = existingPages && existingPages.length

    const lastMessage = messages[messages.length - 1];
    await insforge.database.from("messages").insert([
      {
        projectId,
        role: "user",
        parts: lastMessage.parts
      }
    ])

    const modelMessages = await convertModelMessages(messages.slice(10))

    const latestUserMessage = (lastMessage.parts?.find((p: any) => p.type === 'text') as any)?.text;
    const imageParts = lastMessage.parts.filter((part) => part.type === "file" && part.mediaType.startsWith("image/"))
      .map((p: any) => ({
        type: "image_url" as const,
        image_url: {
          url: p.url
        }
      }))
    
    const uiStream = createUIMessageStream({
      generateId: generateId,
      async execute({writer}){

      }
    })

    } catch (error) {
    console.log(error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}