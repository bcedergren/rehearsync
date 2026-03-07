"use client";

import {
  Box,
  Button,
  Heading,
  Text,
  Table,
  NativeSelect,
} from "@chakra-ui/react";
import { useParams } from "next/navigation";
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
  const bandId = params.bandId as string;
  const arrangementId = params.arrangementId as string;

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

  const assignMutation = useApiMutation(
    `/arrangements/${arrangementId}/assignments`,
    "POST",
    { invalidateKeys: [["assignments", arrangementId]] }
  );

  function getAssignedPartId(memberId: string): string {
    if (selectedParts[memberId]) return selectedParts[memberId];
    const existing = assignments?.find((a) => a.member.id === memberId);
    return existing?.part.id || "";
  }

  function handleAssign(memberId: string) {
    const partId = getAssignedPartId(memberId);
    if (!partId) return;
    assignMutation.mutate({ memberId, partId });
  }

  return (
    <Box>
      <Heading size="lg" mb={6}>
        Assign Parts
      </Heading>

      {members && parts && (
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Member</Table.ColumnHeader>
              <Table.ColumnHeader>Instrument</Table.ColumnHeader>
              <Table.ColumnHeader>Assigned Part</Table.ColumnHeader>
              <Table.ColumnHeader></Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {members.map((member) => (
              <Table.Row key={member.id}>
                <Table.Cell>{member.displayName}</Table.Cell>
                <Table.Cell>
                  {member.defaultInstrument || "—"}
                </Table.Cell>
                <Table.Cell>
                  <NativeSelect.Root size="sm">
                    <NativeSelect.Field
                      value={getAssignedPartId(member.id)}
                      onChange={(e) =>
                        setSelectedParts((s) => ({
                          ...s,
                          [member.id]: e.target.value,
                        }))
                      }
                    >
                      <option value="">None</option>
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
                  <Button
                    size="xs"
                    colorPalette="blue"
                    onClick={() => handleAssign(member.id)}
                    loading={assignMutation.isPending}
                    disabled={!getAssignedPartId(member.id)}
                  >
                    Save
                  </Button>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      )}
    </Box>
  );
}
