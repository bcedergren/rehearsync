"use client";

import { Box, Flex, Text, NativeSelect, Badge } from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { useApiQuery } from "@/hooks/useApi";

interface MeData {
  user: { id: string; email: string; tier: string };
  subscription: { tier: string };
}

const TIER_COLORS: Record<string, string> = {
  free: "gray",
  band: "blue",
  agent: "purple",
};

export function PlanSwitcher() {
  const { data, refetch } = useApiQuery<MeData>(["me"], "/me");
  const [switching, setSwitching] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!data?.user?.email) return;
    // Try switching to current tier to check if admin (will get 403 if not)
    fetch("/api/v1/me/tier", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier: data.user.tier }),
    }).then((res) => {
      setIsAdmin(res.ok);
    }).catch(() => setIsAdmin(false));
  }, [data?.user?.email, data?.user?.tier]);

  if (!data || !isAdmin) return null;

  const currentTier = data.user.tier;

  async function handleChange(newTier: string) {
    setSwitching(true);
    try {
      await fetch("/api/v1/me/tier", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: newTier }),
      });
      await refetch();
    } finally {
      setSwitching(false);
    }
  }

  return (
    <Box
      position="fixed"
      bottom={4}
      right={4}
      bg="white"
      border="1px solid"
      borderColor="gray.200"
      borderRadius="lg"
      shadow="lg"
      p={3}
      zIndex={9999}
      minW="200px"
    >
      <Flex align="center" gap={2} mb={2}>
        <Text fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase">
          Plan Tester
        </Text>
        <Badge colorPalette={TIER_COLORS[currentTier] || "gray"} size="sm">
          {currentTier}
        </Badge>
      </Flex>
      <NativeSelect.Root size="sm">
        <NativeSelect.Field
          value={currentTier}
          onChange={(e) => handleChange(e.target.value)}
          disabled={switching}
        >
          <option value="free">Free</option>
          <option value="band">Band</option>
          <option value="agent">Agent</option>
        </NativeSelect.Field>
      </NativeSelect.Root>
    </Box>
  );
}
