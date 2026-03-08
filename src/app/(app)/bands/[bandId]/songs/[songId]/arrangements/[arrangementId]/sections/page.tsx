"use client";

import {
  Box,
  Button,
  Heading,
  Text,
  VStack,
  Table,
  Field,
  Input,
  Flex,
  Dialog,
  CloseButton,
  Spinner,
} from "@chakra-ui/react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useApiQuery, useApiMutation } from "@/hooks/useApi";

interface SectionMarker {
  id: string;
  name: string;
  startBar: number;
  endBar: number | null;
  sortOrder: number;
}

export default function SectionsPage() {
  const params = useParams();
  const router = useRouter();
  const bandId = params.bandId as string;
  const songId = params.songId as string;
  const arrangementId = params.arrangementId as string;
  const basePath = `/bands/${bandId}/songs/${songId}/arrangements/${arrangementId}`;

  const { data: sections, isLoading } = useApiQuery<SectionMarker[]>(
    ["sections", arrangementId],
    `/arrangements/${arrangementId}/sections`
  );

  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [startBar, setStartBar] = useState("");
  const [endBar, setEndBar] = useState("");

  const [editingSection, setEditingSection] = useState<SectionMarker | null>(null);
  const [editName, setEditName] = useState("");
  const [editStartBar, setEditStartBar] = useState("");
  const [editEndBar, setEditEndBar] = useState("");

  function openEdit(section: SectionMarker) {
    setEditingSection(section);
    setEditName(section.name);
    setEditStartBar(String(section.startBar));
    setEditEndBar(section.endBar != null ? String(section.endBar) : "");
  }

  const createSection = useApiMutation(
    `/arrangements/${arrangementId}/sections`,
    "POST",
    {
      invalidateKeys: [["sections", arrangementId]],
      onSuccess: () => {
        setShowAdd(false);
        setName("");
        setStartBar("");
        setEndBar("");
      },
    }
  );

  const updateSection = useApiMutation(
    editingSection ? `/arrangements/${arrangementId}/sections/${editingSection.id}` : "",
    "PATCH",
    {
      invalidateKeys: [["sections", arrangementId]],
      onSuccess: () => setEditingSection(null),
    }
  );

  if (isLoading) return <Flex justify="center" align="center" minH="40vh"><Spinner size="lg" color="blue.500" /></Flex>;

  return (
    <Box>
      <Button
        variant="ghost"
        size="sm"
        color="gray.500"
        mb={2}
        onClick={() => router.push(basePath)}
      >
        ← Back to arrangement
      </Button>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg">Section Markers</Heading>
        <Button
          colorPalette="blue"
          size="sm"
          onClick={() => setShowAdd(true)}
        >
          Add Section
        </Button>
      </Flex>

      {sections && sections.length > 0 && (
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Name</Table.ColumnHeader>
              <Table.ColumnHeader>Start Bar</Table.ColumnHeader>
              <Table.ColumnHeader>End Bar</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {sections.map((s) => (
              <Table.Row
                key={s.id}
                cursor="pointer"
                _hover={{ bg: "gray.50" }}
                onClick={() => openEdit(s)}
              >
                <Table.Cell>{s.name}</Table.Cell>
                <Table.Cell>{s.startBar}</Table.Cell>
                <Table.Cell>{s.endBar ?? "—"}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      )}

      <Dialog.Root open={showAdd} onOpenChange={(e) => setShowAdd(e.open)}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="440px">
            <Dialog.Header>
              <Dialog.Title>Add Section</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body>
              <form
                id="add-section-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  createSection.mutate({
                    name,
                    startBar: parseInt(startBar),
                    endBar: endBar ? parseInt(endBar) : undefined,
                    sortOrder: (sections?.length ?? 0) + 1,
                  });
                }}
              >
                <VStack gap={4}>
                  <Field.Root>
                    <Field.Label>Section Name</Field.Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Chorus"
                      required
                      autoFocus
                    />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>Start Bar</Field.Label>
                    <Input
                      type="number"
                      value={startBar}
                      onChange={(e) => setStartBar(e.target.value)}
                      required
                      min={1}
                    />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>End Bar (optional)</Field.Label>
                    <Input
                      type="number"
                      value={endBar}
                      onChange={(e) => setEndBar(e.target.value)}
                      min={1}
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
                  onClick={() => setShowAdd(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="add-section-form"
                  colorPalette="blue"
                  flex={1}
                  loading={createSection.isPending}
                >
                  Add Section
                </Button>
              </Flex>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* Edit Section Modal */}
      <Dialog.Root open={!!editingSection} onOpenChange={(e) => { if (!e.open) setEditingSection(null); }}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="440px">
            <Dialog.Header>
              <Dialog.Title>Edit Section</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body>
              <form
                id="edit-section-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  updateSection.mutate({
                    name: editName,
                    startBar: parseInt(editStartBar),
                    endBar: editEndBar ? parseInt(editEndBar) : undefined,
                  });
                }}
              >
                <VStack gap={4}>
                  <Field.Root>
                    <Field.Label>Section Name</Field.Label>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      required
                      autoFocus
                    />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>Start Bar</Field.Label>
                    <Input
                      type="number"
                      value={editStartBar}
                      onChange={(e) => setEditStartBar(e.target.value)}
                      required
                      min={1}
                    />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>End Bar (optional)</Field.Label>
                    <Input
                      type="number"
                      value={editEndBar}
                      onChange={(e) => setEditEndBar(e.target.value)}
                      min={1}
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
                  onClick={() => setEditingSection(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="edit-section-form"
                  colorPalette="blue"
                  flex={1}
                  loading={updateSection.isPending}
                >
                  Save Changes
                </Button>
              </Flex>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Box>
  );
}
