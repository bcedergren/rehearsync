"use client";

import {
  Box,
  Heading,
  Text,
  Badge,
  Flex,
  Card,
} from "@chakra-ui/react";
import { useParams } from "next/navigation";
import { useState, useCallback, useRef, useMemo } from "react";
import { useApiQuery } from "@/hooks/useApi";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useSessionStore } from "@/stores/session.store";
import dynamic from "next/dynamic";
const SheetMusicViewer = dynamic(
  () => import("@/components/sheet-music/SheetMusicViewer").then((m) => m.SheetMusicViewer),
  { ssr: false }
);
const AudioPlayer = dynamic(
  () => import("@/components/audio/AudioPlayer").then((m) => m.AudioPlayer),
  { ssr: false }
);

interface MusicianView {
  memberId: string;
  displayName: string;
  session: { id: string; state: string };
  transport: {
    status: string;
    positionMs: number;
    currentBar: number | null;
  } | null;
  assignment: {
    partId: string;
    instrumentName: string;
    partName: string | null;
  } | null;
  sheetMusic: {
    id: string;
    fileType: "pdf" | "musicxml";
    storageObject: { originalFileName: string; objectKey: string };
  } | null;
  myStemTrackId: string | null;
  audio: {
    id: string;
    assetRole: string;
    stemName: string | null;
    storageObject: { objectKey: string; originalFileName: string };
  }[];
  syncMap: {
    id: string;
    points: { barNumber: number; timeMs: number }[];
  } | null;
  sections: { id: string; name: string; startBar: number }[];
}

export default function MusicianViewPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  const { data: view, isLoading } = useApiQuery<MusicianView>(
    ["musician-view", sessionId],
    `/sessions/${sessionId}/me/view`,
    { refetchInterval: 10000 }
  );

  // Connect to WebSocket for real-time transport updates
  const { isConnected } = useWebSocket({
    sessionId,
    memberId: view?.memberId || "",
    token: "client",
  });

  // Real-time transport from Zustand store (updated by WS)
  const wsTransport = useSessionStore((s) => s.transport);

  // Section seek state
  const [seekTo, setSeekTo] = useState<[number, number]>();
  const seekCounter = useRef(0);

  // Build bar → timeMs lookup from syncMap
  const barToTimeMs = useMemo(() => {
    if (!view?.syncMap?.points?.length) return null;
    const map = new Map<number, number>();
    for (const p of view.syncMap.points) {
      map.set(p.barNumber, p.timeMs);
    }
    return map;
  }, [view?.syncMap]);

  const handleSectionClick = useCallback((startBar: number) => {
    if (!barToTimeMs) return;
    let timeMs = barToTimeMs.get(startBar);
    if (timeMs == null) {
      // Find nearest preceding bar
      const sortedBars = [...barToTimeMs.entries()].sort((a, b) => a[0] - b[0]);
      for (const [bar, ms] of sortedBars) {
        if (bar <= startBar) timeMs = ms;
        else break;
      }
    }
    if (timeMs != null) {
      seekCounter.current++;
      setSeekTo([timeMs, seekCounter.current]);
    }
  }, [barToTimeMs]);

  if (isLoading || !view) return <Text>Loading rehearsal view...</Text>;

  // Use WS transport if connected, otherwise fall back to API data
  const transport = isConnected
    ? { status: wsTransport.status, positionMs: wsTransport.positionMs, currentBar: wsTransport.currentBar }
    : view.transport;

  // Determine active section based on current bar
  const activeSection = (() => {
    if (!transport?.currentBar) return null;
    for (let i = view.sections.length - 1; i >= 0; i--) {
      if (transport.currentBar >= view.sections[i].startBar) {
        return view.sections[i].id;
      }
    }
    return null;
  })();

  const stateColor: Record<string, string> = {
    draft: "yellow",
    ready: "blue",
    live: "green",
    paused: "orange",
    ended: "gray",
  };

  return (
    <Box>
      {/* Header bar */}
      <Flex justify="space-between" align="center" mb={4}>
        <Box>
          <Heading size="lg">
            {view.assignment?.instrumentName || "No part assigned"}
          </Heading>
          {view.assignment?.partName && (
            <Text color="gray.500">{view.assignment.partName}</Text>
          )}
          {!view.assignment && (
            <Text color="gray.400" fontSize="sm">
              You haven&apos;t been assigned a part for this session yet.
            </Text>
          )}
        </Box>
        <Flex gap={2} align="center">
          <Box
            w="8px"
            h="8px"
            borderRadius="full"
            bg={isConnected ? "green.400" : "gray.400"}
            title={isConnected ? "Live connected" : "Polling mode"}
          />
          <Badge
            colorPalette={stateColor[view.session.state] || "gray"}
            fontSize="sm"
            p={1}
          >
            {view.session.state}
          </Badge>
        </Flex>
      </Flex>

      {/* Score viewer */}
      <Card.Root mb={4} minH="400px">
        <Card.Body>
          {view.sheetMusic ? (
            <SheetMusicViewer
              fileUrl={`/api/v1/files/${view.sheetMusic.storageObject.objectKey}`}
              fileType={view.sheetMusic.fileType}
              fileName={view.sheetMusic.storageObject.originalFileName}
              currentBar={transport?.currentBar}
            />
          ) : (
            <Flex
              h="300px"
              align="center"
              justify="center"
              bg="gray.50"
              borderRadius="md"
            >
              <Text color="gray.400">
                No chart assigned for your part.
              </Text>
            </Flex>
          )}
        </Card.Body>
      </Card.Root>

      {/* Section markers */}
      {view.sections.length > 0 && (
        <Card.Root mb={4}>
          <Card.Body>
            <Heading size="sm" mb={2}>
              Sections
            </Heading>
            <Flex gap={2} flexWrap="wrap">
              {view.sections.map((s) => (
                <Badge
                  key={s.id}
                  p={2}
                  colorPalette="blue"
                  variant={activeSection === s.id ? "solid" : "outline"}
                  cursor={barToTimeMs ? "pointer" : "default"}
                  _hover={barToTimeMs ? { opacity: 0.8 } : undefined}
                  onClick={() => handleSectionClick(s.startBar)}
                >
                  {s.name} (Bar {s.startBar})
                </Badge>
              ))}
            </Flex>
          </Card.Body>
        </Card.Root>
      )}

      {/* Audio player */}
      {view.audio.length > 0 ? (
        <Card.Root mb={4}>
          <Card.Body>
            <Heading size="sm" mb={3}>
              Audio
            </Heading>
            <AudioPlayer
              tracks={view.audio.map((a) => ({
                id: a.id,
                url: a.storageObject.objectKey,
                label: a.stemName || a.assetRole.replace("_", " "),
                role: a.assetRole,
              }))}
              defaultSoloTrackIds={view.myStemTrackId ? [view.myStemTrackId] : undefined}
              seekTo={seekTo}
              positionMs={transport?.positionMs}
              transportStatus={transport?.status}
            />
          </Card.Body>
        </Card.Root>
      ) : (
        <Card.Root mb={4}>
          <Card.Body>
            <Flex h="100px" align="center" justify="center" bg="gray.50" borderRadius="md">
              <Text color="gray.400">No audio available for this session.</Text>
            </Flex>
          </Card.Body>
        </Card.Root>
      )}
    </Box>
  );
}
