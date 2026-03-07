"use client";

import {
  Box,
  Button,
  Heading,
  Text,
  Table,
  Badge,
  Flex,
  VStack,
  Field,
  Input,
  NativeSelect,
  Dialog,
  CloseButton,
  Spinner,
} from "@chakra-ui/react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useApiQuery, useApiMutation } from "@/hooks/useApi";

interface Member {
  id: string;
  displayName: string;
  email: string;
  role: string;
  defaultInstrument: string | null;
  isActive: boolean;
}

export default function MembersPage() {
  const params = useParams();
  const bandId = params.bandId as string;

  const { data: members, isLoading } = useApiQuery<Member[]>(
    ["members", bandId],
    `/bands/${bandId}/members`
  );

  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState("musician");
  const [instrument, setInstrument] = useState("");

  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editRole, setEditRole] = useState("musician");
  const [editInstrument, setEditInstrument] = useState("");

  function openEdit(member: Member) {
    setEditingMember(member);
    setEditDisplayName(member.displayName);
    setEditRole(member.role);
    setEditInstrument(member.defaultInstrument || "");
  }

  const inviteMember = useApiMutation(
    `/bands/${bandId}/members`,
    "POST",
    {
      invalidateKeys: [["members", bandId]],
      onSuccess: () => {
        setShowInvite(false);
        setEmail("");
        setDisplayName("");
        setInstrument("");
      },
    }
  );

  const updateMember = useApiMutation(
    editingMember ? `/bands/${bandId}/members/${editingMember.id}` : "",
    "PATCH",
    {
      invalidateKeys: [["members", bandId]],
      onSuccess: () => setEditingMember(null),
    }
  );

  if (isLoading) return <Flex justify="center" align="center" minH="40vh"><Spinner size="lg" color="blue.500" /></Flex>;

  const roleColor: Record<string, string> = {
    leader: "purple",
    admin: "blue",
    musician: "gray",
  };

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg">Members</Heading>
        <Button
          colorPalette="blue"
          size="sm"
          onClick={() => setShowInvite(true)}
        >
          Invite Member
        </Button>
      </Flex>

      {members && members.length > 0 && (
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Name</Table.ColumnHeader>
              <Table.ColumnHeader>Email</Table.ColumnHeader>
              <Table.ColumnHeader>Role</Table.ColumnHeader>
              <Table.ColumnHeader>Instrument</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {members.map((m) => (
              <Table.Row
                key={m.id}
                cursor="pointer"
                _hover={{ bg: "gray.50" }}
                onClick={() => openEdit(m)}
              >
                <Table.Cell>{m.displayName}</Table.Cell>
                <Table.Cell>{m.email}</Table.Cell>
                <Table.Cell>
                  <Badge colorPalette={roleColor[m.role] || "gray"}>
                    {m.role}
                  </Badge>
                </Table.Cell>
                <Table.Cell>{m.defaultInstrument || "—"}</Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      )}

      <Dialog.Root open={showInvite} onOpenChange={(e) => setShowInvite(e.open)}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="440px">
            <Dialog.Header>
              <Dialog.Title>Invite Member</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body>
              <form
                id="invite-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  inviteMember.mutate({
                    email,
                    displayName,
                    role,
                    ...(instrument ? { defaultInstrument: instrument } : {}),
                  });
                }}
              >
                <VStack gap={4}>
                  <Field.Root>
                    <Field.Label>Email</Field.Label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                    />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>Display Name</Field.Label>
                    <Input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required
                    />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>Role</Field.Label>
                    <NativeSelect.Root>
                      <NativeSelect.Field
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                      >
                        <option value="musician">Musician</option>
                        <option value="admin">Admin</option>
                        <option value="leader">Leader</option>
                      </NativeSelect.Field>
                    </NativeSelect.Root>
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>Default Instrument (optional)</Field.Label>
                    <Input
                      value={instrument}
                      onChange={(e) => setInstrument(e.target.value)}
                      placeholder="e.g. Bass"
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
                  onClick={() => setShowInvite(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="invite-form"
                  colorPalette="blue"
                  flex={1}
                  loading={inviteMember.isPending}
                >
                  Invite
                </Button>
              </Flex>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* Edit Member Modal */}
      <Dialog.Root open={!!editingMember} onOpenChange={(e) => { if (!e.open) setEditingMember(null); }}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="440px">
            <Dialog.Header>
              <Dialog.Title>Edit Member</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body>
              <form
                id="edit-member-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  updateMember.mutate({
                    displayName: editDisplayName,
                    role: editRole,
                    ...(editInstrument ? { defaultInstrument: editInstrument } : {}),
                  });
                }}
              >
                <VStack gap={4}>
                  <Field.Root>
                    <Field.Label>Display Name</Field.Label>
                    <Input
                      value={editDisplayName}
                      onChange={(e) => setEditDisplayName(e.target.value)}
                      required
                      autoFocus
                    />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>Role</Field.Label>
                    <NativeSelect.Root>
                      <NativeSelect.Field
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                      >
                        <option value="musician">Musician</option>
                        <option value="admin">Admin</option>
                        <option value="leader">Leader</option>
                      </NativeSelect.Field>
                    </NativeSelect.Root>
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>Default Instrument (optional)</Field.Label>
                    <Input
                      value={editInstrument}
                      onChange={(e) => setEditInstrument(e.target.value)}
                      placeholder="e.g. Bass"
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
                  onClick={() => setEditingMember(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="edit-member-form"
                  colorPalette="blue"
                  flex={1}
                  loading={updateMember.isPending}
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
