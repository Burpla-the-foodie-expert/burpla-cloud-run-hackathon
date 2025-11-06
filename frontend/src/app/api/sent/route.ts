import { NextRequest, NextResponse } from "next/server";
import { createOpenAI } from "@ai-sdk/openai";
import {
  detectMessageIntent,
  extractLocation,
  extractTime,
} from "@/lib/message-intent";
import { searchPlaces, getPlaceDetails } from "@/lib/google-places";
import type { InteractiveCardConfig } from "@/components/ai-elements/interactive-card";
import {
  getConversationContext,
  getSessionUsers,
  buildSystemMessage,
} from "@/lib/session-store";

// Check if we should use Google Gemini (like backend) or OpenAI
const USE_GEMINI = process.env.GOOGLE_API_KEY && !process.env.OPENAI_API_KEY;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Allow streaming responses up to 30 seconds
export const runtime = "nodejs"; // Use nodejs runtime for Gemini, edge for OpenAI
export const maxDuration = 30;

let openaiClient: ReturnType<typeof createOpenAI> | null = null;
let geminiClient: any = null;

// Initialize clients
if (USE_GEMINI && GOOGLE_API_KEY) {
  try {
    const { GoogleGenerativeAI } = require("@google/generative-ai");
    geminiClient = new GoogleGenerativeAI(GOOGLE_API_KEY);
  } catch (error) {
    console.warn(
      "Google Generative AI not available, using OpenAI fallback:",
      error
    );
  }
}

if (!geminiClient && OPENAI_API_KEY) {
  openaiClient = createOpenAI({
    apiKey: OPENAI_API_KEY,
  });
}

interface UserMessageRequest {
  user_id: number;
  name: string;
  message: string;
  id?: string;
  is_to_agent?: boolean;
  location?: { lat: number; lng: number };
  sessionId?: string; // Session ID to retrieve conversation context
}

interface AgentMessageResponse {
  user_id: number;
  name: string;
  message: string;
  id: string;
  cardConfig?: InteractiveCardConfig;
}

