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
  Checkbox,
  Dialog,
  CloseButton,
  Spinner,
} from "@chakra-ui/react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useApiQuery, useApiMutation } from "@/hooks/useApi";

interface Part {
  id: string;
  instrumentName: string;
  partName: string | null;
  transposition: string | null;
  displayOrder: number;
  isRequired: boolean;
}

export default function PartsPage() {
  const params = useParams();
  const arrangementId = params.arrangementId as string;

  const { data: parts, isLoading } = useApiQuery<Part[]>(
    ["parts", arrangementId],
    `/arrangements/${arrangementId}/parts`
  );

  const [showAdd, setShowAdd] = useState(false);

  interface PartRow {
    instrumentName: string;
    partName: string;
    isRequired: boolean;
  }
  const emptyRow = (): PartRow => ({ instrumentName: "", partName: "", isRequired: true });
  const [partRows, setPartRows] = useState<PartRow[]>([emptyRow()]);

  function updateRow(index: number, field: keyof PartRow, value: string | boolean) {
    setPartRows((rows) =>
      rows.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  }
  function addRow() {
    setPartRows((rows) => [...rows, emptyRow()]);
  }
  function removeRow(index: number) {
    setPartRows((rows) => rows.filter((_, i) => i !== index));
  }

  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [editInstrumentName, setEditInstrumentName] = useState("");
  const [editPartName, setEditPartName] = useState("");
  const [editIsRequired, setEditIsRequired] = useState(true);

  function openEdit(part: Part) {
    setEditingPart(part);
    setEditInstrumentName(part.instrumentName);
    setEditPartName(part.partName || "");
    setEditIsRequired(part.isRequired);
  }

  const createPart = useApiMutation(
    `/arrangements/${arrangementId}/parts`,
    "POST",
    {
      invalidateKeys: [["parts", arrangementId]],
    }
  );

  async function handleAddParts(e: React.FormEvent) {
    e.preventDefault();
    const validRows = partRows.filter((r) => r.instrumentName.trim());
    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      await createPart.mutateAsync({
        instrumentName: row.instrumentName.trim(),
        partName: row.partName.trim() || undefined,
        isRequired: row.isRequired,
        displayOrder: (parts?.length ?? 0) + i + 1,
      });
    }
    setShowAdd(false);
    setPartRows([emptyRow()]);
  }

  const updatePart = useApiMutation(
    editingPart ? `/arrangements/${arrangementId}/parts/${editingPart.id}` : "",
    "PATCH",
    {
      invalidateKeys: [["parts", arrangementId]],
      onSuccess: () => setEditingPart(null),
    }
  );

  if (isLoading) return <Flex justify="center" align="center" minH="40vh"><Spinner size="lg" color="blue.500" /></Flex>;

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg">Parts</Heading>
        <Button
          colorPalette="blue"
          size="sm"
          onClick={() => setShowAdd(true)}
        >
          Add Part
        </Button>
      </Flex>

      {parts && parts.length > 0 && (
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Order</Table.ColumnHeader>
              <Table.ColumnHeader>Instrument</Table.ColumnHeader>
              <Table.ColumnHeader>Part Name</Table.ColumnHeader>
              <Table.ColumnHeader>Required</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {parts.map((part) => (
              <Table.Row
                key={part.id}
                cursor="pointer"
                _hover={{ bg: "gray.50" }}
                onClick={() => openEdit(part)}
              >
                <Table.Cell>{part.displayOrder}</Table.Cell>
                <Table.Cell>{part.instrumentName}</Table.Cell>
                <Table.Cell>{part.partName || "—"}</Table.Cell>
                <Table.Cell>{part.isRequired ? "Yes" : "No"}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      )}

      <Dialog.Root open={showAdd} onOpenChange={(e) => { if (!e.open) { setShowAdd(false); setPartRows([emptyRow()]); } }}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="640px">
            <Dialog.Header>
              <Dialog.Title>Add Parts</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body>
              <form id="add-part-form" onSubmit={handleAddParts}>
                <VStack gap={3} align="stretch">
                  {/* Column headers */}
                  <Flex gap={2} px={1}>
                    <Text fontSize="xs" fontWeight="semibold" color="gray.500" flex={2}>Instrument *</Text>
                    <Text fontSize="xs" fontWeight="semibold" color="gray.500" flex={2}>Part Name</Text>
                    <Text fontSize="xs" fontWeight="semibold" color="gray.500" w="70px" textAlign="center">Required</Text>
                    <Box w="32px" />
                  </Flex>
                  {partRows.map((row, i) => (
                    <Flex key={i} gap={2} align="center">
                      <Input
                        flex={2}
                        size="sm"
                        value={row.instrumentName}
                        onChange={(e) => updateRow(i, "instrumentName", e.target.value)}
                        placeholder="e.g. Electric Guitar"
                        required
                        autoFocus={i === 0}
                      />
                      <Input
                        flex={2}
                        size="sm"
                        value={row.partName}
                        onChange={(e) => updateRow(i, "partName", e.target.value)}
                        placeholder="e.g. Guitar 1"
                      />
                      <Flex w="70px" justify="center">
                        <Checkbox.Root
                          checked={row.isRequired}
                          onCheckedChange={(e) => updateRow(i, "isRequired", !!e.checked)}
                        >
                          <Checkbox.HiddenInput />
                          <Checkbox.Control />
                        </Checkbox.Root>
                      </Flex>
                      <Button
                        size="xs"
                        variant="ghost"
                        colorPalette="red"
                        w="32px"
                        minW="32px"
                        disabled={partRows.length === 1}
                        onClick={() => removeRow(i)}
                      >
                        ✕
                      </Button>
                    </Flex>
                  ))}
                  <Button
                    size="sm"
                    variant="ghost"
                    colorPalette="blue"
                    alignSelf="flex-start"
                    onClick={addRow}
                  >
                    + Add another part
                  </Button>
                </VStack>
              </form>
            </Dialog.Body>
            <Dialog.Footer>
              <Flex gap={3} w="full">
                <Button
                  variant="outline"
                  flex={1}
                  onClick={() => { setShowAdd(false); setPartRows([emptyRow()]); }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="add-part-form"
                  colorPalette="blue"
                  flex={1}
                  loading={createPart.isPending}
                  disabled={!partRows.some((r) => r.instrumentName.trim())}
                >
                  Add {partRows.filter((r) => r.instrumentName.trim()).length === 1 ? "Part" : `${partRows.filter((r) => r.instrumentName.trim()).length} Parts`}
                </Button>
              </Flex>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* Edit Part Modal */}
      <Dialog.Root open={!!editingPart} onOpenChange={(e) => { if (!e.open) setEditingPart(null); }}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="440px">
            <Dialog.Header>
              <Dialog.Title>Edit Part</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body>
              <form
                id="edit-part-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  updatePart.mutate({
                    instrumentName: editInstrumentName,
                    partName: editPartName || undefined,
                    isRequired: editIsRequired,
                  });
                }}
              >
                <VStack gap={4}>
                  <Field.Root>
                    <Field.Label>Instrument</Field.Label>
                    <Input
                      value={editInstrumentName}
                      onChange={(e) => setEditInstrumentName(e.target.value)}
                      required
                      autoFocus
                    />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>Part Name (optional)</Field.Label>
                    <Input
                      value={editPartName}
                      onChange={(e) => setEditPartName(e.target.value)}
                    />
                  </Field.Root>
                  <Checkbox.Root
                    checked={editIsRequired}
                    onCheckedChange={(e) => setEditIsRequired(!!e.checked)}
                  >
                    <Checkbox.HiddenInput />
                    <Checkbox.Control />
                    <Checkbox.Label>Required part</Checkbox.Label>
                  </Checkbox.Root>
                </VStack>
              </form>
            </Dialog.Body>
            <Dialog.Footer>
              <Flex gap={3} w="full">
                <Button
                  variant="outline"
                  flex={1}
                  onClick={() => setEditingPart(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="edit-part-form"
                  colorPalette="blue"
                  flex={1}
                  loading={updatePart.isPending}
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
