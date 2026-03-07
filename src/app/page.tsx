"use client";

import {
  Box,
  Button,
  Flex,
  Heading,
  Text,
  SimpleGrid,
  Card,
  VStack,
  Badge,
} from "@chakra-ui/react";
import Image from "next/image";
import NextLink from "next/link";
import { useState } from "react";

const PLANS = [
  {
    name: "Free",
    monthlyPrice: "$0",
    yearlyPrice: "$0",
    period: "forever",
    yearlyPeriod: "forever",
    description: "Try it out — no credit card needed",
    features: [
      "1 band",
      "Up to 2 members",
      "1 song",
      "PDF chart uploads",
      "Basic part assignments",
    ],
    cta: "Get Started",
    highlight: false,
  },
  {
    name: "Band",
    monthlyPrice: "$29.99",
    yearlyPrice: "$299",
    period: "/month",
    yearlyPeriod: "/year",
    description: "For active bands and ensembles",
    features: [
      "1 band",
      "Up to 15 members",
      "Unlimited songs",
      "MusicXML + PDF charts",
      "Audio stems & backing tracks",
      "Section markers",
      "Arrangement versioning",
      "Priority support",
    ],
    cta: "Start Free Trial",
    highlight: true,
  },
  {
    name: "Agent",
    monthlyPrice: "$99.99",
    yearlyPrice: "$999",
    period: "/month",
    yearlyPeriod: "/year",
    description: "For music directors and large groups",
    features: [
      "Everything in Band",
      "Unlimited bands",
      "Unlimited members",
      "Live rehearsal sync",
      "Real-time transport controls",
      "Sync map editor",
      "Session history & analytics",
      "Dedicated support",
    ],
    cta: "Start Free Trial",
    highlight: false,
  },
];

