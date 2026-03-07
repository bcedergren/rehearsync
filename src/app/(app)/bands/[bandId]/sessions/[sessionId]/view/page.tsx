"use client";

import {
  Box,
  Heading,
  Text,
  Badge,
  Flex,
  Card,
  VStack,
} from "@chakra-ui/react";
import { useParams } from "next/navigation";
import { useApiQuery } from "@/hooks/useApi";

interface MusicianView {
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
    fileType: string;
    storageObject: { originalFileName: string };
  } | null;
  audio: {
    id: string;
    assetRole: string;
    stemName: string | null;
  }[];
  sections: { id: string; name: string; startBar: number }[];
}

export default function MusicianViewPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  const { data: view, isLoading } = useApiQuery<MusicianView>(
    ["musician-view", sessionId],
    `/sessions/${sessionId}/me/view`,
    { refetchInterval: 3000 }
  );

  if (isLoading || !view) return <Text>Loading rehearsal view...</Text>;

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
        </Box>
        <Flex gap={2} align="center">
          <Badge
            colorPalette={stateColor[view.session.state] || "gray"}
            fontSize="sm"
            p={1}
          >
            {view.session.state}
          </Badge>
          {view.transport && (
            <Badge
              colorPalette={
                view.transport.status === "playing" ? "green" : "gray"
              }
              fontSize="sm"
              p={1}
            >
              {view.transport.status}
            </Badge>
          )}
        </Flex>
      </Flex>

      {/* Transport Info */}
      {view.transport && (
        <Card.Root mb={4}>
          <Card.Body>
            <Flex gap={6}>
              <Text fontSize="sm">
                Position:{" "}
                <Text as="span" fontWeight="bold">
                  {Math.floor(view.transport.positionMs / 1000)}s
                </Text>
              </Text>
              {view.transport.currentBar && (
                <Text fontSize="sm">
                  Bar:{" "}
                  <Text as="span" fontWeight="bold">
                    {view.transport.currentBar}
                  </Text>
                </Text>
              )}
            </Flex>
          </Card.Body>
        </Card.Root>
      )}

      {/* Score area placeholder */}
      <Card.Root mb={4} minH="400px">
        <Card.Body>
          {view.sheetMusic ? (
            <VStack>
              <Text fontWeight="semibold">
                {view.sheetMusic.storageObject.originalFileName}
              </Text>
              <Text color="gray.500" fontSize="sm">
                File type: {view.sheetMusic.fileType}
              </Text>
              <Box
                w="full"
                h="300px"
                bg="gray.100"
                borderRadius="md"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Text color="gray.400">
                  Score viewer will render here (OSMD / PDF)
                </Text>
              </Box>
            </VStack>
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
        <Card.Root>
          <Card.Body>
            <Heading size="sm" mb={2}>
              Sections
            </Heading>
            <Flex gap={2} flexWrap="wrap">
              {view.sections.map((s) => (
                <Badge key={s.id} p={2} colorPalette="blue" variant="outline">
                  {s.name} (Bar {s.startBar})
                </Badge>
              ))}
            </Flex>
          </Card.Body>
        </Card.Root>
      )}
    </Box>
  );
}
