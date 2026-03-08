"use client";

import {
  Box,
  Button,
  Heading,
  Text,
  Table,
  NativeSelect,
  Flex,
  Badge,
  Spinner,
} from "@chakra-ui/react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useApiQuery, useApiMutation } from "@/hooks/useApi";

interface Member {
  id: string;
  displayName: string;
  defaultInstrument: string | null;
}

interface Part {
  id: string;
  instrumentName: string;
  partName: string | null;
}

interface Assignment {
  id: string;
  member: { id: string; displayName: string };
  part: { id: string; instrumentName: string };
}

export default function AssignPage() {
  const params = useParams();
  const router = useRouter();
  const bandId = params.bandId as string;
  const songId = params.songId as string;
  const arrangementId = params.arrangementId as string;
  const basePath = `/bands/${bandId}/songs/${songId}/arrangements/${arrangementId}`;

  const { data: members } = useApiQuery<Member[]>(
    ["members", bandId],
    `/bands/${bandId}/members`
  );

  const { data: parts } = useApiQuery<Part[]>(
    ["parts", arrangementId],
    `/arrangements/${arrangementId}/parts`
  );

  const { data: assignments } = useApiQuery<Assignment[]>(
    ["assignments", arrangementId],
    `/arrangements/${arrangementId}/assignments`
  );

  const [selectedParts, setSelectedParts] = useState<Record<string, string>>(
    {}
  );
  const [savedMembers, setSavedMembers] = useState<Record<string, boolean>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const assignMutation = useApiMutation(
    `/arrangements/${arrangementId}/assignments`,
    "POST",
    {
      invalidateKeys: [
        ["assignments", arrangementId],
        ["arrangement", arrangementId],
      ],
    }
  );

  function getAssignedPartId(memberId: string): string {
    if (selectedParts[memberId] !== undefined) return selectedParts[memberId];
    const existing = assignments?.find((a) => a.member.id === memberId);
    return existing?.part.id || "";
  }

  function hasChanged(memberId: string): boolean {
    if (selectedParts[memberId] === undefined) return false;
    const existing = assignments?.find((a) => a.member.id === memberId);
    return selectedParts[memberId] !== (existing?.part.id || "");
  }

  async function handleAssign(memberId: string) {
    const partId = getAssignedPartId(memberId);
    if (!partId) return;
    setErrorMsg(null);
    try {
      await assignMutation.mutateAsync({ memberId, partId });
      setSavedMembers((s) => ({ ...s, [memberId]: true }));
      setSelectedParts((s) => {
        const next = { ...s };
        delete next[memberId];
        return next;
      });
      setTimeout(() => setSavedMembers((s) => ({ ...s, [memberId]: false })), 2000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save assignment");
    }
  }

  if (!members || !parts || !assignments) {
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
      <Heading size="lg" mb={2}>
        Assign Parts
      </Heading>
      <Text fontSize="sm" color="gray.500" mb={6}>
        Select a part for each member, then click Save.
      </Text>

      {errorMsg && (
        <Box bg="red.50" border="1px solid" borderColor="red.200" borderRadius="md" p={3} mb={4}>
          <Text fontSize="sm" color="red.600">{errorMsg}</Text>
        </Box>
      )}

      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Member</Table.ColumnHeader>
            <Table.ColumnHeader>Default Instrument</Table.ColumnHeader>
            <Table.ColumnHeader>Assigned Part</Table.ColumnHeader>
            <Table.ColumnHeader></Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {members.map((member) => {
            const currentPartId = getAssignedPartId(member.id);
            const changed = hasChanged(member.id);
            const saved = savedMembers[member.id];
            return (
              <Table.Row key={member.id}>
                <Table.Cell>
                  <Text fontWeight="medium">{member.displayName}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Text color="gray.500">{member.defaultInstrument || "—"}</Text>
                </Table.Cell>
                <Table.Cell>
                  <NativeSelect.Root size="sm">
                    <NativeSelect.Field
                      value={currentPartId}
                      onChange={(e) =>
                        setSelectedParts((s) => ({
                          ...s,
                          [member.id]: e.target.value,
                        }))
                      }
                    >
                      <option value="">— Select a part —</option>
                      {parts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.instrumentName}
                          {p.partName ? ` — ${p.partName}` : ""}
                        </option>
                      ))}
                    </NativeSelect.Field>
                  </NativeSelect.Root>
                </Table.Cell>
                <Table.Cell>
                  <Flex align="center" gap={2}>
                    {saved ? (
                      <Badge colorPalette="green" variant="subtle">Saved</Badge>
                    ) : (
                      <Button
                        size="xs"
                        colorPalette="blue"
                        onClick={() => handleAssign(member.id)}
                        loading={assignMutation.isPending}
                        disabled={!currentPartId || !changed}
                      >
                        Save
                      </Button>
                    )}
                  </Flex>
                </Table.Cell>
              </Table.Row>
            );
          })}
        </Table.Body>
      </Table.Root>
    </Box>
  );
}
