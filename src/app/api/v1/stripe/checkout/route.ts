import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import { stripe, TIER_PRICES } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export const POST = withAuth(async (req: NextRequest, ctx) => {
  const body = await req.json();
  const { tier, interval } = body as {
    tier: "band" | "agent";
    interval: "monthly" | "yearly";
  };

  if (!tier || !interval || !TIER_PRICES[tier]?.[interval]) {
    return response.error("validation_error", "Invalid tier or interval", 400);
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: ctx.userId },
  });

  // Get or create Stripe customer
  let stripeCustomerId = user.stripeCustomerId;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email!,
      name: user.name || undefined,
      metadata: { userId: user.id },
    });
    stripeCustomerId = customer.id;
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId },
    });
  }

  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: "subscription",
    line_items: [
      {
        price: TIER_PRICES[tier][interval],
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXTAUTH_URL}/dashboard?upgraded=true`,
    cancel_url: `${process.env.NEXTAUTH_URL}/pricing`,
    subscription_data: {
      metadata: { userId: user.id, tier },
    },
  });

  return response.ok({ url: session.url });
});
