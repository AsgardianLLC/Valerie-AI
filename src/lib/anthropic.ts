import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY,
});

export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
};

export async function streamChatCompletion({
  history,
  systemPrompt,
  temperature = 0.7,
  imageBase64,
}: {
  history: ChatTurn[];
  systemPrompt?: string;
  temperature?: number;
  imageBase64?: { data: string; mediaType: string }[];
}) {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }

  for (const turn of history) {
    messages.push({
      role: turn.role,
      content: turn.content,
    });
  }

  // Handle multimodal image input if passed
  if (imageBase64 && imageBase64.length > 0 && messages.length > 0) {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === "user") {
      const contentParts: any[] = [{ type: "text", text: lastMessage.content || "" }];
      for (const img of imageBase64) {
        contentParts.push({
          type: "image_url",
          image_url: {
            url: `data:${img.mediaType};base64,${img.data}`,
          },
        });
      }
      lastMessage.content = contentParts;
    }
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    temperature,
    stream: true,
  });

  // Return an async iterable that yields string chunks directly
  return (async function* () {
    for await (const chunk of response) {
      const delta = chunk.choices[0]?.delta?.content || "";
      if (delta) {
        yield delta;
      }
    }
  })();
}