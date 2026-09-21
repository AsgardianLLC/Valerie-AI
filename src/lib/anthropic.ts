import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export type ChatTurn = { role: "user" | "assistant"; content: string };

/**
 * Streams a completion from Claude given the conversation history.
 * Returns a ReadableStream of plain text chunks that the API route can
 * pipe straight through to the client.
 */
export async function streamChatCompletion(opts: {
  history: ChatTurn[];
  systemPrompt?: string;
  temperature?: number;
  imageBase64?: { data: string; mediaType: string }[];
}) {
  const { history, systemPrompt, temperature = 0.7, imageBase64 } = opts;

  // Attach any uploaded images to the final user turn as vision content blocks.
  const messages = history.map((turn, idx) => {
    const isLastUser = idx === history.length - 1 && turn.role === "user";
    if (isLastUser && imageBase64?.length) {
      return {
        role: turn.role,
        content: [
          ...imageBase64.map((img) => ({
            type: "image" as const,
            source: {
              type: "base64" as const,
              media_type: img.mediaType as any,
              data: img.data,
            },
          })),
          { type: "text" as const, text: turn.content },
        ],
      };
    }
    return { role: turn.role, content: turn.content };
  });

  const stream = await anthropic.messages.stream({
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5",
    max_tokens: 4096,
    temperature,
    system:
      systemPrompt ||
      "You are Valerie, a helpful, concise, and friendly multimodal AI assistant. Format code with proper markdown fences and language tags.",
    messages: messages as any,
  });

  return stream;
}

export default anthropic;
