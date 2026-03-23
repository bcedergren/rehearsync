"use client";

import {
  Box,
  Button,
  Card,
  Heading,
  Text,
  VStack,
  Badge,
  Flex,
  Input,
  Field,
  Dialog,
  CloseButton,
  Spinner,
} from "@chakra-ui/react";
import { Pencil } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useApiQuery, useApiMutation } from "@/hooks/useApi";

interface Arrangement {
  id: string;
  name: string;
  versionLabel: string;
  status: string;
  createdAt: string;
}

interface Song {
  id: string;
  title: string;
  artist: string | null;
  arrangements: Arrangement[];
}

export default function SongDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bandId = params.bandId as string;
  const songId = params.songId as string;

  const { data: song, isLoading } = useApiQuery<Song>(
    ["song", songId],
    `/songs/${songId}`
  );

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);

  const [editingArtist, setEditingArtist] = useState(false);
  const [artistDraft, setArtistDraft] = useState("");

  const updateSong = useApiMutation<Song, { title?: string; artist?: string | null }>(
    `/songs/${songId}`,
    "PATCH",
    { invalidateKeys: [["song", songId]] }
  );

  const saveTitle = () => {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== song?.title) {
      updateSong.mutate({ title: trimmed });
    }
    setEditingTitle(false);
  };

  const saveArtist = () => {
    const trimmed = artistDraft.trim();
    if (trimmed !== (song?.artist ?? "")) {
      updateSong.mutate({ artist: trimmed || null });
    }
    setEditingArtist(false);
  };

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [versionLabel, setVersionLabel] = useState("v1");

  const createArrangement = useApiMutation<
    Arrangement,
    { name: string; versionLabel: string }
  >(`/songs/${songId}/arrangements`, "POST", {
    invalidateKeys: [["song", songId]],
    onSuccess: (arr) => {
      setShowCreate(false);
      router.push(
        `/bands/${bandId}/songs/${songId}/arrangements/${arr.id}`
      );
    },
  });

  if (isLoading || !song) return <Flex justify="center" align="center" minH="40vh"><Spinner size="lg" color="blue.500" /></Flex>;

  const statusColor: Record<string, string> = {
    draft: "yellow",
    published: "green",
    archived: "gray",
  };

  return (
    <Box>
      {editingTitle ? (
        <Input
          ref={titleInputRef}
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveTitle();
            if (e.key === "Escape") setEditingTitle(false);
          }}
          fontSize="xl"
          fontWeight="bold"
          variant="flushed"
          mb={1}
          autoFocus
        />
      ) : (
        <Flex
          align="center"
          gap={2}
          mb={1}
          cursor="pointer"
          _hover={{ "& .edit-icon": { opacity: 1 } }}
          onClick={() => {
            setTitleDraft(song.title);
            setEditingTitle(true);
          }}
        >
          <Heading size="lg">{song.title}</Heading>
          <Box
            className="edit-icon"
            opacity={0}
            transition="opacity 0.15s"
          >
            <Pencil size={16} color="var(--chakra-colors-gray-400)" />
          </Box>
        </Flex>
      )}
      {editingArtist ? (
        <Input
          value={artistDraft}
          onChange={(e) => setArtistDraft(e.target.value)}
          onBlur={saveArtist}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveArtist();
            if (e.key === "Escape") setEditingArtist(false);
          }}
          fontSize="sm"
          color="gray.500"
          variant="flushed"
          placeholder="Add artist / composer"
          mb={6}
          autoFocus
        />
      ) : (
        <Flex
          align="center"
          gap={2}
          mb={6}
          cursor="pointer"
          _hover={{ "& .edit-artist-icon": { opacity: 1 } }}
          onClick={() => {
            setArtistDraft(song.artist ?? "");
            setEditingArtist(true);
          }}
        >
          <Text color="gray.500">
            {song.artist || "Add artist / composer"}
          </Text>
          <Box
            className="edit-artist-icon"
            opacity={0}
            transition="opacity 0.15s"
          >
            <Pencil size={14} color="var(--chakra-colors-gray-400)" />
          </Box>
        </Flex>
      )}

      <Flex justify="space-between" align="center" mb={4}>
        <Heading size="md">Arrangements</Heading>
        <Button
          colorPalette="blue"
          size="sm"
          onClick={() => setShowCreate(true)}
        >
          New Arrangement
        </Button>
      </Flex>

      {song.arrangements.length === 0 ? (
        <Card.Root p={6} textAlign="center">
          <Card.Body>
            <Text color="gray.500">No arrangements yet.</Text>
          </Card.Body>
        </Card.Root>
      ) : (
        <VStack align="stretch" gap={2}>
          {song.arrangements.map((arr) => (
            <Card.Root
              key={arr.id}
              cursor="pointer"
              _hover={{ shadow: "md" }}
              onClick={() =>
                router.push(
                  `/bands/${bandId}/songs/${songId}/arrangements/${arr.id}`
                )
              }
            >
              <Card.Body>
                <Flex justify="space-between" align="center">
                  <Box>
                    <Text fontWeight="semibold">
                      {arr.name}{" "}
                      <Text as="span" color="gray.400" fontWeight="normal">
                        {arr.versionLabel}
                      </Text>
                    </Text>
                  </Box>
                  <Badge colorPalette={statusColor[arr.status] || "gray"}>
                    {arr.status}
                  </Badge>
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
              <Dialog.Title>New Arrangement</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body>
              <form
                id="create-arrangement-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  createArrangement.mutate({ name, versionLabel });
                }}
              >
                <VStack gap={4}>
                  <Field.Root>
                    <Field.Label>Arrangement Name</Field.Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Rehearsal Cut"
                      required
                      autoFocus
                    />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>Version Label</Field.Label>
                    <Input
                      value={versionLabel}
                      onChange={(e) => setVersionLabel(e.target.value)}
                      required
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
                  form="create-arrangement-form"
                  colorPalette="blue"
                  flex={1}
                  loading={createArrangement.isPending}
                >
                  Create
                </Button>
              </Flex>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Box>
  );
}
