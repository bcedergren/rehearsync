"use client";

import { Box, VStack, Text, Link as ChakraLink, Flex } from "@chakra-ui/react";
import Image from "next/image";
import NextLink from "next/link";
import { useParams, usePathname } from "next/navigation";

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

export function Sidebar() {
  const params = useParams();
  const pathname = usePathname();
  const bandId = params.bandId as string | undefined;

  const navItems: NavItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: "🏠" },
    ...(bandId
      ? [
          { label: "Songs", href: `/bands/${bandId}`, icon: "🎵" },
          { label: "Members", href: `/bands/${bandId}/members`, icon: "👥" },
        ]
      : []),
  ];

  return (
    <Box
      as="nav"
      w="260px"
      minH="100vh"
      bg="slate.50"
      color="gray.800"
      p={5}
      display="flex"
      flexDirection="column"
      borderRight="1px solid"
      borderColor="gray.200"
    >
      <Box mb={8} px={2}>
        <Image src="/logo.png" alt="RehearsSync" width={200} height={50} />
      </Box>

      <VStack align="stretch" gap={1} flex={1}>
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
          return (
            <ChakraLink
              key={item.href}
              asChild
              px={3}
              py={2.5}
              borderRadius="lg"
              bg={isActive ? "blue.600" : "transparent"}
              color={isActive ? "white" : "gray.600"}
              fontWeight={isActive ? "semibold" : "medium"}
              fontSize="sm"
              _hover={{
                bg: isActive ? "blue.600" : "gray.100",
                color: isActive ? "white" : "gray.900",
                textDecoration: "none",
              }}
              transition="all 0.15s"
            >
              <NextLink href={item.href}>
                <Flex align="center" gap={3}>
                  <Text fontSize="md">{item.icon}</Text>
                  {item.label}
                </Flex>
              </NextLink>
            </ChakraLink>
          );
        })}
      </VStack>

      <Box pt={4} borderTop="1px solid" borderColor="gray.200" mt="auto">
        <Text fontSize="xs" color="gray.400" px={2}>
          v1.0 — Phase 1
        </Text>
      </Box>
    </Box>
  );
}
