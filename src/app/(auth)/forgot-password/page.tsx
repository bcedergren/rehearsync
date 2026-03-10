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
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/v1/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error?.message || "Something went wrong");
      }

      setSent(true);
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
            <NextLink href="/"><Image src="/logo_light.png" alt="RehearSync" width={240} height={60} /></NextLink>
          </Box>
          <Box>
            <Heading size={{ base: "xl", xl: "2xl" }} color="white" mb={4} lineHeight="1.2">
              Forgot your password?
              <br />
              No worries.
            </Heading>
            <Text color="gray.300" fontSize="md" maxW="380px" mx="auto" lineHeight="1.7">
              Enter your email and we'll send you a link to reset your password.
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
            <NextLink href="/"><Image src="/logo_light.png" alt="RehearSync" width={200} height={50} /></NextLink>
          </Box>

          {sent ? (
            <Box>
              <Heading size="xl" color="white" mb={3}>
                Check your email
              </Heading>
              <Text color="gray.400" mb={6} lineHeight="1.6">
                If an account exists for <strong style={{ color: "#90CDF4" }}>{email}</strong>,
                we've sent a password reset link. Check your inbox (and spam folder).
              </Text>
              <Button
                variant="outline"
                colorPalette="blue"
                w="full"
                size="lg"
                onClick={() => { setSent(false); setEmail(""); }}
              >
                Send again
              </Button>
              <Text mt={6} fontSize="sm" textAlign="center" color="gray.400">
                <ChakraLink asChild color="blue.300" _hover={{ color: "blue.200" }}>
                  <NextLink href="/login">Back to sign in</NextLink>
                </ChakraLink>
              </Text>
            </Box>
          ) : (
            <Box>
              <Heading size="xl" color="white" mb={1}>
                Reset password
              </Heading>
              <Text color="gray.400" mb={8}>
                Enter your email to receive a reset link
              </Text>

              <form onSubmit={handleSubmit}>
                <VStack gap={5}>
                  <Field.Root>
                    <Field.Label color="gray.300" fontSize="sm">Email</Field.Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                      bg="gray.800"
                      border="1px solid"
                      borderColor="gray.700"
                      color="white"
                      _hover={{ borderColor: "gray.600" }}
                      _focus={{ borderColor: "blue.400", boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)" }}
                      size="lg"
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
                    Send Reset Link
                  </Button>
                </VStack>
              </form>

              <Text mt={6} fontSize="sm" textAlign="center" color="gray.400">
                Remember your password?{" "}
                <ChakraLink asChild color="blue.300" _hover={{ color: "blue.200" }}>
                  <NextLink href="/login">Sign in</NextLink>
                </ChakraLink>
              </Text>
            </Box>
          )}
        </Box>
      </Flex>
    </Flex>
  );
}
