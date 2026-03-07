"use client";

import {
  Box,
  Button,
  Heading,
  Text,
  VStack,
  Flex,
  Badge,
  Card,
  SimpleGrid,
} from "@chakra-ui/react";
import { useState } from "react";
import { useApiQuery } from "@/hooks/useApi";

interface UserProfile {
  id: string;
  tier: string;
}

const PLANS = [
  {
    tier: "free" as const,
    name: "Free",
    subtitle: "Try it out — no credit card needed",
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      "1 band",
      "Up to 2 members",
      "1 song",
      "PDF chart uploads",
      "Basic part assignments",
    ],
  },
  {
    tier: "band" as const,
    name: "Band",
    subtitle: "For active bands and ensembles",
    monthlyPrice: 29.99,
    yearlyPrice: 299,
    features: [
      "1 band",
      "Up to 15 members",
      "Unlimited songs",
      "MusicXML + PDF charts",
      "Audio stems & backing tracks",
      "Section markers",
      "Arrangement versioning",
      "Priority support",
    ],
  },
  {
    tier: "agent" as const,
    name: "Agent",
    subtitle: "For music directors and large groups",
    monthlyPrice: 99.99,
    yearlyPrice: 999,
    features: [
      "Everything in Band",
      "Unlimited bands",
      "Unlimited members",
      "Live rehearsal sync",
      "Real-time transport controls",
      "Sync map editor",
      "Session history & analytics",
      "Dedicated support",
    ],
  },
];

export default function PricingPage() {
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
  const [loadingTier, setLoadingTier] = useState<string | null>(null);
  const { data: user } = useApiQuery<UserProfile>("/api/v1/me", ["me"]);

  const currentTier = user?.tier || "free";

  async function handleSubscribe(tier: "band" | "agent") {
    setLoadingTier(tier);
    try {
      const res = await fetch("/api/v1/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, interval }),
      });
      const data = await res.json();
      if (data.data?.url) {
        window.location.href = data.data.url;
      }
    } finally {
      setLoadingTier(null);
    }
  }

  async function handleManage() {
    setLoadingTier("manage");
    try {
      const res = await fetch("/api/v1/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.data?.url) {
        window.location.href = data.data.url;
      }
    } finally {
      setLoadingTier(null);
    }
  }

  return (
    <Box maxW="1000px" mx="auto" py={12} px={6}>
      <VStack gap={4} mb={10} textAlign="center">
        <Heading size="2xl" color="white">
          Choose your plan
        </Heading>
        <Text color="gray.400" maxW="500px">
          Start free, upgrade when your band is ready. All plans include a
          14-day free trial.
        </Text>

        {/* Interval toggle */}
        <Flex
          bg="gray.800"
          borderRadius="lg"
          p={1}
          gap={1}
        >
          <Button
            size="sm"
            variant={interval === "monthly" ? "solid" : "ghost"}
            colorPalette={interval === "monthly" ? "blue" : undefined}
            onClick={() => setInterval("monthly")}
          >
            Monthly
          </Button>
          <Button
            size="sm"
            variant={interval === "yearly" ? "solid" : "ghost"}
            colorPalette={interval === "yearly" ? "blue" : undefined}
            onClick={() => setInterval("yearly")}
          >
            Yearly
            <Badge ml={2} colorPalette="green" variant="solid" fontSize="xs">
              Save 17%
            </Badge>
          </Button>
        </Flex>
      </VStack>

      <SimpleGrid columns={{ base: 1, md: 3 }} gap={6}>
        {PLANS.map((plan) => {
          const isCurrent = currentTier === plan.tier;
          const isPopular = plan.tier === "band";
          const price =
            interval === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;

          return (
            <Card.Root
              key={plan.tier}
              bg={isPopular ? "gray.750" : "gray.800"}
              borderColor={isPopular ? "blue.500" : "gray.700"}
              borderWidth="1px"
              position="relative"
              overflow="hidden"
            >
              {isPopular && (
                <Box
                  position="absolute"
                  top={0}
                  left={0}
                  right={0}
                  h="3px"
                  bg="blue.500"
                />
              )}
              <Card.Body p={6}>
                <VStack align="start" gap={4}>
                  <Box>
                    <Flex align="center" gap={2} mb={1}>
                      <Heading size="lg" color="white">
                        {plan.name}
                      </Heading>
                      {isCurrent && (
                        <Badge colorPalette="green" variant="solid" fontSize="xs">
                          Current
                        </Badge>
                      )}
                    </Flex>
                    <Flex align="baseline" gap={1}>
                      <Text fontSize="3xl" fontWeight="bold" color="white">
                        ${price}
                      </Text>
                      {price > 0 && (
                        <Text color="gray.400" fontSize="sm">
                          /{interval === "monthly" ? "mo" : "yr"}
                        </Text>
                      )}
                      {price === 0 && (
                        <Text color="gray.400" fontSize="sm">
                          forever
                        </Text>
                      )}
                    </Flex>
                  </Box>

                  <VStack align="start" gap={2} w="full">
                    {plan.features.map((feature) => (
                      <Flex key={feature} align="center" gap={2}>
                        <Box
                          w="6px"
                          h="6px"
                          borderRadius="full"
                          bg="blue.400"
                          flexShrink={0}
                        />
                        <Text color="gray.300" fontSize="sm">
                          {feature}
                        </Text>
                      </Flex>
                    ))}
                  </VStack>

                  <Box w="full" pt={2}>
                    {plan.tier === "free" ? (
                      isCurrent ? (
                        <Button w="full" variant="outline" disabled>
                          Current Plan
                        </Button>
                      ) : (
                        <Button
                          w="full"
                          variant="outline"
                          onClick={handleManage}
                          loading={loadingTier === "manage"}
                        >
                          Manage Subscription
                        </Button>
                      )
                    ) : isCurrent ? (
                      <Button
                        w="full"
                        variant="outline"
                        onClick={handleManage}
                        loading={loadingTier === "manage"}
                      >
                        Manage Subscription
                      </Button>
                    ) : (
                      <Button
                        w="full"
                        colorPalette="blue"
                        onClick={() => handleSubscribe(plan.tier as "band" | "agent")}
                        loading={loadingTier === plan.tier}
                      >
                        {currentTier === "free" ? "Start Free Trial" : "Upgrade"}
                      </Button>
                    )}
                  </Box>
                </VStack>
              </Card.Body>
            </Card.Root>
          );
        })}
      </SimpleGrid>
    </Box>
  );
}
