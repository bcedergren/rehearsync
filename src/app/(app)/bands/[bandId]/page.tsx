"use client";

import {
  Box,
  Button,
  Card,
  Heading,
  Text,
  VStack,
  Input,
  Field,
  Badge,
  Flex,
  Dialog,
  CloseButton,
  Spinner,
} from "@chakra-ui/react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useApiQuery, useApiMutation } from "@/hooks/useApi";

interface Song {
  id: string;
  title: string;
  artist: string | null;
  defaultBpm: number | null;
  _count: { arrangements: number };
}

export default function BandSongsPage() {
  const params = useParams();
  const router = useRouter();
  const bandId = params.bandId as string;

  const { data: songs, isLoading } = useApiQuery<Song[]>(
    ["songs", bandId],
    `/bands/${bandId}/songs`
  );

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");

  const createSong = useApiMutation<Song, { title: string; artist?: string }>(
    `/bands/${bandId}/songs`,
    "POST",
    {
      invalidateKeys: [["songs", bandId]],
      onSuccess: (song) => {
        setShowCreate(false);
        setTitle("");
        setArtist("");
        router.push(`/bands/${bandId}/songs/${song.id}`);
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
    <Box maxW="900px">
      <Flex justify="space-between" align="center" mb={8}>
        <Box>
          <Heading size="xl" color="gray.800">Songs</Heading>
          <Text color="gray.500" mt={1}>Your band&apos;s repertoire</Text>
        </Box>
        <Button colorPalette="blue" onClick={() => setShowCreate(true)}>
          + New Song
        </Button>
      </Flex>

      {(!songs || songs.length === 0) ? (
        <Card.Root p={12} textAlign="center" borderStyle="dashed" borderWidth="2px" borderColor="gray.200" bg="white">
          <Card.Body>
            <Text fontSize="4xl" mb={4}>🎵</Text>
            <Heading size="lg" mb={2} color="gray.700">No songs yet</Heading>
            <Text color="gray.500" mb={4} maxW="360px" mx="auto">
              Add your first song to start building arrangements,
              uploading charts, and assigning parts.
            </Text>
            <Button colorPalette="blue" size="lg" onClick={() => setShowCreate(true)}>
              Add First Song
            </Button>
          </Card.Body>
        </Card.Root>
      ) : (
        <VStack align="stretch" gap={3}>
          {songs?.map((song) => (
            <Card.Root
              key={song.id}
              cursor="pointer"
              _hover={{ shadow: "md", borderColor: "blue.200" }}
              transition="all 0.2s"
              bg="white"
              borderWidth="1px"
              borderColor="gray.100"
              onClick={() => router.push(`/bands/${bandId}/songs/${song.id}`)}
            >
              <Card.Body px={6} py={4}>
                <Flex justify="space-between" align="center">
                  <Flex align="center" gap={4}>
                    <Box
                      w="36px"
                      h="36px"
                      borderRadius="lg"
                      bg="purple.50"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      fontSize="md"
                      flexShrink={0}
                    >
                      🎶
                    </Box>
                    <Box>
                      <Heading size="sm" color="gray.800">{song.title}</Heading>
                      {song.artist && (
                        <Text fontSize="sm" color="gray.500">by {song.artist}</Text>
                      )}
                    </Box>
                  </Flex>
                  <Flex gap={2} align="center">
                    {song.defaultBpm && (
                      <Badge colorPalette="gray" variant="subtle">
                        {song.defaultBpm} BPM
                      </Badge>
                    )}
                    <Badge colorPalette="blue" variant="subtle">
                      {song._count.arrangements} {song._count.arrangements === 1 ? "arr." : "arr."}
                    </Badge>
                    <Text color="gray.400" ml={2}>→</Text>
                  </Flex>
                </Flex>
              </Card.Body>
            </Card.Root>
          ))}
        </VStack>
      )}

      <Dialog.Root open={showCreate} onOpenChange={(e) => setShowCreate(e.open)}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="440px">
            <Dialog.Header>
              <Dialog.Title>Add a song</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body>
              <Text color="gray.500" mb={4} fontSize="sm">
                You&apos;ll create arrangements and upload charts next.
              </Text>
              <form
                id="create-song-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  createSong.mutate({
                    title,
                    ...(artist ? { artist } : {}),
                  });
                }}
              >
                <VStack gap={4}>
                  <Field.Root>
                    <Field.Label>Song Title</Field.Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      autoFocus
                      size="lg"
                      placeholder='e.g. "Bohemian Rhapsody"'
                    />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>Artist / Composer (optional)</Field.Label>
                    <Input
                      value={artist}
                      onChange={(e) => setArtist(e.target.value)}
                      placeholder="e.g. Queen"
                    />
                  </Field.Root>
                </VStack>
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
                  form="create-song-form"
                  colorPalette="blue"
                  flex={1}
                  loading={createSong.isPending}
                >
                  Create Song
                </Button>
              </Flex>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Box>
  );
}