export default function HomePage() {
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
  return (
    <Box bg="white" color="gray.800" minH="100vh">
      {/* Navbar */}
      <Flex
        as="header"
        px={{ base: 6, md: 12 }}
        py={4}
        align="center"
        justify="space-between"
        maxW="1200px"
        mx="auto"
        borderBottom="1px solid"
        borderColor="gray.100"
      >
        <Box>
          <Image src="/logo.png" alt="RehearsSync" width={180} height={45} />
        </Box>
        <Flex gap={3} align="center">
          <Button variant="ghost" color="gray.600" _hover={{ color: "gray.900" }} asChild>
            <NextLink href="/login">Sign In</NextLink>
          </Button>
          <Button colorPalette="blue" asChild>
            <NextLink href="/register">Get Started</NextLink>
          </Button>
        </Flex>
      </Flex>

      {/* Hero — full-width image with text overlay */}
      <Box as="section" position="relative" w="full" minH={{ base: "400px", md: "520px", lg: "600px" }}>
        <Image
          src="/hero.png"
          alt="Band rehearsing with tablets showing sheet music"
          fill
          style={{ objectFit: "cover", objectPosition: "center" }}
          priority
        />
        <Box
          position="absolute"
          inset={0}
          bg="blackAlpha.600"
        />
        <Flex
          position="relative"
          direction="column"
          justify="center"
          h="full"
          minH={{ base: "400px", md: "520px", lg: "600px" }}
          maxW="800px"
          mx="auto"
          px={{ base: 6, md: 12 }}
          py={{ base: 12, md: 20 }}
          textAlign="center"
          align="center"
        >
          <Heading
            size={{ base: "2xl", md: "4xl" }}
            fontWeight="bold"
            lineHeight="1.15"
            mb={5}
            color="white"
          >
            Stop fumbling with charts.
            <br />
            Start rehearsing.
          </Heading>
          <Text
            fontSize={{ base: "md", md: "lg" }}
            color="whiteAlpha.900"
            mb={8}
            lineHeight="1.7"
            maxW="600px"
          >
            RehearsSync keeps your sheet music, audio tracks, and part
            assignments in one place. When rehearsal starts, every screen
            stays in sync — so your band can focus on playing, not page turns.
          </Text>
          <Flex gap={4} flexWrap="wrap" justify="center">
            <Button size="lg" colorPalette="blue" px={8} asChild>
              <NextLink href="/register">Try It Free</NextLink>
            </Button>
            <Button
              size="lg"
              variant="outline"
              borderColor="whiteAlpha.600"
              color="white"
              _hover={{ bg: "whiteAlpha.200" }}
              asChild
            >
              <NextLink href="#how-it-works">See How It Works</NextLink>
            </Button>
          </Flex>
        </Flex>
      </Box>

      {/* The Problem — conversational, left-aligned with accent border */}
      <Box as="section" py={{ base: 14, md: 20 }} px={6}>
        <Box maxW="720px" mx="auto">
          <Text
            fontSize="xs"
            fontWeight="bold"
            textTransform="uppercase"
            letterSpacing="wider"
            color="blue.500"
            mb={4}
          >
            Sound familiar?
          </Text>
          <Text
            fontSize={{ base: "lg", md: "xl" }}
            color="gray.800"
            lineHeight="1.9"
            borderLeft="3px solid"
            borderColor="blue.400"
            pl={5}
            mb={8}
            fontStyle="italic"
          >
            &ldquo;Who has the updated chart?&rdquo; &bull;
            &ldquo;The click track is on my other phone.&rdquo; &bull;
            &ldquo;Wait, are we doing the new bridge or the old one?&rdquo;
          </Text>
          <Text fontSize={{ base: "md", md: "lg" }} color="gray.600" lineHeight="1.8">
            Every band deals with this. Scattered files, outdated versions,
            and that five-minute scramble at the start of every rehearsal.
            RehearsSync puts your charts, audio, and assignments in one place
            so you can skip the confusion and just play.
          </Text>
        </Box>
      </Box>

      {/* How It Works — numbered steps with connecting line */}
      <Box
        as="section"
        id="how-it-works"
        py={{ base: 14, md: 20 }}
        px={6}
        bg="gray.900"
        color="white"
      >
        <Box maxW="900px" mx="auto">
          <Text
            fontSize="xs"
            fontWeight="bold"
            textTransform="uppercase"
            letterSpacing="wider"
            color="blue.300"
            mb={3}
            textAlign="center"
          >
            Three steps
          </Text>
          <Heading
            size={{ base: "xl", md: "2xl" }}
            mb={14}
            textAlign="center"
            color="white"
          >
            From setup to downbeat
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 3 }} gap={10}>
            {[
              {
                step: "01",
                title: "Build your roster",
                desc: "Create a band, invite members by email, and set up instrument parts. Takes about a minute.",
              },
              {
                step: "02",
                title: "Load in your music",
                desc: "Upload PDF or MusicXML charts, drop in backing tracks and stems, tag sections like Verse and Chorus.",
              },
              {
                step: "03",
                title: "Hit play together",
                desc: "Start a live session. The leader controls transport — play, pause, jump to the bridge — and every screen follows.",
              },
            ].map((item) => (
              <VStack key={item.step} gap={4} align="start">
                <Text
                  fontSize="3xl"
                  fontWeight="bold"
                  color="blue.400"
                  lineHeight={1}
                >
                  {item.step}
                </Text>
                <Heading size="md" color="white">
                  {item.title}
                </Heading>
                <Text fontSize="sm" color="gray.400" lineHeight="1.8">
                  {item.desc}
                </Text>
              </VStack>
            ))}
          </SimpleGrid>
        </Box>
      </Box>

      {/* Features */}
      <Box
        as="section"
        id="features"
        py={{ base: 14, md: 24 }}
        px={6}
      >
        <Box maxW="1100px" mx="auto">
          <Text
            fontSize="xs"
            fontWeight="bold"
            textTransform="uppercase"
            letterSpacing="wider"
            color="blue.500"
            mb={3}
            textAlign="center"
          >
            What you get
          </Text>
          <Heading
            size={{ base: "xl", md: "2xl" }}
            mb={4}
            color="gray.900"
            textAlign="center"
          >
            Six things that actually matter in rehearsal
          </Heading>
          <Text color="gray.500" fontSize="lg" maxW="520px" mx="auto" textAlign="center" mb={16}>
            We didn&apos;t build a kitchen sink. Every feature solves a real problem
            we&apos;ve hit in our own rehearsals.
          </Text>

          {/* Top row — 2 wide cards */}
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={6} mb={6}>
            <Card.Root
              bg="gray.900"
              color="white"
              overflow="hidden"
            >
              <Card.Body p={{ base: 6, md: 8 }}>
                <Text fontSize="sm" fontWeight="bold" color="blue.300" mb={2} textTransform="uppercase" letterSpacing="wide">
                  The foundation
                </Text>
                <Heading size="lg" mb={3}>Sheet Music</Heading>
                <Text color="gray.400" lineHeight="1.8">
                  Upload PDF and MusicXML charts per instrument part. Keep multiple
                  versions — draft it, activate it, retire the old one. One source of
                  truth on every music stand, every time.
                </Text>
              </Card.Body>
            </Card.Root>

            <Card.Root
              bg="blue.600"
              color="white"
              overflow="hidden"
            >
              <Card.Body p={{ base: 6, md: 8 }}>
                <Text fontSize="sm" fontWeight="bold" color="blue.200" mb={2} textTransform="uppercase" letterSpacing="wide">
                  The sound
                </Text>
                <Heading size="lg" mb={3}>Audio & Stems</Heading>
                <Text color="blue.100" lineHeight="1.8">
                  Full mixes, click tracks, individual stems — upload them all.
                  Assign tracks to arrangements so every member pulls up exactly
                  what they need to hear. No more &ldquo;who has the click?&rdquo;
                </Text>
              </Card.Body>
            </Card.Root>
          </SimpleGrid>

          {/* Middle row — 3 cards */}
          <SimpleGrid columns={{ base: 1, md: 3 }} gap={6} mb={6}>
            <Card.Root borderWidth="1px" borderColor="gray.200" bg="white">
              <Card.Body p={{ base: 6, md: 7 }}>
                <Flex
                  w="40px"
                  h="40px"
                  borderRadius="lg"
                  bg="orange.50"
                  align="center"
                  justify="center"
                  mb={4}
                >
                  <Box w="10px" h="10px" borderRadius="sm" bg="orange.400" />
                </Flex>
                <Heading size="sm" mb={2} color="gray.900">Part Assignments</Heading>
                <Text fontSize="sm" color="gray.500" lineHeight="1.7">
                  Map each instrument to a band member. When they open a song,
                  they see their chart — not the whole stack.
                </Text>
              </Card.Body>
            </Card.Root>

            <Card.Root borderWidth="1px" borderColor="gray.200" bg="white">
              <Card.Body p={{ base: 6, md: 7 }}>
                <Flex
                  w="40px"
                  h="40px"
                  borderRadius="lg"
                  bg="green.50"
                  align="center"
                  justify="center"
                  mb={4}
                >
                  <Box w="10px" h="10px" borderRadius="sm" bg="green.400" />
                </Flex>
                <Heading size="sm" mb={2} color="gray.900">Arrangement Versioning</Heading>
                <Text fontSize="sm" color="gray.500" lineHeight="1.7">
                  Trying a new outro? Draft it without touching the published
                  version. Archive the old one when you&apos;re sure.
                </Text>
              </Card.Body>
            </Card.Root>

            <Card.Root borderWidth="1px" borderColor="gray.200" bg="white">
              <Card.Body p={{ base: 6, md: 7 }}>
                <Flex
                  w="40px"
                  h="40px"
                  borderRadius="lg"
                  bg="purple.50"
                  align="center"
                  justify="center"
                  mb={4}
                >
                  <Box w="10px" h="10px" borderRadius="sm" bg="purple.400" />
                </Flex>
                <Heading size="sm" mb={2} color="gray.900">Section Markers</Heading>
                <Text fontSize="sm" color="gray.500" lineHeight="1.7">
                  Tag Intro, Verse, Chorus, Bridge — then jump to any
                  section mid-rehearsal with one tap.
                </Text>
              </Card.Body>
            </Card.Root>
          </SimpleGrid>

          {/* Bottom — full-width accent card */}
          <Card.Root
            bg="gray.50"
            borderWidth="1px"
            borderColor="gray.200"
            overflow="hidden"
          >
            <Card.Body p={{ base: 6, md: 8 }}>
              <Flex
                direction={{ base: "column", md: "row" }}
                align={{ base: "start", md: "center" }}
                gap={{ base: 4, md: 8 }}
              >
                <Flex
                  w="56px"
                  h="56px"
                  borderRadius="xl"
                  bg="blue.500"
                  align="center"
                  justify="center"
                  flexShrink={0}
                >
                  <Box w="20px" h="20px" borderRadius="md" bg="white" />
                </Flex>
                <Box flex={1}>
                  <Flex align="center" gap={3} mb={2}>
                    <Heading size="md" color="gray.900">Live Session Sync</Heading>
                    <Text
                      fontSize="xs"
                      fontWeight="bold"
                      bg="blue.100"
                      color="blue.700"
                      px={2}
                      py={0.5}
                      borderRadius="full"
                      textTransform="uppercase"
                      letterSpacing="wide"
                    >
                      Agent plan
                    </Text>
                  </Flex>
                  <Text fontSize="md" color="gray.500" lineHeight="1.8" maxW="680px">
                    The leader hits play and every connected device follows along.
                    Pause, seek, jump to the chorus — transport controls broadcast
                    to every musician&apos;s screen in real time. No more counting people in.
                  </Text>
                </Box>
              </Flex>
            </Card.Body>
          </Card.Root>
        </Box>
      </Box>

      {/* Social proof / callout */}
      <Box
        as="section"
        py={{ base: 12, md: 16 }}
        px={6}
        bg="blue.600"
        color="white"
        textAlign="center"
      >
        <Box maxW="700px" mx="auto">
          <Heading size={{ base: "lg", md: "xl" }} mb={3} fontWeight="semibold">
            Built by musicians, for musicians.
          </Heading>
          <Text fontSize={{ base: "md", md: "lg" }} color="blue.100" lineHeight="1.7">
            We got tired of texting PDF charts in group chats and arguing
            about which version of the bridge we&apos;re playing. So we built
            the tool we wished existed.
          </Text>
        </Box>
      </Box>

      {/* Pricing */}
      <Box
        as="section"
        id="pricing"
        py={{ base: 14, md: 20 }}
        px={6}
        maxW="1100px"
        mx="auto"
      >
        <Box textAlign="center" mb={14}>
          <Text
            fontSize="xs"
            fontWeight="bold"
            textTransform="uppercase"
            letterSpacing="wider"
            color="blue.500"
            mb={3}
          >
            Pricing
          </Text>
          <Heading size={{ base: "xl", md: "2xl" }} mb={3} color="gray.900">
            Pick what fits your band
          </Heading>
          <Text color="gray.500" fontSize="lg" maxW="480px" mx="auto" mb={6}>
            Start free. Upgrade when you need more songs, members, or live sync.
          </Text>
          <Flex justify="center">
            <Flex
              bg="gray.100"
              borderRadius="lg"
              p={1}
              gap={1}
            >
              <Button
                size="sm"
                variant={interval === "monthly" ? "solid" : "ghost"}
                colorPalette={interval === "monthly" ? "blue" : undefined}
                onClick={() => setInterval("monthly")}
              >
                Monthly
              </Button>
              <Button
                size="sm"
                variant={interval === "yearly" ? "solid" : "ghost"}
                colorPalette={interval === "yearly" ? "blue" : undefined}
                onClick={() => setInterval("yearly")}
              >
                Yearly
                <Badge ml={2} colorPalette="green" variant="solid" fontSize="xs">
                  Save 17%
                </Badge>
              </Button>
            </Flex>
          </Flex>
        </Box>
        <SimpleGrid columns={{ base: 1, md: 3 }} gap={6} alignItems="stretch" pt={{ md: 10 }}>
          {PLANS.map((plan) => (
            <Card.Root
              key={plan.name}
              bg={plan.highlight ? "blue.600" : "white"}
              borderWidth="2px"
              borderColor={plan.highlight ? "blue.500" : "gray.200"}
              position="relative"
              overflow="hidden"
              mt={plan.highlight ? { md: "-40px" } : undefined}
            >
              {plan.highlight && (
                <Box
                  bg="blue.400"
                  py={2}
                  textAlign="center"
                  fontSize="xs"
                  fontWeight="bold"
                  color="white"
                  textTransform="uppercase"
                  letterSpacing="wider"
                >
                  Most Popular
                </Box>
              )}
              <Card.Body p={6} display="flex" flexDirection="column" h="full">
                <Heading size="md" mb={1} color={plan.highlight ? "white" : "gray.800"}>
                  {plan.name}
                </Heading>
                <Text fontSize="sm" color={plan.highlight ? "blue.100" : "gray.500"} mb={4}>
                  {plan.description}
                </Text>
                <Flex align="baseline" gap={1} mb={6}>
                  <Text fontSize="4xl" fontWeight="bold" color={plan.highlight ? "white" : "gray.900"}>
                    {interval === "monthly" ? plan.monthlyPrice : plan.yearlyPrice}
                  </Text>
                  <Text fontSize="sm" color={plan.highlight ? "blue.100" : "gray.500"}>
                    {interval === "monthly" ? plan.period : plan.yearlyPeriod}
                  </Text>
                </Flex>
                <VStack align="stretch" gap={2} flex={1}>
                  {plan.features.map((feature) => (
                    <Flex key={feature} align="center" gap={2}>
                      <Text color={plan.highlight ? "blue.200" : "green.500"} fontSize="sm" flexShrink={0}>
                        ✓
                      </Text>
                      <Text fontSize="sm" color={plan.highlight ? "white" : "gray.600"}>
                        {feature}
                      </Text>
                    </Flex>
                  ))}
                </VStack>
                <Button
                  w="full"
                  mt={6}
                  colorPalette={plan.highlight ? "white" : "blue"}
                  variant={plan.highlight ? "outline" : "solid"}
                  borderColor={plan.highlight ? "white" : undefined}
                  color={plan.highlight ? "white" : undefined}
                  _hover={plan.highlight ? { bg: "whiteAlpha.200" } : undefined}
                  asChild
                >
                  <NextLink href="/register">{plan.cta}</NextLink>
                </Button>
              </Card.Body>
            </Card.Root>
          ))}
        </SimpleGrid>
      </Box>

      {/* Final CTA */}
      <Box
        as="section"
        py={{ base: 14, md: 20 }}
        px={6}
        bg="gray.50"
      >
        <Box maxW="600px" mx="auto" textAlign="center">
          <Heading size={{ base: "xl", md: "2xl" }} mb={4} color="gray.900">
            Your band deserves better than a shared Google Drive.
          </Heading>
          <Text color="gray.500" fontSize="lg" mb={8}>
            Set up your first band in under two minutes. Free, no credit card.
          </Text>
          <Button size="lg" colorPalette="blue" px={10} asChild>
            <NextLink href="/register">Get Started Free</NextLink>
          </Button>
        </Box>
      </Box>

      {/* Footer */}
      <Box
        as="footer"
        py={8}
        px={6}
        borderTop="1px solid"
        borderColor="gray.200"
      >
        <Flex
          maxW="1100px"
          mx="auto"
          justify="space-between"
          align="center"
          flexWrap="wrap"
          gap={4}
        >
          <Image src="/icon.png" alt="RehearsSync" width={28} height={28} />
          <Text fontSize="sm" color="gray.400">
            &copy; {new Date().getFullYear()} RehearsSync. All rights reserved.
          </Text>
          <Flex gap={6}>
            <NextLink href="#features">
              <Text fontSize="sm" color="gray.500" _hover={{ color: "gray.800" }}>
                Features
              </Text>
            </NextLink>
            <NextLink href="#pricing">
              <Text fontSize="sm" color="gray.500" _hover={{ color: "gray.800" }}>
                Pricing
              </Text>
            </NextLink>
            <NextLink href="/login">
              <Text fontSize="sm" color="gray.500" _hover={{ color: "gray.800" }}>
                Sign In
              </Text>
            </NextLink>
          </Flex>
        </Flex>
      </Box>
    </Box>
  );
}
