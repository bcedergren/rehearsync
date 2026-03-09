"use client";

import {
  Box,
  Button,
  Card,
  Heading,
  Input,
  Text,
  Flex,
  Badge,
  Table,
  Spinner,
} from "@chakra-ui/react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useApiQuery, useApiMutation, apiFetch } from "@/hooks/useApi";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useSessionStore } from "@/stores/session.store";
import { AudioPlayer } from "@/components/audio/AudioPlayer";

interface AudioAsset {
  id: string;
  assetRole: string;
  stemName: string | null;
  storageObject: { objectKey: string; originalFileName: string };
}

interface Session {
  id: string;
  state: string;
  arrangement: { id: string; name: string; versionLabel: string };
  leader: { id: string; displayName: string };
  participants: {
    id: string;
    connectionState: string;
    member: { id: string; displayName: string };
    part: { id: string; instrumentName: string } | null;
  }[];
  transportState: {
    status: string;
    positionMs: number;
    currentBar: number | null;
  } | null;
}

export default function SessionControlPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  const { data: session, isLoading } = useApiQuery<Session>(
    ["session", sessionId],
    `/sessions/${sessionId}`
  );

  const arrangementId = session?.arrangement.id;
  const { data: audioAssets } = useApiQuery<AudioAsset[]>(
    ["audio", arrangementId || ""],
    `/arrangements/${arrangementId}/audio`,
    { enabled: !!arrangementId }
  );

  // Connect to WebSocket for real-time updates
  const { isConnected } = useWebSocket({
    sessionId,
    memberId: session?.leader.id || "",
    token: "client",
  });
  const wsTransport = useSessionStore((s) => s.transport);

  const playMutation = useApiMutation(
    `/sessions/${sessionId}/transport/play`,
    "POST",
    { invalidateKeys: [["session", sessionId]] }
  );

  const pauseMutation = useApiMutation(
    `/sessions/${sessionId}/transport/pause`,
    "POST",
    { invalidateKeys: [["session", sessionId]] }
  );

  const stopMutation = useApiMutation(
    `/sessions/${sessionId}/transport/stop`,
    "POST",
    { invalidateKeys: [["session", sessionId]] }
  );

  const endMutation = useApiMutation(
    `/sessions/${sessionId}/end`,
    "POST",
    { invalidateKeys: [["session", sessionId]] }
  );

  const [sessionLinkUrl, setSessionLinkUrl] = useState("");
  const [sessionLinkCopied, setSessionLinkCopied] = useState(false);
  const [generatingSessionLink, setGeneratingSessionLink] = useState(false);

  async function shareSessionLink() {
    setGeneratingSessionLink(true);
    try {
      const link = await apiFetch<{ code: string }>(
        `/sessions/${sessionId}/invite-link`
      );
      const url = `${window.location.origin}/join/${link.code}`;
      setSessionLinkUrl(url);
      await navigator.clipboard.writeText(url);
      setSessionLinkCopied(true);
      setTimeout(() => setSessionLinkCopied(false), 3000);
    } catch {
      // Silently fail
    } finally {
      setGeneratingSessionLink(false);
    }
  }

  if (isLoading || !session) return <Flex justify="center" align="center" minH="40vh"><Spinner size="lg" color="blue.500" /></Flex>;

  // Use WS transport if connected, otherwise fall back to API data
  const transport = isConnected
    ? { status: wsTransport.status, positionMs: wsTransport.positionMs, currentBar: wsTransport.currentBar }
    : session.transportState;
  const stateColor: Record<string, string> = {
    draft: "yellow",
    ready: "blue",
    live: "green",
    paused: "orange",
    ended: "gray",
  };

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={6}>
        <Box>
          <Heading size="lg">Session Control</Heading>
          <Text color="gray.500">
            {session.arrangement.name} {session.arrangement.versionLabel}
          </Text>
        </Box>
        <Flex gap={2} align="center">
          <Box
            w="8px"
            h="8px"
            borderRadius="full"
            bg={isConnected ? "green.400" : "gray.400"}
            title={isConnected ? "Live connected" : "Polling mode"}
          />
          <Badge colorPalette={stateColor[session.state] || "gray"} fontSize="md" p={2}>
            {session.state.toUpperCase()}
          </Badge>
          {session.state !== "ended" && (
            <>
              <Button
                size="sm"
                variant="outline"
                colorPalette="blue"
                loading={generatingSessionLink}
                onClick={shareSessionLink}
              >
                {sessionLinkCopied ? "Link Copied!" : "Share Session"}
              </Button>
              <Button
                colorPalette="red"
                variant="outline"
                size="sm"
                onClick={() => endMutation.mutate({})}
              >
                End Session
              </Button>
            </>
          )}
        </Flex>
      </Flex>

      {/* Transport Controls */}
      <Card.Root mb={6}>
        <Card.Body>
          <Heading size="sm" mb={4}>
            Transport
          </Heading>
          <Flex gap={3} align="center" mb={4}>
            <Button
              colorPalette="green"
              onClick={() =>
                playMutation.mutate({ positionMs: transport?.positionMs || 0 })
              }
              disabled={transport?.status === "playing"}
            >
              Play
            </Button>
            <Button
              colorPalette="yellow"
              onClick={() =>
                pauseMutation.mutate({
                  positionMs: transport?.positionMs || 0,
                })
              }
              disabled={transport?.status !== "playing"}
            >
              Pause
            </Button>
            <Button
              colorPalette="red"
              onClick={() => stopMutation.mutate({ positionMs: 0 })}
            >
              Stop
            </Button>
          </Flex>
          {transport && (
            <Flex gap={6}>
              <Text fontSize="sm">
                Status:{" "}
                <Text as="span" fontWeight="bold">
                  {transport.status}
                </Text>
              </Text>
              <Text fontSize="sm">
                Position:{" "}
                <Text as="span" fontWeight="bold">
                  {Math.floor(transport.positionMs / 1000)}s
                </Text>
              </Text>
              {transport.currentBar && (
                <Text fontSize="sm">
                  Bar:{" "}
                  <Text as="span" fontWeight="bold">
                    {transport.currentBar}
                  </Text>
                </Text>
              )}
            </Flex>
          )}
        </Card.Body>
      </Card.Root>

      {/* Session Share Link */}
      {sessionLinkUrl && (
        <Card.Root mb={6}>
          <Card.Body>
            <Heading size="sm" mb={2}>Session Link</Heading>
            <Flex gap={2} align="center">
              <Input
                value={sessionLinkUrl}
                readOnly
                size="sm"
                flex={1}
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  await navigator.clipboard.writeText(sessionLinkUrl);
                  setSessionLinkCopied(true);
                  setTimeout(() => setSessionLinkCopied(false), 3000);
                }}
              >
                {sessionLinkCopied ? "Copied!" : "Copy"}
              </Button>
            </Flex>
            <Text fontSize="xs" color="gray.500" mt={2}>
              Share this link with band members so they can join the session on their devices.
            </Text>
          </Card.Body>
        </Card.Root>
      )}

      {/* Audio Player */}
      {audioAssets && audioAssets.length > 0 && (
        <Card.Root mb={6}>
          <Card.Body>
            <Heading size="sm" mb={3}>
              Audio
            </Heading>
            <AudioPlayer
              tracks={audioAssets
                .filter((a) => a.storageObject?.objectKey)
                .map((a) => ({
                  id: a.id,
                  url: a.storageObject.objectKey,
                  label: a.stemName || a.assetRole.replace("_", " "),
                  role: a.assetRole,
                }))}
              positionMs={transport?.positionMs}
              transportStatus={transport?.status}
            />
          </Card.Body>
        </Card.Root>
      )}

      {/* Participants */}
      <Card.Root>
        <Card.Body>
          <Heading size="sm" mb={4}>
            Connected Musicians
          </Heading>
          {session.participants.length === 0 ? (
            <Text color="gray.500" fontSize="sm">
              No participants connected.
            </Text>
          ) : (
            <Table.Root size="sm">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Name</Table.ColumnHeader>
                  <Table.ColumnHeader>Part</Table.ColumnHeader>
                  <Table.ColumnHeader>Status</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {session.participants.map((p) => (
                  <Table.Row key={p.id}>
                    <Table.Cell>{p.member.displayName}</Table.Cell>
                    <Table.Cell>
                      {p.part?.instrumentName || "Unassigned"}
                    </Table.Cell>
                    <Table.Cell>
                      <Badge
                        colorPalette={
                          p.connectionState === "ready"
                            ? "green"
                            : p.connectionState === "connecting"
                              ? "yellow"
                              : "red"
                        }
                      >
                        {p.connectionState}
                      </Badge>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )}
        </Card.Body>
      </Card.Root>
    </Box>
  );
}
