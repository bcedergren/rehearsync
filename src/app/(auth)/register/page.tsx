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

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/onboarding";
  const plan = searchParams.get("plan") || "free"; // free | band | agent
  const interval = searchParams.get("interval") || "monthly"; // monthly | yearly
  const isPaidPlan = plan === "band" || plan === "agent";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const json = await res.json();

    if (!res.ok) {
      setError(json.error?.message || "Registration failed");
      setLoading(false);
      return;
    }

    // Auto sign-in with the credentials they just created
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      // Registration succeeded but auto-login failed — fall back to login page
      router.push("/login");
      return;
    }

    // For paid plans, redirect to Stripe checkout; for free, go to onboarding
    if (isPaidPlan) {
      try {
        const checkoutRes = await fetch("/api/v1/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tier: plan, interval }),
        });
        const checkoutJson = await checkoutRes.json();
        if (checkoutRes.ok && checkoutJson.data?.url) {
          window.location.href = checkoutJson.data.url;
          return;
        }
      } catch {
        // If checkout fails, fall through to onboarding
      }
    }
    router.push(callbackUrl);
  }

  const PERKS_BY_PLAN: Record<string, { label: string; detail: string }[]> = {
    free: [
      { label: "1 band, 2 members", detail: "Enough to try it with your duo" },
      { label: "PDF sheet music", detail: "Upload and share charts instantly" },
      { label: "Part assignments", detail: "Everyone sees their own part" },
    ],
    band: [
      { label: "Up to 15 members", detail: "Enough for any band or ensemble" },
      { label: "AI stem separation", detail: "Auto-split your full mix into 6 stems" },
      { label: "AI sheet music generation", detail: "Auto-transcribe stems to MusicXML" },
      { label: "Unlimited songs", detail: "No limits on your setlist" },
    ],
    agent: [
      { label: "Unlimited bands & members", detail: "Manage as many groups as you need" },
      { label: "Live rehearsal sync", detail: "Real-time transport for the whole band" },
      { label: "Everything in Band", detail: "AI stems, charts, sections & more" },
      { label: "Dedicated support", detail: "Priority help when you need it" },
    ],
  };
  const PERKS = PERKS_BY_PLAN[plan] || PERKS_BY_PLAN.free;

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
          src="/signup.png"
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
              Stop emailing PDFs.
              <br />
              Start rehearsing.
            </Heading>
            <Text color="gray.300" fontSize="md" maxW="380px" mx="auto" lineHeight="1.7" mb={8}>
              {isPaidPlan
                ? `The ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan unlocks the full power of RehearSync. You'll set up billing after creating your account.`
                : "The free plan includes everything you need to see if RehearSync fits your workflow. No credit card, no trial timer."}
            </Text>

            {/* What you get with free */}
            <VStack align="center" gap={4}>
              {PERKS.map((perk) => (
                <Flex key={perk.label} align="start" gap={3}>
                  <Box
                    w="8px"
                    h="8px"
                    borderRadius="full"
                    bg="blue.400"
                    mt="7px"
                    flexShrink={0}
                  />
                  <Box>
                    <Text color="white" fontSize="sm" fontWeight="semibold">
                      {perk.label}
                    </Text>
                    <Text color="gray.400" fontSize="xs">
                      {perk.detail}
                    </Text>
                  </Box>
                </Flex>
              ))}
            </VStack>
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
            src="/signup.png"
            alt=""
            fill
            style={{ objectFit: "cover", opacity: 0.08 }}
          />
        </Box>

        <Box w="full" maxW="440px" position="relative" zIndex={1}>
          {/* Mobile logo */}
          <Box display={{ base: "block", lg: "none" }} mb={8}>
            <NextLink href="/"><Image src="/logo_light.png" alt="RehearSync" width={200} height={50} style={{ height: "auto" }} /></NextLink>
          </Box>

          <Heading size="xl" color="white" mb={1}>
            Create your account
          </Heading>
          <Text color="gray.400" mb={8}>
            {isPaidPlan
              ? `Sign up to start your ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan (${interval === "yearly" ? "annual" : "monthly"} billing)`
              : "Free forever — upgrade when your band outgrows it"}
          </Text>

          <form onSubmit={handleSubmit}>
            <VStack gap={5}>
              <Field.Root>
                <Field.Label color="gray.300" fontSize="sm">Name</Field.Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  bg="gray.800"
                  border="1px solid"
                  borderColor="gray.700"
                  color="white"
                  _hover={{ borderColor: "gray.600" }}
                  _focus={{ borderColor: "blue.400", boxShadow: "0 0 0 1px var(--chakra-colors-blue-400)" }}
                  size="lg"
                  placeholder="Your display name"
                />
              </Field.Root>
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
                  minLength={8}
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
                {isPaidPlan ? "Create Account & Continue to Billing" : "Create Account"}
              </Button>
            </VStack>
          </form>

          <Text mt={6} fontSize="sm" textAlign="center" color="gray.400">
            Already have an account?{" "}
            <ChakraLink asChild color="blue.300" _hover={{ color: "blue.200" }}>
              <NextLink href={isPaidPlan ? `/login?callbackUrl=${encodeURIComponent(`/pricing?plan=${plan}&interval=${interval}`)}` : callbackUrl !== "/dashboard" ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/login"}>Sign in</NextLink>
            </ChakraLink>
          </Text>
        </Box>
      </Flex>
    </Flex>
  );
}
