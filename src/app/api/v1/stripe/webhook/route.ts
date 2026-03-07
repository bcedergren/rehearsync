import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe, PRICE_TO_TIER } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "subscription" && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );
        await handleSubscriptionUpdate(subscription);
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.created": {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionUpdate(subscription);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata.userId;
      if (userId) {
        await prisma.user.update({
          where: { id: userId },
          data: {
            tier: "free",
            subscriptionId: null,
            subscriptionEndsAt: new Date(subscription.items.data[0].current_period_end * 1000),
          },
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.userId;
  if (!userId) return;

  const priceId = subscription.items.data[0]?.price.id;
  const tier = PRICE_TO_TIER[priceId] || "free";
  const isActive =
    subscription.status === "active" || subscription.status === "trialing";

  await prisma.user.update({
    where: { id: userId },
    data: {
      tier: isActive ? tier : "free",
      subscriptionId: subscription.id,
      subscribedAt: new Date(subscription.start_date * 1000),
      subscriptionEndsAt: new Date(
        subscription.items.data[0].current_period_end * 1000
      ),
    },
  });
}
