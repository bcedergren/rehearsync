"use client";

import { Box, Flex, Text, NativeSelect, Badge } from "@chakra-ui/react";
import { GripVertical } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
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

  // Drag state
  const [pos, setPos] = useState({ x: 16, y: 16 }); // bottom-right offset
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ mouseX: 0, mouseY: 0, elX: 0, elY: 0 });
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!data?.user?.email) return;
    fetch("/api/v1/me/tier", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier: data.user.tier }),
    }).then((res) => {
      setIsAdmin(res.ok);
    }).catch(() => setIsAdmin(false));
  }, [data?.user?.email, data?.user?.tier]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    const rect = boxRef.current?.getBoundingClientRect();
    if (rect) {
      dragStart.current = {
        mouseX: e.clientX,
        mouseY: e.clientY,
        elX: rect.left,
        elY: rect.top,
      };
    }
  }, []);

  useEffect(() => {
    if (!dragging) return;

    const onMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStart.current.mouseX;
      const dy = e.clientY - dragStart.current.mouseY;
      const newLeft = dragStart.current.elX + dx;
      const newTop = dragStart.current.elY + dy;

      // Convert to bottom-right anchoring
      const rect = boxRef.current?.getBoundingClientRect();
      const w = rect?.width ?? 200;
      const h = rect?.height ?? 80;
      setPos({
        x: Math.max(0, window.innerWidth - newLeft - w),
        y: Math.max(0, window.innerHeight - newTop - h),
      });
    };

    const onMouseUp = () => setDragging(false);

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [dragging]);

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
      ref={boxRef}
      position="fixed"
      bottom={`${pos.y}px`}
      right={`${pos.x}px`}
      bg="white"
      border="1px solid"
      borderColor="gray.200"
      borderRadius="lg"
      shadow="lg"
      p={3}
      zIndex={9999}
      minW="200px"
      userSelect={dragging ? "none" : "auto"}
    >
      <Flex align="center" gap={2} mb={2}>
        <Box
          cursor="grab"
          color="gray.400"
          _hover={{ color: "gray.600" }}
          onMouseDown={onMouseDown}
          flexShrink={0}
        >
          <GripVertical size={14} />
        </Box>
        <Text fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase">
          Plan Tester
        </Text>
        <Badge colorPalette={TIER_COLORS[currentTier] || "gray"} size="sm">
          {currentTier}
        </Badge>
      </Flex>
      <NativeSelect.Root size="sm" disabled={switching}>
        <NativeSelect.Field
          value={currentTier}
          onChange={(e) => handleChange(e.target.value)}
        >
          <option value="free">Free</option>
          <option value="band">Band</option>
          <option value="agent">Agent</option>
        </NativeSelect.Field>
      </NativeSelect.Root>
    </Box>
  );
}
