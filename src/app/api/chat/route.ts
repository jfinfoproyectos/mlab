import { streamText } from "ai";
import { getActiveAiProvider } from "@/features/ai-assistant/services/ai-provider.service";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const provider = await getActiveAiProvider();

    const result = streamText({
      model: provider,
      messages,
    });

    return result.toTextStreamResponse();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to process request";
    console.error("AI Route Error:", error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
