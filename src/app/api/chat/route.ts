import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { checkUsage, recordUsage } from "@/lib/rateLimit";
import { streamChatCompletion, type ChatTurn } from "@/lib/anthropic";
import { generateImage, extractImagePrompt } from "@/lib/imageGen";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const {
      chatSessionId,
      message,
      systemPrompt,
      temperature,
      imageBase64,
    }: {
      chatSessionId: string;
      message: string;
      systemPrompt?: string;
      temperature?: number;
      imageBase64?: { data: string; mediaType: string }[];
    } = body || {};

    if (!chatSessionId || !message?.trim()) {
      return NextResponse.json({ error: "Missing chatSessionId or message" }, { status: 400 });
    }

    // --- Access control: admin bypass + free-tier paywall -------------------
    const usage = await checkUsage(userId, user.email);
    if (!usage.allowed) {
      return NextResponse.json(
        {
          error: "PAYMENT_REQUIRED",
          message: `You've reached the free limit of ${usage.limit} messages. Upgrade to keep chatting.`,
          usage,
        },
        { status: 402 }
      );
    }

    // Verify the chat session belongs to this user.
    const chatSession = await prisma.chatSession.findFirst({
      where: { id: chatSessionId, userId },
    });
    if (!chatSession) {
      return NextResponse.json({ error: "Chat session not found" }, { status: 404 });
    }

    // Persist the user's message immediately.
    await prisma.message.create({
      data: { chatSessionId, role: "user", content: message },
    });

    // --- Inline image-generation command: /image <prompt> --------------------
    const imagePrompt = extractImagePrompt(message);
    if (imagePrompt) {
      try {
        const { url, revisedPrompt } = await generateImage(imagePrompt);
        await prisma.message.create({
          data: {
            chatSessionId,
            role: "assistant",
            content: revisedPrompt ? `Generated image for: "${revisedPrompt}"` : "Here's your generated image:",
            imageUrl: url,
          },
        });
        if (!usage.isAdmin) await recordUsage(userId);

        return NextResponse.json({ type: "image", url, revisedPrompt });
      } catch (err: any) {
        console.error("IMAGE_GEN_ERROR:", err);
        return NextResponse.json({ error: err.message || "Image generation failed" }, { status: 500 });
      }
    }

    // --- Standard text/code streaming completion -----------------------------
    const priorMessages = await prisma.message.findMany({
      where: { chatSessionId },
      orderBy: { createdAt: "asc" },
      take: 40,
    });

    const history: ChatTurn[] = priorMessages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    const claudeStream = await streamChatCompletion({
      history,
      systemPrompt,
      temperature,
      imageBase64,
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        let fullText = "";
        try {
          for await (const chunk of claudeStream as any) {
            const delta = typeof chunk === "string" ? chunk : chunk?.text || chunk?.delta || "";
            if (delta) {
              fullText += delta;
              controller.enqueue(encoder.encode(delta));
            }
          }

          // Persist assistant response after stream completes successfully
          await prisma.message.create({
            data: { chatSessionId, role: "assistant", content: fullText },
          });
          if (!usage.isAdmin) {
            await recordUsage(userId);
          }
          controller.close();
        } catch (err: any) {
          console.error("STREAM_EXECUTION_ERROR:", err);
          try {
            controller.error(err);
          } catch (e) {
            // controller might already be closed
          }
        }
      },
    });

    return new NextResponse(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err: any) {
    console.error("CHAT_ROUTE_FATAL_ERROR:", err);
    return NextResponse.json({ error: err.message || "Chat completion failed" }, { status: 500 });
  }
}