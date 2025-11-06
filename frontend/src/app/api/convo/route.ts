import { NextRequest, NextResponse } from "next/server";
import { exampleConvoData } from "@/lib/load-convo-sample";

// Use the example convo data from load-convo-sample
// In production, this would fetch from the backend API or database
async function loadConversationContent() {
  // Return the example data - in production, fetch from backend API
  // or use: await fetch(`${BACKEND_URL}/convo`, { method: 'POST', body: JSON.stringify({ convo_id }) })
  return exampleConvoData;
}

export async function POST(req: NextRequest) {
  try {
    const { convo_id } = await req.json();

    if (convo_id === undefined || convo_id === null) {
      return NextResponse.json(
        { error: "convo_id is required" },
        { status: 400 }
      );
    }

    // Load conversation content
    const convoContent = await loadConversationContent();

    // Find conversation (for now, we only have convo_id 1)
    // In production, this would come from a database
    if (convo_id === 1) {
      const response = {
        id: 1,
        name: "No Name",
        user_id_list: [1, 2, 3],
        content: convoContent,
      };

      return NextResponse.json(response);
    }

    // Conversation not found
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 }
    );
  } catch (error: any) {
    console.error("Error in /api/convo:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve conversation" },
      { status: 500 }
    );
  }
}

