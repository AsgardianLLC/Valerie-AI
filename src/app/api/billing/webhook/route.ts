import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import Stripe from "stripe";

export const runtime = "nodejs";

// Stripe requires the raw body to verify the webhook signature, so this
// route reads req.text() rather than req.json().
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = headers().get("stripe-signature");

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      if (userId && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        await prisma.user.update({
          where: { id: userId },
          data: {
            plan: "pro",
            stripeSubId: subscription.id,
            stripeStatus: subscription.status,
            stripeCurrentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
          },
        });
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const user = await prisma.user.findFirst({ where: { stripeCustomerId: subscription.customer as string } });
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            plan: subscription.status === "active" ? "pro" : "free",
            stripeStatus: subscription.status,
            stripeCurrentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
          },
        });
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
