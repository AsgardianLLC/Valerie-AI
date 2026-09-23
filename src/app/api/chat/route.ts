// --- Standard text/code streaming completion -----------------------------
  const priorMessages = await prisma.message.findMany({
    where: { chatSessionId },
    orderBy: { createdAt: "asc" },
    take: 40, // keep recent context window bounded
  });

  const history: ChatTurn[] = priorMessages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  try {
    const claudeStream = await streamChatCompletion({
      history,
      systemPrompt,
      temperature,
      imageBase64,
    });

    const encoder = new TextEncoder();
    let fullText = "";

    const readable = new ReadableStream({
      async start(controller) {
        try {
          // Iterate over the stream chunks correctly using async iteration
          for await (const chunk of claudeStream as any) {
            // Adjust delta extraction depending on your anthropic wrapper (e.g., chunk.text or chunk)
            const delta = typeof chunk === "string" ? chunk : chunk.text || "";
            if (delta) {
              fullText += delta;
              controller.enqueue(encoder.encode(delta));
            }
          }

          // Once stream finishes successfully, persist assistant message
          await prisma.message.create({
            data: { chatSessionId, role: "assistant", content: fullText },
          });
          if (!usage.isAdmin) await recordUsage(userId);
          controller.close();
        } catch (err: any) {
          controller.error(err);
        }
      },
    });

    return new NextResponse(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Chat completion failed" }, { status: 500 });
  }