export async function POST(req: NextRequest) {
  try {
    const body: UserMessageRequest = await req.json();

    const {
      user_id,
      name,
      message,
      id,
      is_to_agent = true,
      location,
      sessionId,
    } = body;

    // Validate required fields
    if (!message) {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 }
      );
    }

    // Generate message ID if not provided
    const messageId =
      id || `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // If message is not to agent, return acknowledgment
    if (!is_to_agent) {
      return NextResponse.json({
        user_id: 0,
        name: "Burpla",
        message: "Message received",
        id: messageId,
      });
    }

    // Detect message intent
    const intent = detectMessageIntent(message);
    const locationInfo = extractLocation(message);
    const timeInfo = extractTime(message);

    console.log("[API /sent] Message:", message);
    console.log("[API /sent] Detected intent:", intent);
    console.log("[API /sent] GOOGLE_API_KEY available:", !!GOOGLE_API_KEY);

    let cardConfig: InteractiveCardConfig | undefined;

    // Generate card configuration based on intent
    try {
      if (intent === "restaurant_recommendation") {
        if (!GOOGLE_API_KEY) {
          console.warn(
            "[API /sent] GOOGLE_API_KEY not set, cannot search restaurants"
          );
        } else {
          // Search for restaurants
          const searchQuery = message; // Use full message as search query
          console.log("[API /sent] Searching places with query:", searchQuery);
          const restaurants = await searchPlaces(searchQuery, GOOGLE_API_KEY);
          console.log("[API /sent] Found restaurants:", restaurants.length);

          if (restaurants.length > 0) {
            cardConfig = {
              type: "restaurant_recommendation",
              config: {
                title: "Restaurant Recommendations",
                restaurants: restaurants.slice(0, 5), // Limit to 5 restaurants
                userLocation: location,
              },
            };
            console.log("[API /sent] Created restaurant_recommendation card");
          } else {
            console.log("[API /sent] No restaurants found for query");
          }
        }
      } else if (intent === "voting") {
        if (!GOOGLE_API_KEY) {
          console.warn(
            "[API /sent] GOOGLE_API_KEY not set, cannot create vote card"
          );
        } else {
          // For voting, extract restaurant search query more intelligently
          // Try to find restaurant/food context first
          let searchQuery = message
            .replace(
              /generate.*vote|create.*vote|make.*vote|vote.*list|voting.*list/gi,
              ""
            )
            .replace(
              /^.*?(\b(restaurant|food|eat|dining|cafe|bar|pizza|italian|chinese|mexican|sushi|seafood|burger|bbq|steak|thai|japanese|korean|indian).*)/i,
              "$1"
            )
            .replace(
              /\b(vote|voting|generate|create|list|the|for|to|on|with)\b/gi,
              ""
            )
            .trim();

          // If still empty or too short, try to extract location or use a default
          if (!searchQuery || searchQuery.length < 3) {
            // Try to extract location or restaurant type from original message
            const locationMatch = message.match(
              /\b(in|near|at|around)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?|\d{5})\b/i
            );
            const cuisineMatch = message.match(
              /\b(italian|chinese|mexican|sushi|seafood|pizza|burger|bbq|steak|thai|japanese|korean|indian|restaurant|food)\b/i
            );

            if (locationMatch) {
              searchQuery = `restaurants ${locationMatch[2]}`;
            } else if (cuisineMatch) {
              searchQuery = `${cuisineMatch[1]} restaurant`;
            } else {
              searchQuery = "restaurants"; // Default fallback
            }
          }

          console.log("[API /sent] Voting - search query:", searchQuery);

          if (searchQuery) {
            const restaurants = await searchPlaces(searchQuery, GOOGLE_API_KEY);
            console.log(
              "[API /sent] Found restaurants for voting:",
              restaurants.length
            );

            if (restaurants.length > 0) {
              // Get details for top restaurants to create vote options
              const voteOptions = await Promise.all(
                restaurants.slice(0, 3).map(async (restaurant) => {
                  if (restaurant.placeId) {
                    try {
                      const details = await getPlaceDetails(
                        restaurant.placeId,
                        GOOGLE_API_KEY
                      );
                      return {
                        id: restaurant.placeId || restaurant.id,
                        restaurant_id: restaurant.placeId || restaurant.id,
                        restaurant_name: details.name || restaurant.name,
                        name: details.name || restaurant.name,
                        description: `${
                          details.rating
                            ? `${details.rating.toFixed(1)}/5.0`
                            : ""
                        } ${restaurant.formattedAddress || ""}`.trim(),
                        review:
                          details.review ||
                          `${details.rating?.toFixed(1) || "N/A"}/5.0`,
                        number_of_vote: 0,
                        votes: 0,
                        map: details.googleMapsUri || restaurant.googleMapsUri,
                        hyperlink:
                          details.googleMapsUri || restaurant.googleMapsUri,
                        googleMapsUri:
                          details.googleMapsUri || restaurant.googleMapsUri,
                        image: details.photoUri,
                        photoUri: details.photoUri,
                        rating: details.rating || restaurant.rating,
                        userRatingCount: restaurant.userRatingCount,
                        location:
                          details.address || restaurant.formattedAddress,
                      };
                    } catch (error) {
                      console.error(
                        "[API /sent] Error getting place details:",
                        error
                      );
                      return null;
                    }
                  }
                  return null;
                })
              );

              const validOptions = voteOptions.filter((opt) => opt !== null);

              if (validOptions.length > 0) {
                cardConfig = {
                  type: "voting",
                  config: {
                    question: "Which option do you prefer?",
                    options: validOptions as any,
                    totalVotes: 0,
                    allowVoting: false,
                  },
                };
                console.log(
                  "[API /sent] Created voting card with",
                  validOptions.length,
                  "options"
                );
              } else {
                console.log("[API /sent] No valid vote options created");
              }
            } else {
              console.log("[API /sent] No restaurants found for voting");
            }
          } else {
            console.log("[API /sent] Empty search query for voting");
          }
        }
      } else if (intent === "reminder") {
        // Create reminder card
        const time = timeInfo.time
          ? new Date(Date.now() + 2 * 60 * 60 * 1000) // Default to 2 hours from now if time specified
          : new Date(Date.now() + 24 * 60 * 60 * 1000); // Default to tomorrow

        cardConfig = {
          type: "reminder",
          config: {
            title: "Reminder",
            description: `Reminder set based on your request: "${message}"`,
            time,
            priority: "medium",
            location: location
              ? {
                  name: locationInfo.location || "Location",
                  address: "",
                  coordinates: location,
                }
              : undefined,
          },
        };
        console.log("[API /sent] Created reminder card");
      }
    } catch (cardError: any) {
      console.error("[API /sent] Error generating card:", cardError);
      console.error("[API /sent] Card error stack:", cardError.stack);
      // Continue without card if generation fails
    }

    console.log(
      "[API /sent] Final cardConfig:",
      cardConfig ? cardConfig.type : "none"
    );

    // Get conversation context from session
    const conversationHistory = sessionId
      ? getConversationContext(sessionId, 20)
      : [];

    const sessionUsers = sessionId ? getSessionUsers(sessionId) : [];

    console.log(
      "[API /sent] Conversation context:",
      conversationHistory.length,
      "messages"
    );

    // Generate AI response text with conversation context
    try {
      let agentResponseText = "";

      // Build system message with context
      const systemMessageContent = buildSystemMessage(
        name,
        location,
        sessionUsers
      );

      if (USE_GEMINI && geminiClient) {
        // Use Google Gemini (matching backend)
        const model = geminiClient.getGenerativeModel({
          model: "gemini-2.0-flash-exp",
        });

        // Build conversation history for Gemini
        // Gemini chat history format: array of parts with role and parts
        const history: Array<{ role: string; parts: Array<{ text: string }> }> =
          [];

        // Add conversation history (excluding current message)
        conversationHistory.forEach((msg) => {
          if (msg.role === "user") {
            history.push({
              role: "user",
              parts: [{ text: msg.content }],
            });
          } else if (msg.role === "assistant") {
            history.push({
              role: "model",
              parts: [{ text: msg.content }],
            });
          }
        });

        // Start chat with history if we have any
        if (history.length > 0) {
          const chat = model.startChat({ history });
          const result = await chat.sendMessage(message);
          agentResponseText = result.response.text();
        } else {
          // No history, use simple generateContent
          const result = await model.generateContent(message);
          agentResponseText = result.response.text();
        }
      } else if (openaiClient) {
        // Use OpenAI as fallback with full conversation context
        const { generateText } = await import("ai");

        // Build messages array with context
        const messages = [
          {
            role: "system" as const,
            content: systemMessageContent,
          },
          ...conversationHistory,
          {
            role: "user" as const,
            content: message,
          },
        ];

        console.log(
          "[API /sent] Sending to AI with",
          messages.length,
          "messages (including system)"
        );

        const result = await generateText({
          model: openaiClient("gpt-3.5-turbo"),
          messages,
        });
        agentResponseText = result.text;
      } else {
        throw new Error(
          "No AI provider configured. Please set GOOGLE_API_KEY or OPENAI_API_KEY"
        );
      }

      const agentMessage: AgentMessageResponse = {
        user_id: 0,
        name: "Burpla",
        message: agentResponseText,
        id: messageId,
        ...(cardConfig && { cardConfig }), // Only include cardConfig if it exists
      };

      console.log(
        "[API /sent] Returning response with cardConfig:",
        !!agentMessage.cardConfig
      );
      return NextResponse.json(agentMessage);
    } catch (error: any) {
      console.error("[API /sent] AI generation error:", error);
      // Include cardConfig even if AI generation fails
      const errorMessage: AgentMessageResponse = {
        user_id: 0,
        name: "Burpla",
        message: `Error: ${error.message || "Failed to generate response"}`,
        id: messageId,
        ...(cardConfig && { cardConfig }), // Include card if it was created
      };

      return NextResponse.json(errorMessage);
    }
  } catch (error: any) {
    console.error("Error in /api/sent:", error);
    return NextResponse.json(
      {
        user_id: 0,
        name: "Burpla",
        message: `Error: ${error.message || "Server error"}`,
        id: `${Date.now()}-error`,
      },
      { status: 500 }
    );
  }
}
