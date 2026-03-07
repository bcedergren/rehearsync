import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
  typescript: true,
});

// Map Stripe price IDs to app tiers
export const PRICE_TO_TIER: Record<string, string> = {
  [process.env.STRIPE_PRICE_BAND_MONTHLY!]: "band",
  [process.env.STRIPE_PRICE_BAND_YEARLY!]: "band",
  [process.env.STRIPE_PRICE_AGENT_MONTHLY!]: "agent",
  [process.env.STRIPE_PRICE_AGENT_YEARLY!]: "agent",
};

export const TIER_PRICES = {
  band: {
    monthly: process.env.STRIPE_PRICE_BAND_MONTHLY!,
    yearly: process.env.STRIPE_PRICE_BAND_YEARLY!,
  },
  agent: {
    monthly: process.env.STRIPE_PRICE_AGENT_MONTHLY!,
    yearly: process.env.STRIPE_PRICE_AGENT_YEARLY!,
  },
} as const;
