import { withAuth } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export const POST = withAuth(async (_req, ctx) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: ctx.userId },
  });

  if (!user.stripeCustomerId) {
    return response.error(
      "no_subscription",
      "No active subscription found",
      400
    );
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${process.env.NEXTAUTH_URL}/dashboard`,
  });

  return response.ok({ url: session.url });
});
