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
import {
  Music,
  Headphones,
  Users,
  GitBranch,
  Bookmark,
  Radio,
  Sparkles,
  AudioWaveform,
} from "lucide-react";
import Image from "next/image";
import NextLink from "next/link";
import { useState } from "react";

const PLANS = [
  {
    name: "Free",
    tier: "free",
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
    tier: "band",
    monthlyPrice: "$29.99",
    yearlyPrice: "$299",
    period: "/month",
    yearlyPeriod: "/year",
    description: "For active bands and ensembles",
    features: [
      "1 band, up to 15 members",
      "Unlimited songs",
      "MusicXML + PDF charts",
      "AI stem separation",
      "AI section detection",
      "Waveform audio player",
      "Email invites",
      "Arrangement versioning",
    ],
    cta: "Subscribe",
    highlight: true,
  },
  {
    name: "Agent",
    tier: "agent",
    monthlyPrice: "$99.99",
    yearlyPrice: "$999",
    period: "/month",
    yearlyPeriod: "/year",
    description: "For music directors and large groups",
    features: [
      "Everything in Band",
      "Unlimited bands & members",
      "Live rehearsal sync",
      "Real-time transport controls",
      "Sync map editor",
      "Beat detection & tempo maps",
      "Session analytics",
      "Dedicated support",
    ],
    cta: "Subscribe",
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
          <Image src="/logo.png" alt="RehearSync" width={180} height={45} priority style={{ height: "auto" }} />
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
            Run rehearsals where every musician stays in sync.
          </Heading>
          <Text
            fontSize={{ base: "md", md: "lg" }}
            color="whiteAlpha.900"
            mb={8}
            lineHeight="1.7"
            maxW="620px"
          >
            Control rehearsal flow from one device. Jump to any section and
            every musician&apos;s screen follows — sheet music, audio, and cues
            update instantly. AI splits stems, detects tempo, and maps out
            sections so you can focus on the music.
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

      {/* Before / After contrast */}
      <Box as="section" py={{ base: 14, md: 20 }} px={6}>
        <Box maxW="800px" mx="auto">
          <Text
            fontSize="xs"
            fontWeight="bold"
            textTransform="uppercase"
            letterSpacing="wider"
            color="blue.500"
            mb={8}
            textAlign="center"
          >
            Sound familiar?
          </Text>
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={6}>
            <Box
              bg="red.50"
              borderRadius="xl"
              p={6}
              borderLeft="4px solid"
              borderColor="red.400"
            >
              <Text fontWeight="bold" color="red.600" mb={3} fontSize="sm" textTransform="uppercase">
                Before RehearSync
              </Text>
              <VStack align="start" gap={2}>
                {[
                  "\u201CWho has the updated chart?\u201D",
                  "\u201CMeasure 52? I\u2019m still on the last page.\u201D",
                  "\u201CThe click track is on my other phone.\u201D",
                  "\u201CWait, are we doing the new bridge or the old one?\u201D",
                ].map((quote) => (
                  <Text key={quote} fontSize="md" color="gray.700" fontStyle="italic" lineHeight="1.6">
                    {quote}
                  </Text>
                ))}
              </VStack>
            </Box>
            <Box
              bg="green.50"
              borderRadius="xl"
              p={6}
              borderLeft="4px solid"
              borderColor="green.400"
            >
              <Text fontWeight="bold" color="green.600" mb={3} fontSize="sm" textTransform="uppercase">
                After RehearSync
              </Text>
              <VStack align="start" gap={2}>
                {[
                  "Director jumps to the bridge.",
                  "Every screen scrolls to the right bar.",
                  "The correct stem is already soloed.",
                  "Everyone plays. No confusion.",
                ].map((line) => (
                  <Text key={line} fontSize="md" color="gray.700" lineHeight="1.6">
                    {line}
                  </Text>
                ))}
              </VStack>
            </Box>
          </SimpleGrid>
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
                desc: "Create a band, add members and instruments in a quick setup wizard, then send email invites — everyone gets a link to join.",
              },
              {
                step: "02",
                title: "Load in your music",
                desc: "Upload PDF or MusicXML charts and a full mix. AI splits it into stems, detects the tempo, and maps out sections automatically.",
              },
              {
                step: "03",
                title: "Hit play together",
                desc: "Start a live session. The leader controls transport — play, pause, jump to the bridge — and every screen follows along in real time.",
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

      {/* Perfect for — target audience */}
      <Box as="section" py={{ base: 10, md: 14 }} px={6} bg="gray.50">
        <Box maxW="900px" mx="auto" textAlign="center">
          <Text
            fontSize="xs"
            fontWeight="bold"
            textTransform="uppercase"
            letterSpacing="wider"
            color="blue.500"
            mb={3}
          >
            Built for groups that rehearse
          </Text>
          <Heading size={{ base: "lg", md: "xl" }} mb={10} color="gray.900">
            Perfect for
          </Heading>
          <SimpleGrid columns={{ base: 2, md: 4 }} gap={6}>
            {[
              { label: "Worship Teams", icon: <Music size={28} /> },
              { label: "Bands", icon: <Headphones size={28} /> },
              { label: "Orchestras", icon: <AudioWaveform size={28} /> },
              { label: "Theater Pits", icon: <Radio size={28} /> },
            ].map((item) => (
              <VStack key={item.label} gap={3}>
                <Flex
                  w="60px"
                  h="60px"
                  borderRadius="full"
                  bg="blue.50"
                  color="blue.500"
                  align="center"
                  justify="center"
                >
                  {item.icon}
                </Flex>
                <Text fontWeight="semibold" color="gray.700" fontSize="md">
                  {item.label}
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
            Everything your rehearsal needs
          </Heading>
          <Box mb={16} />

          <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} gap={5}>
            {[
              {
                icon: <Music size={24} />,
                color: "blue",
                title: "Sheet Music",
                desc: "Upload PDF and MusicXML charts per part with in-browser rendering. One source of truth on every music stand.",
              },
              {
                icon: <Sparkles size={24} />,
                color: "violet",
                title: "AI Audio Processing",
                desc: "Upload a full mix and AI splits it into six stems — vocals, drums, bass, guitar, piano, and other — automatically.",
              },
              {
                icon: <AudioWaveform size={24} />,
                color: "purple",
                title: "Waveform Player",
                desc: "Interactive color-coded waveforms for every track. Click anywhere to seek, switch between stems instantly.",
              },
              {
                icon: <Users size={24} />,
                color: "orange",
                title: "Email Invites",
                desc: "Invite band members by email during setup or anytime after. They get a one-click link to join your band.",
              },
              {
                icon: <Bookmark size={24} />,
                color: "pink",
                title: "AI Section Detection",
                desc: "AI analyzes your audio and charts to identify Intro, Verse, Chorus, Bridge — so you can jump to any section instantly.",
              },
              {
                icon: <GitBranch size={24} />,
                color: "green",
                title: "Arrangement Versioning",
                desc: "Trying a new outro? Draft it without touching the published version. Archive the old one when you\u2019re sure.",
              },
              {
                icon: <Headphones size={24} />,
                color: "teal",
                title: "Sync Maps & Beat Detection",
                desc: "AI detects tempo and maps audio timestamps to bar numbers, so playback and sheet music stay perfectly in sync.",
              },
              {
                icon: <Radio size={24} />,
                color: "cyan",
                title: "Live Session Sync",
                desc: "The leader hits play and every connected device follows along. Transport controls broadcast in real time.",
              },
            ].map((feature) => (
              <Card.Root key={feature.title} borderWidth="1px" borderColor="gray.200" bg="white">
                <Card.Body p={6} display="flex" flexDirection="column" alignItems="center" textAlign="center">
                  <Flex
                    w="52px"
                    h="52px"
                    borderRadius="xl"
                    bg={`${feature.color}.50`}
                    color={`${feature.color}.500`}
                    align="center"
                    justify="center"
                    mb={4}
                  >
                    {feature.icon}
                  </Flex>
                  <Heading size="sm" mb={2} color="gray.900">{feature.title}</Heading>
                  <Text fontSize="sm" color="gray.500" lineHeight="1.7">
                    {feature.desc}
                  </Text>
                </Card.Body>
              </Card.Root>
            ))}
          </SimpleGrid>
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
            Built by musicians, powered by AI.
          </Heading>
          <Text fontSize={{ base: "md", md: "lg" }} color="blue.100" lineHeight="1.7" mb={8}>
            We got tired of texting PDF charts in group chats, manually splitting stems,
            and arguing about which version of the bridge we&apos;re playing.
            So we built the tool we wished existed — and let AI handle the tedious parts.
          </Text>
          <Box
            bg="blue.700"
            borderRadius="xl"
            p={6}
            maxW="520px"
            mx="auto"
          >
            <Text fontSize="md" fontStyle="italic" color="white" lineHeight="1.7" mb={3}>
              &ldquo;We used to burn 10 minutes every rehearsal just getting everyone on the same page.
              Now the director hits play and we&apos;re all there.&rdquo;
            </Text>
            <Text fontSize="sm" color="blue.200" fontWeight="semibold">
              — Worship team leader, early beta user
            </Text>
          </Box>
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
                  <NextLink href={`/register?plan=${plan.tier}&interval=${interval}`}>{plan.cta}</NextLink>
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
            Create your band, invite members by email, and upload your first song
            in under two minutes. Free, no credit card.
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
            <NextLink href="/privacy">
              <Text fontSize="sm" color="gray.500" _hover={{ color: "gray.800" }}>
                Privacy
              </Text>
            </NextLink>
            <NextLink href="/terms">
              <Text fontSize="sm" color="gray.500" _hover={{ color: "gray.800" }}>
                Terms
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
