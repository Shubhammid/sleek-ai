import { getAuthServer } from "@/lib/insforge-server";
import { UIMessage } from "ai";
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

    } catch (error) {
    console.log(error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}