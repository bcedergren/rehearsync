"use client";

import {
  Box,
  Button,
  Card,
  Heading,
  Text,
  VStack,
  Spinner,
  Flex,
} from "@chakra-ui/react";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Mail } from "lucide-react";
import Image from "next/image";
import NextLink from "next/link";
import { apiFetch } from "@/hooks/useApi";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token provided");
      return;
    }

    async function verify() {
      try {
        await apiFetch("/auth/verify-email", {
          method: "POST",
          body: JSON.stringify({ token }),
        });
        setStatus("success");
        setMessage("Your email has been verified successfully!");
        setTimeout(() => router.push("/login"), 3000);
      } catch (error: unknown) {
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Verification failed");
      }
    }

    verify();
  }, [token, router]);

  return (
    <Box minH="100vh" bg="gray.50" display="flex" alignItems="center" justifyContent="center" p={4}>
      <Box maxW="450px" w="full">
        <Flex justify="center" mb={8}>
          <NextLink href="/">
            <Image src="/logo.png" alt="RehearSync" width={180} height={45} style={{ height: "auto" }} />
          </NextLink>
        </Flex>

        <Card.Root>
          <Card.Body p={8}>
            <VStack gap={6} textAlign="center">
              {status === "verifying" && (
                <>
                  <Spinner size="xl" color="blue.500" />
                  <Heading size="lg">Verifying your email...</Heading>
                  <Text color="gray.600">Please wait while we verify your email address.</Text>
                </>
              )}

              {status === "success" && (
                <>
                  <Box color="green.500">
                    <CheckCircle size={64} />
                  </Box>
                  <Heading size="lg" color="gray.900">Email Verified!</Heading>
                  <Text color="gray.600">{message}</Text>
                  <Text fontSize="sm" color="gray.500">
                    Redirecting you to login...
                  </Text>
                  <Button colorPalette="blue" asChild>
                    <NextLink href="/login">Go to Login</NextLink>
                  </Button>
                </>
              )}

              {status === "error" && (
                <>
                  <Box color="red.500">
                    <XCircle size={64} />
                  </Box>
                  <Heading size="lg" color="gray.900">Verification Failed</Heading>
                  <Text color="gray.600">{message}</Text>
                  <VStack gap={3} w="full">
                    <Button colorPalette="blue" w="full" asChild>
                      <NextLink href="/login">Go to Login</NextLink>
                    </Button>
                    <Button variant="outline" w="full" asChild>
                      <NextLink href="/register">Create New Account</NextLink>
                    </Button>
                  </VStack>
                </>
              )}
            </VStack>
          </Card.Body>
        </Card.Root>

        <Text fontSize="sm" color="gray.500" textAlign="center" mt={6}>
          Need help?{" "}
          <Text as="span" color="blue.500" fontWeight="medium">
            support@rehearsync.com
          </Text>
        </Text>
      </Box>
    </Box>
  );
}
