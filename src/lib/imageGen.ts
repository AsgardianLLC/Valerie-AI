import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type GeneratedImage = { url: string; revisedPrompt?: string };

/**
 * Generates a high-resolution image from a text prompt.
 * Throws with a friendly message on API failure so the route can
 * surface it to the chat stream instead of a raw 500.
 */
export async function generateImage(prompt: string): Promise<GeneratedImage> {
  try {
    const result = await openai.images.generate({
      model: process.env.OPENAI_IMAGE_MODEL || "dall-e-3",
      prompt,
      n: 1,
      size: "1024x1024",
      quality: "hd",
    });

    const image = result.data?.[0];
    if (!image?.url) {
      throw new Error("No image returned from provider.");
    }

    return { url: image.url, revisedPrompt: image.revised_prompt };
  } catch (err: any) {
    const message =
      err?.error?.message || err?.message || "Image generation failed. Please try a different prompt.";
    throw new Error(message);
  }
}

/** Simple heuristic + explicit command support for routing a message to image gen. */
export function extractImagePrompt(message: string): string | null {
  const trimmed = message.trim();
  const commandMatch = trimmed.match(/^\/(image|imagine|draw)\s+(.+)/i);
  if (commandMatch) return commandMatch[2].trim();
  return null;
}