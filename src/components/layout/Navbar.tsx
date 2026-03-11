"use client";

import { Box, Flex, Text, Button, Dialog, CloseButton } from "@chakra-ui/react";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";
import { Menu } from "lucide-react";

interface NavbarProps {
  onMenuToggle?: () => void;
}

export function Navbar({ onMenuToggle }: NavbarProps) {
  const { data: session } = useSession();
  const [showSignOut, setShowSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut({ redirectTo: "/login" });
    } catch {
      // NextAuth v5 beta may throw on redirect — fallback
      window.location.href = "/login";
    }
  }

  return (
    <Flex
      as="header"
      h="60px"
      px={{ base: 4, md: 8 }}
      align="center"
      justify="space-between"
      borderBottom="1px solid"
      borderColor="gray.100"
      bg="white"
    >
      {/* Mobile menu button */}
      <Flex align="center" gap={3}>
        <Button
          variant="ghost"
          size="sm"
          display={{ base: "flex", md: "none" }}
          onClick={onMenuToggle}
          p={1}
          minW="auto"
        >
          <Menu size={22} />
        </Button>
        <Box display={{ base: "none", md: "block" }} />
      </Flex>

      <Flex align="center" gap={{ base: 2, md: 4 }}>
        <Flex align="center" gap={2}>
          <Box
            w="32px"
            h="32px"
            borderRadius="full"
            bg="blue.500"
            color="white"
            display="flex"
            alignItems="center"
            justifyContent="center"
            fontSize="sm"
            fontWeight="bold"
          >
            {(session?.user?.name?.[0] || session?.user?.email?.[0] || "?").toUpperCase()}
          </Box>
          <Text
            fontSize="sm"
            fontWeight="medium"
            color="gray.700"
            display={{ base: "none", sm: "block" }}
          >
            {session?.user?.name || session?.user?.email || ""}
          </Text>
        </Flex>
        <Button
          size="sm"
          variant="outline"
          colorPalette="gray"
          onClick={() => setShowSignOut(true)}
        >
          Sign Out
        </Button>
      </Flex>

      <Dialog.Root open={showSignOut} onOpenChange={(e) => setShowSignOut(e.open)}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="400px">
            <Dialog.Header>
              <Dialog.Title>Sign Out</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body>
              <Text color="gray.600">
                Are you sure you want to sign out?
              </Text>
            </Dialog.Body>
            <Dialog.Footer>
              <Flex gap={3} w="full">
                <Button
                  variant="outline"
                  flex={1}
                  onClick={() => setShowSignOut(false)}
                >
                  Cancel
                </Button>
                <Button
                  colorPalette="red"
                  flex={1}
                  loading={signingOut}
                  onClick={handleSignOut}
                >
                  Sign Out
                </Button>
              </Flex>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Flex>
  );
}
