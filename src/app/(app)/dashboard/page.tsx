"use client";

import {
  Box,
  Button,
  Card,
  Heading,
  SimpleGrid,
  Text,
  VStack,
  Input,
  Field,
  Flex,
  Badge,
  Dialog,
  CloseButton,
  Spinner,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApiQuery, useApiMutation } from "@/hooks/useApi";

interface BandSummary {
  id: string;
  name: string;
  members: { id: string; displayName: string; role: string; defaultInstrument: string | null }[];
  _count: { songs: number };
}

interface SongSummary {
  id: string;
  title: string;
  artist: string | null;
  songKey: string | null;
  timeSignature: string | null;
  _count: { arrangements: number };
}

interface MeResponse {
  user: {
    id: string;
    tier: string;
    name: string | null;
  };
}

const TIER_MAX_BANDS: Record<string, number> = {
  free: 1,
  band: 1,
  agent: Infinity,
};

const TIER_LABELS: Record<string, string> = {
  free: "Free",
  band: "Band",
  agent: "Agent",
};

export default function DashboardPage() {
  const router = useRouter();
  const { data: bands, isLoading } = useApiQuery<BandSummary[]>(
    ["bands"],
    "/bands"
  );
  const { data: meData } = useApiQuery<MeResponse>(["me"], "/me");
  const user = meData?.user;

  const tier = user?.tier || "free";
  const maxBands = TIER_MAX_BANDS[tier] ?? 1;
  const canCreateBand = !bands || bands.length < maxBands;

  const [showCreate, setShowCreate] = useState(false);
  const [bandName, setBandName] = useState("");

  const createBand = useApiMutation<BandSummary, { name: string }>(
    "/bands",
    "POST",
    {
      invalidateKeys: [["bands"]],
      onSuccess: (band) => {
        setShowCreate(false);
        setBandName("");
        router.push(`/bands/${band.id}`);
      },
    }
  );

  const singleBand = bands && bands.length === 1 ? bands[0] : null;

  // Fetch songs for single-band view (must be before any early return)
  const { data: songs } = useApiQuery<SongSummary[]>(
    ["songs", singleBand?.id ?? ""],
    `/bands/${singleBand?.id}/songs`,
    { enabled: !!singleBand }
  );

  if (isLoading) {
    return (
      <Flex justify="center" align="center" minH="60vh">
        <Spinner size="lg" color="blue.500" />
      </Flex>
    );
  }

  const band = singleBand;
  const showSingleBandView = band && !canCreateBand;

  return (
    <Box maxW="1000px">
      <Flex justify="space-between" align="center" mb={8}>
        <Box>
          <Heading size="xl" color="gray.800">
            {showSingleBandView
              ? `Welcome back${user?.name ? `, ${user.name.split(" ")[0]}` : ""}`
              : "Dashboard"}
          </Heading>
          <Text color="gray.500" mt={1}>
            {showSingleBandView
              ? `Here's what's happening with ${band.name}`
              : "Manage your bands and rehearsals"}
          </Text>
        </Box>
        {bands && bands.length > 0 && canCreateBand && (
          <Button colorPalette="blue" onClick={() => router.push(`/onboarding`)}>
            + New Band
          </Button>
        )}
      </Flex>

      {/* ── No bands: empty state → launch wizard ── */}
      {(!bands || bands.length === 0) && (
        <VStack gap={6} align="stretch">
          <Card.Root
            p={10}
            textAlign="center"
            borderWidth="2px"
            borderColor="blue.200"
            bg="white"
          >
            <Card.Body>
              <Heading size="lg" mb={2} color="gray.800">
                Welcome to RehearSync!
              </Heading>
              <Text color="gray.500" mb={6} maxW="440px" mx="auto">
                Get your band rehearsal-ready in minutes. Here&apos;s how it works:
              </Text>
              <SimpleGrid columns={{ base: 1, md: 3 }} gap={4} mb={8} textAlign="center">
                <Box p={4} bg="blue.50" borderRadius="xl">
                  <Text fontSize="2xl" mb={2}>1</Text>
                  <Text fontWeight="semibold" fontSize="sm" color="gray.800" mb={1}>
                    Set up your band
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    Name your band, add members, and assign instruments
                  </Text>
                </Box>
                <Box p={4} bg="purple.50" borderRadius="xl">
                  <Text fontSize="2xl" mb={2}>2</Text>
                  <Text fontWeight="semibold" fontSize="sm" color="gray.800" mb={1}>
                    Add a song & upload audio
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    Drop in your full mix — AI splits stems, creates parts & charts automatically
                  </Text>
                </Box>
                <Box p={4} bg="green.50" borderRadius="xl">
                  <Text fontSize="2xl" mb={2}>3</Text>
                  <Text fontWeight="semibold" fontSize="sm" color="gray.800" mb={1}>
                    Rehearse together
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    Start a session — each member sees their own charts and hears their parts
                  </Text>
                </Box>
              </SimpleGrid>
              <Button
                colorPalette="blue"
                size="lg"
                onClick={() => router.push(`/onboarding`)}
              >
                Set Up Your Band
              </Button>
            </Card.Body>
          </Card.Root>
        </VStack>
      )}

      {/* ── Single band hub ── */}
      {showSingleBandView && (
        <VStack gap={6} align="stretch">
          {/* Stats row */}
          <SimpleGrid columns={{ base: 2, md: 3 }} gap={4}>
            <Card.Root bg="white" borderWidth="1px" borderColor="gray.100">
              <Card.Body p={5}>
                <Text fontSize="sm" color="gray.500" mb={1}>
                  Songs
                </Text>
                <Text fontSize="2xl" fontWeight="bold" color="gray.800">
                  {songs?.length ?? band._count.songs}
                </Text>
              </Card.Body>
            </Card.Root>
            <Card.Root bg="white" borderWidth="1px" borderColor="gray.100">
              <Card.Body p={5}>
                <Text fontSize="sm" color="gray.500" mb={1}>
                  Members
                </Text>
                <Text fontSize="2xl" fontWeight="bold" color="gray.800">
                  {band.members.length}
                </Text>
              </Card.Body>
            </Card.Root>
            <Card.Root bg="white" borderWidth="1px" borderColor="gray.100">
              <Card.Body p={5}>
                <Text fontSize="sm" color="gray.500" mb={1}>
                  Plan
                </Text>
                <Flex align="center" gap={2}>
                  <Text fontSize="2xl" fontWeight="bold" color="gray.800">
                    {TIER_LABELS[tier] || "Free"}
                  </Text>
                  {tier === "free" && (
                    <Badge colorPalette="orange" variant="subtle" fontSize="xs">
                      Limited
                    </Badge>
                  )}
                </Flex>
              </Card.Body>
            </Card.Root>
          </SimpleGrid>

          {/* Getting started checklist — shown until user has songs */}
          {(!songs || songs.length === 0) && (
            <Card.Root bg="blue.50" borderWidth="1px" borderColor="blue.200">
              <Card.Body p={6}>
                <Heading size="sm" color="blue.800" mb={4}>
                  Getting Started
                </Heading>
                <VStack align="stretch" gap={3}>
                  <Flex align="center" gap={3}>
                    <Flex
                      w="24px" h="24px" borderRadius="full"
                      bg={band.members.length > 1 ? "green.500" : "gray.300"}
                      align="center" justify="center"
                      fontSize="xs" fontWeight="bold" color="white" flexShrink={0}
                    >
                      {band.members.length > 1 ? "✓" : "1"}
                    </Flex>
                    <Box flex={1}>
                      <Text fontSize="sm" fontWeight="medium" color={band.members.length > 1 ? "green.700" : "gray.800"}>
                        Invite band members
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        Add members and assign their instruments so parts auto-match
                      </Text>
                    </Box>
                    {band.members.length <= 1 && (
                      <Button size="xs" variant="outline" colorPalette="blue" onClick={() => router.push("/onboarding")}>
                        Invite
                      </Button>
                    )}
                  </Flex>
                  <Flex align="center" gap={3}>
                    <Flex
                      w="24px" h="24px" borderRadius="full"
                      bg="gray.300"
                      align="center" justify="center"
                      fontSize="xs" fontWeight="bold" color="white" flexShrink={0}
                    >
                      2
                    </Flex>
                    <Box flex={1}>
                      <Text fontSize="sm" fontWeight="medium" color="gray.800">
                        Add your first song
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        Create a song, then upload a full mix — AI will separate stems, generate parts, charts & sections
                      </Text>
                    </Box>
                    <Button size="xs" variant="outline" colorPalette="blue" onClick={() => router.push(`/bands/${band.id}`)}>
                      Add Song
                    </Button>
                  </Flex>
                  <Flex align="center" gap={3}>
                    <Flex
                      w="24px" h="24px" borderRadius="full"
                      bg="gray.300"
                      align="center" justify="center"
                      fontSize="xs" fontWeight="bold" color="white" flexShrink={0}
                    >
                      3
                    </Flex>
                    <Box flex={1}>
                      <Text fontSize="sm" fontWeight="medium" color="gray.800">
                        Start a rehearsal session
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        Once a song is published, create a session — each member sees their own charts in real time
                      </Text>
                    </Box>
                  </Flex>
                </VStack>
              </Card.Body>
            </Card.Root>
          )}

          {/* Band members with instruments */}
          <Card.Root bg="white" borderWidth="1px" borderColor="gray.100">
            <Card.Body p={6}>
              <Flex justify="space-between" align="center" mb={4}>
                <Heading size="sm" color="gray.700">
                  Band Members
                </Heading>
                <Button
                  variant="outline"
                  size="xs"
                  colorPalette="blue"
                  onClick={() => router.push(`/onboarding`)}
                >
                  Set Up Band
                </Button>
              </Flex>
              <Flex gap={3} wrap="wrap">
                {band.members.map((member) => (
                  <Flex
                    key={member.id}
                    align="center"
                    gap={2}
                    px={3}
                    py={2}
                    bg="gray.50"
                    borderRadius="lg"
                  >
                    <Box
                      w="28px"
                      h="28px"
                      borderRadius="full"
                      bg="blue.100"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      fontSize="xs"
                      fontWeight="bold"
                      color="blue.700"
                    >
                      {member.displayName.charAt(0).toUpperCase()}
                    </Box>
                    <Box>
                      <Text fontSize="sm" color="gray.700" lineHeight="1.2">
                        {member.displayName}
                      </Text>
                      {member.defaultInstrument && (
                        <Text fontSize="xs" color="gray.400">
                          {member.defaultInstrument}
                        </Text>
                      )}
                    </Box>
                    {member.role === "leader" && (
                      <Badge
                        colorPalette="blue"
                        variant="subtle"
                        fontSize="2xs"
                      >
                        Leader
                      </Badge>
                    )}
                  </Flex>
                ))}
              </Flex>
            </Card.Body>
          </Card.Root>

          {/* Songs list */}
          <Card.Root bg="white" borderWidth="1px" borderColor="gray.100">
            <Card.Body p={6}>
              <Flex justify="space-between" align="center" mb={4}>
                <Heading size="sm" color="gray.700">
                  Songs
                </Heading>
                <Button
                  variant="outline"
                  size="xs"
                  colorPalette="blue"
                  onClick={() => router.push(`/bands/${band.id}`)}
                >
                  View all
                </Button>
              </Flex>
              {!songs || songs.length === 0 ? (
                <Flex direction="column" align="center" p={6} bg="gray.50" borderRadius="lg" textAlign="center">
                  <Text fontSize="sm" color="gray.500" mb={3}>
                    No songs yet
                  </Text>
                  <Button
                    size="sm"
                    colorPalette="blue"
                    variant="outline"
                    onClick={() => router.push(`/bands/${band.id}`)}
                  >
                    Add Your First Song
                  </Button>
                </Flex>
              ) : (
                <VStack align="stretch" gap={0}>
                  {songs.map((song, i) => (
                    <Flex
                      key={song.id}
                      align="center"
                      py={2.5}
                      px={3}
                      gap={3}
                      borderBottom={i < songs.length - 1 ? "1px solid" : "none"}
                      borderColor="gray.100"
                      cursor="pointer"
                      borderRadius="md"
                      _hover={{ bg: "gray.50" }}
                      onClick={() => router.push(`/bands/${band.id}/songs/${song.id}`)}
                    >
                      <Text fontSize="sm" fontWeight="medium" color="gray.800" flex={1}>
                        {song.title}
                      </Text>
                      {song.artist && (
                        <Text fontSize="xs" color="gray.400">
                          {song.artist}
                        </Text>
                      )}
                      {song.songKey && (
                        <Badge colorPalette="purple" variant="subtle" fontSize="xs">
                          {song.songKey}
                        </Badge>
                      )}
                      {song.timeSignature && (
                        <Badge colorPalette="orange" variant="subtle" fontSize="xs">
                          {song.timeSignature}
                        </Badge>
                      )}
                      <Badge colorPalette="gray" variant="subtle" fontSize="xs">
                        {song._count.arrangements} arr.
                      </Badge>
                    </Flex>
                  ))}
                </VStack>
              )}
            </Card.Body>
          </Card.Root>

          {/* Upgrade CTA for free users */}
          {tier === "free" && (
            <Card.Root
              bg="blue.50"
              borderWidth="1px"
              borderColor="blue.200"
            >
              <Card.Body p={6}>
                <Flex
                  justify="space-between"
                  align="center"
                  direction={{ base: "column", md: "row" }}
                  gap={4}
                >
                  <Box>
                    <Heading size="sm" color="blue.800" mb={1}>
                      Unlock more with the Band plan
                    </Heading>
                    <Text fontSize="sm" color="blue.600">
                      Unlimited songs, AI stem separation, MusicXML support, up
                      to 15 members, and more.
                    </Text>
                  </Box>
                  <Button
                    colorPalette="blue"
                    size="sm"
                    flexShrink={0}
                    onClick={() => router.push("/pricing")}
                  >
                    View Plans
                  </Button>
                </Flex>
              </Card.Body>
            </Card.Root>
          )}
        </VStack>
      )}

      {/* ── Multiple bands grid (agent tier) ── */}
      {bands && bands.length > 0 && !showSingleBandView && (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={5}>
          {bands.map((b) => (
            <Card.Root
              key={b.id}
              cursor="pointer"
              _hover={{ shadow: "lg", borderColor: "blue.200" }}
              transition="all 0.2s"
              bg="white"
              borderWidth="1px"
              borderColor="gray.100"
              onClick={() => router.push(`/bands/${b.id}`)}
            >
              <Card.Body p={6}>
                <Flex align="center" gap={3} mb={3}>
                  <Box
                    w="40px"
                    h="40px"
                    borderRadius="lg"
                    bg="blue.50"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    fontSize="lg"
                  >
                    🎵
                  </Box>
                  <Heading size="md" color="gray.800">
                    {b.name}
                  </Heading>
                </Flex>
                <Flex gap={3}>
                  <Badge colorPalette="blue" variant="subtle">
                    {b._count.songs}{" "}
                    {b._count.songs === 1 ? "song" : "songs"}
                  </Badge>
                  <Badge colorPalette="purple" variant="subtle">
                    {b.members.length}{" "}
                    {b.members.length === 1 ? "member" : "members"}
                  </Badge>
                </Flex>
              </Card.Body>
            </Card.Root>
          ))}
        </SimpleGrid>
      )}

      {/* Create band dialog */}
      <Dialog.Root
        open={showCreate}
        onOpenChange={(e) => setShowCreate(e.open)}
      >
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="440px">
            <Dialog.Header>
              <Dialog.Title>Create a band</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body>
              <Text color="gray.500" mb={4} fontSize="sm">
                Name your band — you can invite members after.
              </Text>
              <form
                id="create-band-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  createBand.mutate({ name: bandName });
                }}
              >
                <Field.Root>
                  <Field.Label>Band Name</Field.Label>
                  <Input
                    value={bandName}
                    onChange={(e) => setBandName(e.target.value)}
                    placeholder='e.g. "The Midnight Sessions"'
                    required
                    autoFocus
                    size="lg"
                  />
                </Field.Root>
              </form>
            </Dialog.Body>
            <Dialog.Footer>
              <Flex gap={3} w="full">
                <Button
                  variant="outline"
                  flex={1}
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="create-band-form"
                  colorPalette="blue"
                  flex={1}
                  loading={createBand.isPending}
                >
                  Create Band
                </Button>
              </Flex>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Box>
  );
}
