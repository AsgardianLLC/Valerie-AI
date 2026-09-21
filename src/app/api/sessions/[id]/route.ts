import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";

async function assertOwnership(userId: string, chatId: string) {
  const chat = await prisma.chatSession.findFirst({ where: { id: chatId, userId } });
  return chat;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const chat = await assertOwnership(user.id, params.id);
  if (!chat) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const messages = await prisma.message.findMany({
    where: { chatSessionId: params.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ chat, messages });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const chat = await assertOwnership(user.id, params.id);
  if (!chat) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { title } = await req.json();
  const updated = await prisma.chatSession.update({
    where: { id: params.id },
    data: { title },
  });

  return NextResponse.json({ chat: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const chat = await assertOwnership(user.id, params.id);
  if (!chat) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.chatSession.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
