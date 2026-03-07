"use client";

import { Box, Flex, Text, Button, Dialog, CloseButton } from "@chakra-ui/react";
import { signOut, useSession } from "next-auth/react";
import { useState } from "react";

export function Navbar() {
  const { data: session } = useSession();
  const [showSignOut, setShowSignOut] = useState(false);

  return (
    <Flex
      as="header"
      h="60px"
      px={8}
      align="center"
      justify="space-between"
      borderBottom="1px solid"
      borderColor="gray.100"
      bg="white"
    >
      <Box />
      <Flex align="center" gap={4}>
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
          <Text fontSize="sm" fontWeight="medium" color="gray.700">
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
                  onClick={() => signOut({ callbackUrl: "/login" })}
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
