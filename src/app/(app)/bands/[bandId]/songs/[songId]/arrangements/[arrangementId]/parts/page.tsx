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
  const [instrumentName, setInstrumentName] = useState("");
  const [partName, setPartName] = useState("");
  const [isRequired, setIsRequired] = useState(true);

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
      onSuccess: () => {
        setShowAdd(false);
        setInstrumentName("");
        setPartName("");
      },
    }
  );

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

      <Dialog.Root open={showAdd} onOpenChange={(e) => setShowAdd(e.open)}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="440px">
            <Dialog.Header>
              <Dialog.Title>Add Part</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body>
              <form
                id="add-part-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  createPart.mutate({
                    instrumentName,
                    partName: partName || undefined,
                    isRequired,
                    displayOrder: (parts?.length ?? 0) + 1,
                  });
                }}
              >
                <VStack gap={4}>
                  <Field.Root>
                    <Field.Label>Instrument</Field.Label>
                    <Input
                      value={instrumentName}
                      onChange={(e) => setInstrumentName(e.target.value)}
                      placeholder="e.g. Electric Guitar"
                      required
                      autoFocus
                    />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>Part Name (optional)</Field.Label>
                    <Input
                      value={partName}
                      onChange={(e) => setPartName(e.target.value)}
                      placeholder="e.g. Guitar 1"
                    />
                  </Field.Root>
                  <Checkbox.Root
                    checked={isRequired}
                    onCheckedChange={(e) => setIsRequired(!!e.checked)}
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
                  onClick={() => setShowAdd(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="add-part-form"
                  colorPalette="blue"
                  flex={1}
                  loading={createPart.isPending}
                >
                  Add Part
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
