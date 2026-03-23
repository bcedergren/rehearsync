"use client";

import {
  Box,
  Button,
  Card,
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
import { useApiQuery, useApiMutation, apiFetch } from "@/hooks/useApi";

interface Member {
  id: string;
  displayName: string;
  email: string;
  role: string;
  defaultInstrument: string | null;
  isActive: boolean;
}

interface InviteLink {
  id: string;
  code: string;
  expiresAt: string | null;
  maxUses: number | null;
  useCount: number;
  createdAt: string;
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

  const [inviteLinkUrl, setInviteLinkUrl] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  const { data: inviteLinks, refetch: refetchLinks } = useApiQuery<InviteLink[]>(
    ["inviteLinks", bandId],
    `/bands/${bandId}/invites`
  );

  async function generateInviteLink() {
    setGeneratingLink(true);
    try {
      const link = await apiFetch<InviteLink>(`/bands/${bandId}/invites`, {
        method: "POST",
        body: JSON.stringify({ expiresInHours: 168 }), // 7 days
      });
      const url = `${window.location.origin}/join/${link.code}`;
      setInviteLinkUrl(url);
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
      refetchLinks();
    } catch {
      // Silently fail — user can retry
    } finally {
      setGeneratingLink(false);
    }
  }

  async function sendEmailInvite() {
    if (!inviteEmail) return;
    setSendingEmail(true);
    try {
      await apiFetch<InviteLink>(`/bands/${bandId}/invites`, {
        method: "POST",
        body: JSON.stringify({ expiresInHours: 168, email: inviteEmail }),
      });
      setEmailSent(true);
      setInviteEmail("");
      setTimeout(() => setEmailSent(false), 3000);
      refetchLinks();
    } catch {
      // Silently fail
    } finally {
      setSendingEmail(false);
    }
  }

  const [revokingId, setRevokingId] = useState<string | null>(null);
  async function revokeLink(inviteId: string) {
    setRevokingId(inviteId);
    try {
      await apiFetch(`/bands/${bandId}/invites/${inviteId}`, { method: "DELETE" });
      await refetchLinks();
      if (inviteLinkUrl) setInviteLinkUrl("");
    } catch {
      await refetchLinks();
    } finally {
      setRevokingId(null);
    }
  }

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

      {/* Invite Link Card */}
      <Card.Root mb={6}>
        <Card.Body>
          <Flex
            justify="space-between"
            align={{ base: "start", sm: "center" }}
            direction={{ base: "column", sm: "row" }}
            gap={3}
            mb={inviteLinkUrl || (inviteLinks && inviteLinks.length > 0) ? 3 : 0}
          >
            <Box>
              <Heading size="sm">Invite Link</Heading>
              <Text fontSize="xs" color="gray.500">
                Share a link so musicians can join your band
              </Text>
            </Box>
            <Button
              size="sm"
              colorPalette="blue"
              variant="outline"
              loading={generatingLink}
              onClick={generateInviteLink}
              flexShrink={0}
            >
              {linkCopied ? "Copied!" : "Generate Link"}
            </Button>
          </Flex>

          {inviteLinkUrl && (
            <Flex
              bg="gray.50"
              borderRadius="md"
              p={3}
              align="center"
              gap={2}
              mb={3}
            >
              <Input
                value={inviteLinkUrl}
                readOnly
                size="sm"
                bg="white"
                flex={1}
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  await navigator.clipboard.writeText(inviteLinkUrl);
                  setLinkCopied(true);
                  setTimeout(() => setLinkCopied(false), 3000);
                }}
              >
                {linkCopied ? "Copied!" : "Copy"}
              </Button>
            </Flex>
          )}

          {/* Email invite */}
          <Box borderTop="1px solid" borderColor="gray.100" pt={3} mt={3}>
            <Text fontSize="xs" fontWeight="medium" color="gray.600" mb={2}>
              Or invite by email
            </Text>
            <Flex gap={2}>
              <Input
                type="email"
                size="sm"
                placeholder="musician@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                flex={1}
              />
              <Button
                size="sm"
                colorPalette={emailSent ? "green" : "blue"}
                onClick={sendEmailInvite}
                loading={sendingEmail}
                disabled={!inviteEmail}
              >
                {emailSent ? "Sent!" : "Send Invite"}
              </Button>
            </Flex>
          </Box>

          {inviteLinks && inviteLinks.length > 0 && (
            <Box>
              <Text fontSize="xs" color="gray.500" mb={2}>
                Active links ({inviteLinks.length})
              </Text>
              {inviteLinks.map((link) => (
                <Flex
                  key={link.id}
                  justify="space-between"
                  align="center"
                  py={1}
                  fontSize="sm"
                >
                  <Text color="gray.600" fontFamily="mono" fontSize="xs">
                    ...{link.code.slice(-6)}
                    {link.expiresAt && (
                      <Text as="span" color="gray.400" ml={2}>
                        expires {new Date(link.expiresAt).toLocaleDateString()}
                      </Text>
                    )}
                    {link.useCount > 0 && (
                      <Text as="span" color="gray.400" ml={2}>
                        ({link.useCount} used)
                      </Text>
                    )}
                  </Text>
                  <Button
                    size="xs"
                    variant="ghost"
                    colorPalette="red"
                    onClick={() => revokeLink(link.id)}
                    loading={revokingId === link.id}
                  >
                    Revoke
                  </Button>
                </Flex>
              ))}
            </Box>
          )}
        </Card.Body>
      </Card.Root>

      {/* Desktop table */}
      {members && members.length > 0 && (
        <Box display={{ base: "none", md: "block" }}>
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
        </Box>
      )}

      {/* Mobile card list */}
      {members && members.length > 0 && (
        <VStack gap={3} display={{ base: "flex", md: "none" }}>
          {members.map((m) => (
            <Card.Root
              key={m.id}
              w="full"
              cursor="pointer"
              _hover={{ shadow: "md" }}
              onClick={() => openEdit(m)}
            >
              <Card.Body p={4}>
                <Flex justify="space-between" align="start" mb={2}>
                  <Box>
                    <Text fontWeight="semibold" fontSize="sm" color="gray.800">
                      {m.displayName}
                    </Text>
                    <Text fontSize="xs" color="gray.500">{m.email}</Text>
                  </Box>
                  <Badge colorPalette={roleColor[m.role] || "gray"}>
                    {m.role}
                  </Badge>
                </Flex>
                {m.defaultInstrument && (
                  <Text fontSize="xs" color="gray.500">
                    {m.defaultInstrument}
                  </Text>
                )}
              </Card.Body>
            </Card.Root>
          ))}
        </VStack>
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
              {inviteMember.error && (
                <Text color="red.500" fontSize="sm" mt={3}>
                  {inviteMember.error.message}
                </Text>
              )}
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
                  colorPalette="blue"
                  flex={1}
                  loading={inviteMember.isPending}
                  disabled={!email || !displayName}
                  onClick={() => {
                    inviteMember.mutate({
                      email,
                      displayName,
                      role,
                      ...(instrument ? { defaultInstrument: instrument } : {}),
                    });
                  }}
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
              {updateMember.error && (
                <Text color="red.500" fontSize="sm" mt={3}>
                  {updateMember.error.message}
                </Text>
              )}
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
                  colorPalette="blue"
                  flex={1}
                  loading={updateMember.isPending}
                  disabled={!editDisplayName}
                  onClick={() => {
                    updateMember.mutate({
                      displayName: editDisplayName,
                      role: editRole,
                      ...(editInstrument ? { defaultInstrument: editInstrument } : {}),
                    });
                  }}
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
