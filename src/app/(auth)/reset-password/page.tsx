"use client";

import {
  Box,
  Button,
  Field,
  Heading,
  Input,
  VStack,
  Text,
  Link as ChakraLink,
  Flex,
} from "@chakra-ui/react";
import Image from "next/image";
import NextLink from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/v1/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error?.message || "Something went wrong");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Flex minH="100vh">
      {/* Left hero panel — desktop only */}
      <Box
        display={{ base: "none", lg: "block" }}
        w="50%"
        position="relative"
        overflow="hidden"
      >
        <Image
          src="/login.png"
          alt="Band performing live"
          fill
          style={{ objectFit: "cover" }}
          priority
        />
        <Box
          position="absolute"
          inset={0}
          bgGradient="to-t"
          gradientFrom="blackAlpha.900"
          gradientVia="blackAlpha.700"
          gradientTo="blackAlpha.400"
        />
        <Flex
          position="absolute"
          inset={0}
          direction="column"
          align="center"
          justify="center"
          p={{ base: 10, xl: 14 }}
          textAlign="center"
        >
          <Box mb={8}>
            <NextLink href="/"><Image src="/logo_light.png" alt="RehearSync" width={240} height={60} style={{ height: "auto" }} /></NextLink>
          </Box>
          <Box>
            <Heading size={{ base: "xl", xl: "2xl" }} color="white" mb={4} lineHeight="1.2">
              Choose a new
              <br />
              password.
            </Heading>
            <Text color="gray.300" fontSize="md" maxW="380px" mx="auto" lineHeight="1.7">
              Pick something strong and memorable. You'll be back to rehearsing in no time.
            </Text>
          </Box>
        </Flex>
      </Box>

      {/* Right form panel */}
      <Flex
        flex={1}
        bg="gray.900"
        align="center"
        justify="center"
        p={8}
        position="relative"
      >
        <Box
          display={{ base: "block", lg: "none" }}
          position="absolute"
          inset={0}
          overflow="hidden"
        >
          <Image
            src="/login.png"
            alt=""
            fill
            style={{ objectFit: "cover", opacity: 0.08 }}
          />
        </Box>

        <Box w="full" maxW="400px" position="relative" zIndex={1}>
          <Box display={{ base: "block", lg: "none" }} mb={8}>
            <NextLink href="/"><Image src="/logo_light.png" alt="RehearSync" width={200} height={50} style={{ height: "auto" }} /></NextLink>
          </Box>

          {!token ? (
            <Box>
              <Heading size="xl" color="white" mb={3}>
                Invalid link
              </Heading>
              <Text color="gray.400" mb={6}>
                This password reset link is missing or invalid. Please request a new one.
              </Text>
              <Button asChild colorPalette="blue" w="full" size="lg">
                <NextLink href="/forgot-password">Request New Link</NextLink>
              </Button>
            </Box>
          ) : success ? (
            <Box>
              <Heading size="xl" color="white" mb={3}>
                Password updated
              </Heading>
              <Text color="gray.400" mb={6}>
                Your password has been reset successfully. You can now sign in with your new password.
              </Text>
              <Button asChild colorPalette="blue" w="full" size="lg">
                <NextLink href="/login">Sign In</NextLink>
              </Button>
            </Box>
          ) : (
            <Box>
              <Heading size="xl" color="white" mb={1}>
                Set new password
              </Heading>
              <Text color="gray.400" mb={8}>
                Enter your new password below
              </Text>

              <form onSubmit={handleSubmit}>
                <VStack gap={5}>
                  <Field.Root>
                    <Field.Label color="gray.300" fontSize="sm">New Password</Field.Label>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      autoFocus
                      bg="gray.800"
                      border="1px solid"
                      borderColor="gray.700"
                      color="white"
                      _hover={{ borderColor: "gray.600" }}
                      _focus={{ borderColor: "blue.400", boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)" }}
                      size="lg"
                      placeholder="Min 8 characters"
                    />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label color="gray.300" fontSize="sm">Confirm Password</Field.Label>
                    <Input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                      bg="gray.800"
                      border="1px solid"
                      borderColor="gray.700"
                      color="white"
                      _hover={{ borderColor: "gray.600" }}
                      _focus={{ borderColor: "blue.400", boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)" }}
                      size="lg"
                      placeholder="Re-enter your password"
                    />
                  </Field.Root>
                  {error && (
                    <Box w="full" p={3} bg="red.900/30" borderRadius="md" border="1px solid" borderColor="red.700/50">
                      <Text color="red.300" fontSize="sm">{error}</Text>
                    </Box>
                  )}
                  <Button
                    type="submit"
                    colorPalette="blue"
                    w="full"
                    size="lg"
                    loading={loading}
                    mt={2}
                  >
                    Reset Password
                  </Button>
                </VStack>
              </form>
            </Box>
          )}
        </Box>
      </Flex>
    </Flex>
  );
}
