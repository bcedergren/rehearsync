"use client";

import {
  Box,
  Button,
  Heading,
  Text,
  VStack,
  Table,
  Input,
  Flex,
  Spinner,
  Badge,
  Dialog,
  CloseButton,
  Field,
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

interface SectionRow {
  name: string;
  startBar: string;
  endBar: string;
}

const PRESETS = [
  ["Intro", "Verse", "Chorus", "Verse", "Chorus", "Bridge", "Chorus", "Outro"],
  ["Intro", "Verse", "Pre-Chorus", "Chorus", "Verse", "Pre-Chorus", "Chorus", "Bridge", "Chorus", "Outro"],
  ["Intro", "Head", "Solo", "Head", "Outro"],
];

const EMPTY_ROW: SectionRow = { name: "", startBar: "", endBar: "" };

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

  const [rows, setRows] = useState<SectionRow[]>([{ ...EMPTY_ROW }]);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Edit state
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
    { invalidateKeys: [["sections", arrangementId]] }
  );

  const updateSection = useApiMutation(
    editingSection ? `/arrangements/${arrangementId}/sections/${editingSection.id}` : "",
    "PATCH",
    {
      invalidateKeys: [["sections", arrangementId]],
      onSuccess: () => setEditingSection(null),
    }
  );

  function updateRow(index: number, field: keyof SectionRow, value: string) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  function addRow() {
    setRows((prev) => [...prev, { ...EMPTY_ROW }]);
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function applyPreset(preset: string[]) {
    setRows(preset.map((name) => ({ name, startBar: "", endBar: "" })));
    setShowAdd(true);
  }

  async function handleSubmit() {
    const validRows = rows.filter((r) => r.name.trim() && r.startBar);
    if (validRows.length === 0) return;

    setSaving(true);
    setErrorMsg(null);
    const baseOrder = sections?.length ?? 0;

    try {
      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];
        await createSection.mutateAsync({
          name: row.name.trim(),
          startBar: parseInt(row.startBar),
          endBar: row.endBar ? parseInt(row.endBar) : undefined,
          sortOrder: baseOrder + i + 1,
        });
      }
      setRows([{ ...EMPTY_ROW }]);
      setShowAdd(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save sections");
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <Flex justify="center" align="center" minH="40vh">
        <Spinner size="lg" color="blue.500" />
      </Flex>
    );
  }

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
      <Flex justify="space-between" align="center" mb={2}>
        <Heading size="lg">Section Markers</Heading>
        {!showAdd && (
          <Button
            colorPalette="blue"
            size="sm"
            onClick={() => setShowAdd(true)}
          >
            Add Sections
          </Button>
        )}
      </Flex>
      <Text fontSize="sm" color="gray.500" mb={6}>
        Define song sections like Intro, Verse, Chorus with bar numbers.
      </Text>

      {/* Existing sections */}
      {sections && sections.length > 0 && (
        <Table.Root mb={6}>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader w="40px" color="gray.400">#</Table.ColumnHeader>
              <Table.ColumnHeader>Name</Table.ColumnHeader>
              <Table.ColumnHeader>Start Bar</Table.ColumnHeader>
              <Table.ColumnHeader>End Bar</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {sections.map((s, i) => (
              <Table.Row
                key={s.id}
                cursor="pointer"
                _hover={{ bg: "gray.50" }}
                onClick={() => openEdit(s)}
              >
                <Table.Cell>
                  <Text fontSize="xs" color="gray.400">{i + 1}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Text fontWeight="medium">{s.name}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Badge variant="subtle" fontFamily="mono">{s.startBar}</Badge>
                </Table.Cell>
                <Table.Cell>
                  {s.endBar != null ? (
                    <Badge variant="subtle" fontFamily="mono">{s.endBar}</Badge>
                  ) : (
                    <Text color="gray.400">—</Text>
                  )}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      )}

      {/* Add sections inline form */}
      {showAdd && (
        <Box
          bg="white"
          border="1px solid"
          borderColor="gray.200"
          borderRadius="lg"
          p={5}
          mb={6}
        >
          <Heading size="sm" mb={3}>Add Sections</Heading>

          {/* Presets */}
          <Box mb={4}>
            <Text fontSize="xs" color="gray.500" mb={2} fontWeight="medium">
              Quick presets:
            </Text>
            <Flex gap={2} flexWrap="wrap">
              <Button
                size="xs"
                variant="outline"
                onClick={() => applyPreset(PRESETS[0])}
              >
                Pop/Rock (8 sections)
              </Button>
              <Button
                size="xs"
                variant="outline"
                onClick={() => applyPreset(PRESETS[1])}
              >
                Pop Extended (10 sections)
              </Button>
              <Button
                size="xs"
                variant="outline"
                onClick={() => applyPreset(PRESETS[2])}
              >
                Jazz (5 sections)
              </Button>
            </Flex>
          </Box>

          {errorMsg && (
            <Box bg="red.50" border="1px solid" borderColor="red.200" borderRadius="md" p={3} mb={4}>
              <Text fontSize="sm" color="red.600">{errorMsg}</Text>
            </Box>
          )}

          <VStack align="stretch" gap={2}>
            {/* Header */}
            <Flex gap={2} px={1}>
              <Text fontSize="xs" color="gray.500" fontWeight="medium" flex={1}>
                Section Name
              </Text>
              <Text fontSize="xs" color="gray.500" fontWeight="medium" w="80px">
                Start Bar
              </Text>
              <Text fontSize="xs" color="gray.500" fontWeight="medium" w="80px">
                End Bar
              </Text>
              <Box w="32px" />
            </Flex>

            {rows.map((row, i) => (
              <Flex key={i} gap={2} align="center">
                <Input
                  size="sm"
                  flex={1}
                  placeholder="e.g. Chorus"
                  value={row.name}
                  onChange={(e) => updateRow(i, "name", e.target.value)}
                  autoFocus={i === 0}
                />
                <Input
                  size="sm"
                  w="80px"
                  type="number"
                  placeholder="Bar"
                  min={1}
                  value={row.startBar}
                  onChange={(e) => updateRow(i, "startBar", e.target.value)}
                />
                <Input
                  size="sm"
                  w="80px"
                  type="number"
                  placeholder="End"
                  min={1}
                  value={row.endBar}
                  onChange={(e) => updateRow(i, "endBar", e.target.value)}
                />
                <Button
                  size="xs"
                  variant="ghost"
                  color="gray.400"
                  onClick={() => removeRow(i)}
                  disabled={rows.length <= 1}
                  w="32px"
                  flexShrink={0}
                >
                  ✕
                </Button>
              </Flex>
            ))}
          </VStack>

          <Flex mt={4} justify="space-between" align="center">
            <Button size="sm" variant="ghost" onClick={addRow}>
              + Add another row
            </Button>
            <Flex gap={2}>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowAdd(false);
                  setRows([{ ...EMPTY_ROW }]);
                  setErrorMsg(null);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                colorPalette="blue"
                onClick={handleSubmit}
                loading={saving}
                disabled={!rows.some((r) => r.name.trim() && r.startBar)}
              >
                Save {rows.filter((r) => r.name.trim() && r.startBar).length} section{rows.filter((r) => r.name.trim() && r.startBar).length !== 1 ? "s" : ""}
              </Button>
            </Flex>
          </Flex>
        </Box>
      )}

      {/* Edit Section Modal (keep modal for editing single sections) */}
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
