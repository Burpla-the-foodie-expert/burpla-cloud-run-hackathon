import { NextResponse } from "next/server";

// In-memory cache for conversations (similar to backend)
// In production, this would come from a database or proxy to the backend API
const conversationsCache: Array<{
  convo_id: number;
  convo_name: string;
  convo_user_ids: number[];
}> = [
  {
    convo_id: 1,
    convo_name: "No Name",
    convo_user_ids: [1, 2, 3],
  },
];

export async function GET() {
  try {
    // Return conversations without content (matching backend /init endpoint)
    // This matches the backend's GET /init endpoint behavior
    const response = conversationsCache.map((convo) => ({
      convo_id: convo.convo_id,
      convo_name: convo.convo_name,
      convo_user_ids: convo.convo_user_ids,
    }));

    return NextResponse.json({ conversations: response });
  } catch (error: any) {
    console.error("Error in /api/init:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve conversations" },
      { status: 500 }
    );
  }
}

