import { prisma } from "@/lib/db";
import { isAdminEmail } from "@/lib/admin";

const FREE_MESSAGE_LIMIT = Number(process.env.FREE_MESSAGE_LIMIT ?? 40);

export type UsageCheck = {
  allowed: boolean;
  isAdmin: boolean;
  plan: "free" | "pro";
  messageCount: number;
  limit: number;
};

/**
 * Central gate for every request that consumes an AI message (chat or image).
 * Admins and active "pro" subscribers always pass. Free users are blocked
 * once messageCount >= FREE_MESSAGE_LIMIT.
 *
 * Call `recordUsage` AFTER a successful AI call to increment the counter -
 * do not increment on failed generations.
 */
export async function checkUsage(userId: string, email?: string | null): Promise<UsageCheck> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error("User not found");
  }

  const admin = user.isAdmin || isAdminEmail(email);
  const isProActive = user.plan === "pro" && user.stripeStatus === "active";

  const allowed = admin || isProActive || user.messageCount < FREE_MESSAGE_LIMIT;

  return {
    allowed,
    isAdmin: admin,
    plan: (user.plan as "free" | "pro") ?? "free",
    messageCount: user.messageCount,
    limit: FREE_MESSAGE_LIMIT,
  };
}

export async function recordUsage(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { messageCount: { increment: 1 } },
  });
}

export { FREE_MESSAGE_LIMIT };
