import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { checkUsage, recordUsage } from "@/lib/rateLimit";
import { generateImage } from "@/lib/imageGen";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = user.id;
  const { chatSessionId, prompt } = await req.json();

  if (!chatSessionId || !prompt?.trim()) {
    return NextResponse.json({ error: "Missing chatSessionId or prompt" }, { status: 400 });
  }

  const usage = await checkUsage(userId, user.email);
  if (!usage.allowed) {
    return NextResponse.json(
      {
        error: "PAYMENT_REQUIRED",
        message: `You've reached the free limit of ${usage.limit} messages. Upgrade to keep generating images.`,
        usage,
      },
      { status: 402 }
    );
  }

  const chatSession = await prisma.chatSession.findFirst({ where: { id: chatSessionId, userId } });
  if (!chatSession) {
    return NextResponse.json({ error: "Chat session not found" }, { status: 404 });
  }

  await prisma.message.create({
    data: { chatSessionId, role: "user", content: `/image ${prompt}` },
  });

  try {
    const { url, revisedPrompt } = await generateImage(prompt);

    await prisma.message.create({
      data: {
        chatSessionId,
        role: "assistant",
        content: revisedPrompt ? `Generated image for: "${revisedPrompt}"` : "Here's your generated image:",
        imageUrl: url,
      },
    });

    if (!usage.isAdmin) await recordUsage(userId);

    return NextResponse.json({ url, revisedPrompt });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Image generation failed" }, { status: 500 });
  }
}
