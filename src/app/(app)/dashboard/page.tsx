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
  members: { id: string; displayName: string; role: string }[];
  _count: { songs: number };
}

export default function DashboardPage() {
  const router = useRouter();
  const { data: bands, isLoading } = useApiQuery<BandSummary[]>(
    ["bands"],
    "/bands"
  );

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

  if (isLoading) {
    return (
      <Flex justify="center" align="center" minH="60vh">
        <Spinner size="lg" color="blue.500" />
      </Flex>
    );
  }

  return (
    <Box maxW="1000px">
      <Flex justify="space-between" align="center" mb={8}>
        <Box>
          <Heading size="xl" color="gray.800">Dashboard</Heading>
          <Text color="gray.500" mt={1}>Manage your bands and rehearsals</Text>
        </Box>
        {bands && bands.length > 0 && (
          <Button colorPalette="blue" onClick={() => setShowCreate(true)}>
            + New Band
          </Button>
        )}
      </Flex>

      {(!bands || bands.length === 0) ? (
        <Card.Root p={12} textAlign="center" borderStyle="dashed" borderWidth="2px" borderColor="gray.200" bg="white">
          <Card.Body>
            <Text fontSize="4xl" mb={4}>🎸</Text>
            <Heading size="lg" mb={2} color="gray.700">
              Welcome to RehearsSync!
            </Heading>
            <Text color="gray.500" mb={2} maxW="400px" mx="auto">
              Create your first band to start uploading sheet music,
              assigning parts, and organizing rehearsals.
            </Text>
            <Button colorPalette="blue" size="lg" mt={4} onClick={() => setShowCreate(true)}>
              Create Your First Band
            </Button>
          </Card.Body>
        </Card.Root>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={5}>
          {bands?.map((band) => (
            <Card.Root
              key={band.id}
              cursor="pointer"
              _hover={{ shadow: "lg", borderColor: "blue.200" }}
              transition="all 0.2s"
              bg="white"
              borderWidth="1px"
              borderColor="gray.100"
              onClick={() => router.push(`/bands/${band.id}`)}
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
                  <Heading size="md" color="gray.800">{band.name}</Heading>
                </Flex>
                <Flex gap={3}>
                  <Badge colorPalette="blue" variant="subtle">
                    {band._count.songs} {band._count.songs === 1 ? "song" : "songs"}
                  </Badge>
                  <Badge colorPalette="purple" variant="subtle">
                    {band.members.length} {band.members.length === 1 ? "member" : "members"}
                  </Badge>
                </Flex>
              </Card.Body>
            </Card.Root>
          ))}
        </SimpleGrid>
      )}

      <Dialog.Root open={showCreate} onOpenChange={(e) => setShowCreate(e.open)}>
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
