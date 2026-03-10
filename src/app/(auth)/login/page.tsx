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
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else {
      router.push(callbackUrl);
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
        {/* Dark gradient overlay */}
        <Box
          position="absolute"
          inset={0}
          bgGradient="to-t"
          gradientFrom="blackAlpha.900"
          gradientVia="blackAlpha.700"
          gradientTo="blackAlpha.400"
        />
        {/* Content over image */}
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
              Your rehearsals,
              <br />
              finally organized.
            </Heading>
            <Text color="gray.300" fontSize="md" maxW="380px" mx="auto" lineHeight="1.7" mb={8}>
              Upload charts, assign parts, sync playback — stop wasting
              the first 20 minutes of every practice sorting out who has what.
            </Text>

            {/* Social proof pills */}
            <Flex gap={3} flexWrap="wrap" justify="center">
              <Box bg="whiteAlpha.100" backdropFilter="blur(8px)" borderRadius="full" px={4} py={2}>
                <Text fontSize="xs" color="gray.300" fontWeight="medium">
                  PDF & MusicXML support
                </Text>
              </Box>
              <Box bg="whiteAlpha.100" backdropFilter="blur(8px)" borderRadius="full" px={4} py={2}>
                <Text fontSize="xs" color="gray.300" fontWeight="medium">
                  Real-time session sync
                </Text>
              </Box>
              <Box bg="whiteAlpha.100" backdropFilter="blur(8px)" borderRadius="full" px={4} py={2}>
                <Text fontSize="xs" color="gray.300" fontWeight="medium">
                  Free to start
                </Text>
              </Box>
            </Flex>
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
        {/* Mobile background — subtle hero image */}
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
          {/* Mobile logo */}
          <Box display={{ base: "block", lg: "none" }} mb={8}>
            <NextLink href="/"><Image src="/logo_light.png" alt="RehearSync" width={200} height={50} style={{ height: "auto" }} /></NextLink>
          </Box>

          <Heading size="xl" color="white" mb={1}>
            Welcome back
          </Heading>
          <Text color="gray.400" mb={8}>
            Sign in to pick up where you left off
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
                  bg="gray.800"
                  border="1px solid"
                  borderColor="gray.700"
                  color="white"
                  _hover={{ borderColor: "gray.600" }}
                  _focus={{ borderColor: "blue.400", boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)" }}
                  size="lg"
                />
              </Field.Root>
              <Field.Root>
                <Field.Label color="gray.300" fontSize="sm">Password</Field.Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
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
                Sign In
              </Button>
            </VStack>
          </form>

          <Flex justify="center" mt={4}>
            <ChakraLink asChild color="gray.400" fontSize="sm" _hover={{ color: "blue.300" }}>
              <NextLink href="/forgot-password">Forgot your password?</NextLink>
            </ChakraLink>
          </Flex>

          <Text mt={6} fontSize="sm" textAlign="center" color="gray.400">
            No account?{" "}
            <ChakraLink asChild color="blue.300" _hover={{ color: "blue.200" }}>
              <NextLink href={callbackUrl !== "/dashboard" ? `/register?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/register"}>Create one free</NextLink>
            </ChakraLink>
          </Text>
        </Box>
      </Flex>
    </Flex>
  );
}
