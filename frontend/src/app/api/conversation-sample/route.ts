import { NextResponse } from "next/server";
import { exampleConvoData } from "@/lib/load-convo-sample";

/**
 * Returns the conversation sample data (convo_sample.json format)
 * This endpoint allows components to fetch the sample conversation data
 */
export async function GET() {
  try {
    return NextResponse.json(exampleConvoData);
  } catch (error: any) {
    console.error("Error in /api/conversation-sample:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load conversation sample" },
      { status: 500 }
    );
  }
}

