import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase/server";
import { prisma } from "@/lib/db";
import { stripe, getOrCreateStripeCustomer } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const customerId = await getOrCreateStripeCustomer(user.id, user.email, user.stripeCustomerId);
  if (!user.stripeCustomerId) {
    await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
  }

  // NEXTAUTH_URL is gone - use NEXT_PUBLIC_SITE_URL (see .env.example) instead.
  const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL;

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    success_url: `${origin}/?upgraded=true`,
    cancel_url: `${origin}/?upgraded=false`,
    metadata: { userId: user.id },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
