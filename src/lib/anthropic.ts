import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
const ai = new GoogleGenAI({ apiKey });

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
  const contents: any[] = [];

  for (const turn of history) {
    contents.push({
      role: turn.role === "assistant" ? "model" : "user",
      parts: [{ text: turn.content }],
    });
  }

  // Attach images to the latest prompt turn if present
  if (imageBase64 && imageBase64.length > 0 && contents.length > 0) {
    const lastContent = contents[contents.length - 1];
    for (const img of imageBase64) {
      lastContent.parts.push({
        inlineData: {
          data: img.data,
          mimeType: img.mediaType,
        },
      });
    }
  }

  const responseStream = await ai.models.generateContentStream({
    model: "gemini-3.6-flash",
    contents,
    config: {
      systemInstruction: systemPrompt,
      temperature,
    },
  });

  return (async function* () {
    for await (const chunk of responseStream) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  })();
}