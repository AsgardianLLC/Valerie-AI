import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-10-28.acacia",
});

export async function getOrCreateStripeCustomer(userId: string, email: string, existingCustomerId?: string | null) {
  if (existingCustomerId) return existingCustomerId;

  const customer = await stripe.customers.create({
    email,
    metadata: { userId },
  });
  return customer.id;
}
