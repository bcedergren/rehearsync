"use client";

import {
  Box,
  Button,
  Card,
  Field,
  Flex,
  Heading,
  Input,
  Spinner,
  Text,
} from "@chakra-ui/react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useApiQuery, apiFetch } from "@/hooks/useApi";

interface InvitePreview {
  type: "band_invite" | "session_join";
  bandName: string;
  bandId: string;
  sessionId: string | null;
  alreadyMember: boolean;
}

export default function JoinPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [displayName, setDisplayName] = useState("");

  const { data: me } = useApiQuery<{ user: { name: string | null } }>(["me"], "/me");
  const { data: invite, isLoading, error: fetchError } = useApiQuery<InvitePreview>(
    ["invite", code],
    `/invites/${code}`
  );

  // Pre-fill display name from user profile
  const effectiveName = displayName || me?.user?.name || "";

  async function handleJoin() {
    setJoining(true);
    setError("");

    try {
      const result = await apiFetch<{ bandId: string; sessionId?: string; alreadyMember?: boolean }>(
        `/invites/${code}`,
        { method: "POST", body: JSON.stringify({ displayName: effectiveName }) }
      );

      if (result.sessionId) {
        router.push(`/bands/${result.bandId}/sessions/${result.sessionId}/view`);
      } else {
        router.push(`/bands/${result.bandId}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join");
      setJoining(false);
    }
  }

  if (isLoading) {
    return (
      <Flex justify="center" align="center" minH="60vh">
        <Spinner size="lg" color="blue.500" />
      </Flex>
    );
  }

  if (fetchError || !invite) {
    return (
      <Flex justify="center" align="center" minH="60vh">
        <Card.Root maxW="440px" w="full">
          <Card.Body textAlign="center" py={10}>
            <Heading size="md" mb={3}>
              Invalid Invite
            </Heading>
            <Text color="gray.500">
              {fetchError instanceof Error
                ? fetchError.message
                : "This invite link is invalid, expired, or has been revoked."}
            </Text>
            <Button mt={6} onClick={() => router.push("/dashboard")}>
              Go to Dashboard
            </Button>
          </Card.Body>
        </Card.Root>
      </Flex>
    );
  }

  // Already a member — show shortcut
  if (invite.alreadyMember) {
    const destination =
      invite.type === "session_join" && invite.sessionId
        ? `/bands/${invite.bandId}/sessions/${invite.sessionId}/view`
        : `/bands/${invite.bandId}`;

    return (
      <Flex justify="center" align="center" minH="60vh">
        <Card.Root maxW="440px" w="full">
          <Card.Body textAlign="center" py={10}>
            <Heading size="md" mb={3}>
              {invite.bandName}
            </Heading>
            <Text color="gray.500" mb={6}>
              {invite.type === "session_join"
                ? "You're already a member. Tap below to join the session."
                : "You're already a member of this band."}
            </Text>
            <Button
              colorPalette="blue"
              onClick={() => {
                if (invite.type === "session_join") {
                  handleJoin();
                } else {
                  router.push(destination);
                }
              }}
              loading={joining}
            >
              {invite.type === "session_join" ? "Join Session" : "Go to Band"}
            </Button>
          </Card.Body>
        </Card.Root>
      </Flex>
    );
  }

  // Band invite — confirm join
  if (invite.type === "band_invite") {
    return (
      <Flex justify="center" align="center" minH="60vh">
        <Card.Root maxW="440px" w="full">
          <Card.Body textAlign="center" py={10}>
            <Heading size="md" mb={2}>
              You&apos;ve been invited
            </Heading>
            <Text fontSize="lg" fontWeight="bold" color="blue.600" mb={1}>
              {invite.bandName}
            </Text>
            <Text color="gray.500" mb={6}>
              Join this band to access songs, arrangements, and rehearsals.
            </Text>
            <Box mb={5} textAlign="left">
              <Field.Root>
                <Field.Label fontSize="sm" color="gray.600">Display Name</Field.Label>
                <Input
                  value={displayName || me?.user?.name || ""}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="How you'll appear in the band"
                  size="lg"
                />
              </Field.Root>
            </Box>
            {error && (
              <Box mb={4} p={3} bg="red.50" borderRadius="md" border="1px solid" borderColor="red.200">
                <Text color="red.600" fontSize="sm">{error}</Text>
              </Box>
            )}
            <Flex gap={3} justify="center">
              <Button variant="outline" onClick={() => router.push("/dashboard")}>
                Decline
              </Button>
              <Button
                colorPalette="blue"
                loading={joining}
                onClick={handleJoin}
              >
                Join Band
              </Button>
            </Flex>
          </Card.Body>
        </Card.Root>
      </Flex>
    );
  }

  // Session join — but not a member
  return (
    <Flex justify="center" align="center" minH="60vh">
      <Card.Root maxW="440px" w="full">
        <Card.Body textAlign="center" py={10}>
          <Heading size="md" mb={3}>
            Session Invite
          </Heading>
          <Text color="gray.500" mb={6}>
            You need to be a member of <strong>{invite.bandName}</strong> to join
            this session. Ask the band leader for a band invite link.
          </Text>
          <Button onClick={() => router.push("/dashboard")}>
            Go to Dashboard
          </Button>
        </Card.Body>
      </Card.Root>
    </Flex>
  );
}
