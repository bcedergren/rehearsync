"use client";

import { Box, VStack, Text, Link as ChakraLink, Flex } from "@chakra-ui/react";
import Image from "next/image";
import NextLink from "next/link";
import { useParams, usePathname } from "next/navigation";
import { Home, Music, Users, CreditCard } from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

export function Sidebar() {
  const params = useParams();
  const pathname = usePathname();
  const bandId = params.bandId as string | undefined;

  const navItems: NavItem[] = [
    { label: "Dashboard", href: "/dashboard", icon: <Home size={18} /> },
    ...(bandId
      ? [
          {
            label: "Songs",
            href: `/bands/${bandId}`,
            icon: <Music size={18} />,
          },
          {
            label: "Members",
            href: `/bands/${bandId}/members`,
            icon: <Users size={18} />,
          },
        ]
      : []),
    { label: "Pricing", href: "/pricing", icon: <CreditCard size={18} /> },
  ];

  return (
    <Box
      as="nav"
      w="240px"
      minH="100vh"
      bg="white"
      p={4}
      display="flex"
      flexDirection="column"
      borderRight="1px solid"
      borderColor="gray.100"
    >
      <Box mb={8} px={2} pt={2}>
        <Image src="/logo.png" alt="RehearSync" width={160} height={40} />
      </Box>

      <VStack align="stretch" gap={0.5} flex={1}>
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" &&
              item.href !== "/pricing" &&
              pathname.startsWith(item.href + "/"));
          return (
            <ChakraLink
              key={item.href}
              asChild
              px={3}
              py={2}
              borderRadius="md"
              bg={isActive ? "gray.100" : "transparent"}
              color={isActive ? "gray.900" : "gray.500"}
              fontWeight={isActive ? "semibold" : "normal"}
              fontSize="sm"
              _hover={{
                bg: isActive ? "gray.100" : "gray.50",
                color: "gray.900",
                textDecoration: "none",
              }}
              transition="all 0.15s"
            >
              <NextLink href={item.href}>
                <Flex align="center" gap={2.5}>
                  <Box color={isActive ? "gray.700" : "gray.400"}>
                    {item.icon}
                  </Box>
                  {item.label}
                </Flex>
              </NextLink>
            </ChakraLink>
          );
        })}
      </VStack>

      <Box pt={4} borderTop="1px solid" borderColor="gray.100" mt="auto">
        <Text fontSize="xs" color="gray.300" px={2}>
          RehearSync v1.0
        </Text>
      </Box>
    </Box>
  );
}
