"use client";

import {
  Box,
  Button,
  Card,
  Heading,
  Text,
  VStack,
  Badge,
  Flex,
  SimpleGrid,
  Table,
  Dialog,
  CloseButton,
  Field,
  Input,
  NativeSelect,
  Spinner,
  Checkbox,
} from "@chakra-ui/react";
import { useParams, useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import { useApiQuery, useApiMutation } from "@/hooks/useApi";
import { useUpload } from "@/hooks/useUpload";
import { useProcessingJob } from "@/hooks/useProcessingJob";
import { FileDropzone } from "@/components/uploads/FileDropzone";
import { SheetMusicViewer } from "@/components/sheet-music/SheetMusicViewer";
import { AudioPlayer } from "@/components/audio/AudioPlayer";
import { useQueryClient } from "@tanstack/react-query";

interface Part {
  id: string;
  instrumentName: string;
  partName: string | null;
  isRequired: boolean;
  displayOrder: number;
  sheetMusicAssets: {
    id: string;
    fileType: string;
    storageObject: { objectKey: string; originalFileName: string };
  }[];
  assignments: { member: { id: string; displayName: string } }[];
}

interface Readiness {
  isReady: boolean;
  checks: {
    published: boolean;
    requiredPartsAssigned: boolean;
    activeChartsPresent: boolean;
    activeBackingTrackPresent: boolean;
    activeSyncMapPresent: boolean;
  };
}

interface Arrangement {
  id: string;
  name: string;
  versionLabel: string;
  status: string;
  parts: Part[];
  sheetMusicAssets: { id: string; fileType: string; partId: string }[];
  audioAssets: {
    id: string;
    assetRole: string;
    stemName: string | null;
    storageObject: { objectKey: string; originalFileName: string };
  }[];
  assignments: {
    id: string;
    member: { id: string; displayName: string };
    part: { id: string; instrumentName: string };
  }[];
  sectionMarkers: { id: string; name: string; startBar: number }[];
  song: { id: string; title: string; bandId: string };
}

// --- Step config (reordered: audio first to support AI pipeline) ---

const STEP_CONFIG = [
  {
    key: "audio",
    label: "Upload Audio",
    description: "Add a full mix, backing track, click, or stems",
    icon: "1",
    action: "upload-audio",
    actionLabel: "Upload Audio",
  },
  {
    key: "parts",
    label: "Define Parts",
    description: "Add instrument parts to this arrangement",
    icon: "2",
    action: "parts",
    actionLabel: "Manage Parts",
  },
  {
    key: "charts",
    label: "Upload Charts",
    description: "Upload sheet music (PDF or MusicXML) for each part",
    icon: "3",
    action: "upload-sheet-music",
    actionLabel: "Upload Sheet Music",
  },
  {
    key: "assign",
    label: "Assign Parts",
    description: "Assign band members to their instrument parts",
    icon: "4",
    action: "assign",
    actionLabel: "Assign Members",
  },
  {
    key: "sections",
    label: "Mark Sections",
    description: "Define song sections (Intro, Verse, Chorus, etc.)",
    icon: "5",
    action: "sections",
    actionLabel: "Edit Sections",
  },
  {
    key: "syncMap",
    label: "Create Sync Map",
    description: "Map audio timestamps to bar numbers for score following",
    icon: "6",
    action: "sync-map",
    actionLabel: "Edit Sync Map",
  },
];

export default function ArrangementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bandId = params.bandId as string;
  const songId = params.songId as string;
  const arrangementId = params.arrangementId as string;

  const { data: arrangement, isLoading } = useApiQuery<Arrangement>(
    ["arrangement", arrangementId],
    `/arrangements/${arrangementId}`
  );

  const { data: readiness } = useApiQuery<Readiness>(
    ["readiness", arrangementId],
    `/arrangements/${arrangementId}/readiness`
  );

  const publishMutation = useApiMutation(
    `/arrangements/${arrangementId}/publish`,
    "POST",
    { invalidateKeys: [["arrangement", arrangementId], ["readiness", arrangementId]] }
  );

  // Preview sheet music state
  const [previewAsset, setPreviewAsset] = useState<{
    objectKey: string;
    fileType: string;
    fileName: string;
  } | null>(null);

  // Upload Sheet Music state
  const [showUploadSheet, setShowUploadSheet] = useState(false);
  const [sheetFile, setSheetFile] = useState<File | null>(null);
  const [sheetPartId, setSheetPartId] = useState("");
  const {
    isUploading: isUploadingSheet,
    progress: sheetProgress,
    error: sheetUploadError,
    upload: uploadSheet,
  } = useUpload();

  const { data: parts } = useApiQuery<Part[]>(
    ["parts", arrangementId],
    `/arrangements/${arrangementId}/parts`
  );

  const createSheetAsset = useApiMutation(
    `/arrangements/${arrangementId}/sheet-music`,
    "POST",
    {
      invalidateKeys: [["arrangement", arrangementId], ["readiness", arrangementId]],
      onSuccess: () => {
        setShowUploadSheet(false);
        setSheetFile(null);
        setSheetPartId("");
      },
    }
  );

  function detectFileType(f: File): "musicxml" | "pdf" {
    if (f.name.endsWith(".pdf") || f.type === "application/pdf") return "pdf";
    return "musicxml";
  }

  async function handleSheetSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sheetFile || !sheetPartId) return;
    const storageObjectId = await uploadSheet(sheetFile, bandId, "sheet_music");
    if (!storageObjectId) return;
    createSheetAsset.mutate({
      partId: sheetPartId,
      storageObjectId,
      fileType: detectFileType(sheetFile),
    });
  }

  // Upload Audio state
  const [showUploadAudio, setShowUploadAudio] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [assetRole, setAssetRole] = useState("full_mix");
  const [stemName, setStemName] = useState("");
  const [copyrightAck, setCopyrightAck] = useState(false);
  const {
    isUploading: isUploadingAudio,
    progress: audioProgress,
    error: audioUploadError,
    upload: uploadAudio,
  } = useUpload();

  const createAudioAsset = useApiMutation(
    `/arrangements/${arrangementId}/audio`,
    "POST",
    {
      invalidateKeys: [["arrangement", arrangementId], ["readiness", arrangementId]],
      onSuccess: () => {
        setShowUploadAudio(false);
        setAudioFile(null);
        setAssetRole("full_mix");
        setStemName("");
        setCopyrightAck(false);
      },
    }
  );

  async function handleAudioSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!audioFile) return;
    const storageObjectId = await uploadAudio(audioFile, bandId, "audio");
    if (!storageObjectId) return;
    createAudioAsset.mutate({
      storageObjectId,
      assetRole,
      ...(assetRole === "stem" && stemName ? { stemName } : {}),
    });
  }

  // AI Processing state
  const queryClient = useQueryClient();
  const handleProcessingComplete = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["arrangement", arrangementId] });
    queryClient.invalidateQueries({ queryKey: ["readiness", arrangementId] });
  }, [queryClient, arrangementId]);

  const {
    isProcessing: isStemProcessing,
    error: stemProcessingError,
    startJob: startStemSeparation,
  } = useProcessingJob(handleProcessingComplete);

  const {
    isProcessing: isBeatProcessing,
    error: beatProcessingError,
    startJob: startBeatDetection,
  } = useProcessingJob(handleProcessingComplete);

  const {
    isProcessing: isTranscribing,
    error: transcriptionError,
    startJob: startTranscription,
  } = useProcessingJob(handleProcessingComplete);

  // Stem-to-Part mapping state
  const [stemMappings, setStemMappings] = useState<
    Record<string, { checked: boolean; instrumentName: string }>
  >({});

  const createPartMutation = useApiMutation(
    `/arrangements/${arrangementId}/parts`,
    "POST",
    {
      invalidateKeys: [
        ["arrangement", arrangementId],
        ["parts", arrangementId],
        ["readiness", arrangementId],
      ],
    }
  );

  async function handleCreatePartsFromStems() {
    const entries = Object.entries(stemMappings).filter(
      ([, v]) => v.checked && v.instrumentName.trim()
    );
    for (const [, mapping] of entries) {
      createPartMutation.mutate({
        instrumentName: mapping.instrumentName,
        isRequired: true,
      });
    }
    setStemMappings({});
  }

  if (isLoading || !arrangement) {
    return (
      <Flex justify="center" align="center" minH="60vh">
        <Spinner size="lg" color="blue.500" />
      </Flex>
    );
  }

  const basePath = `/bands/${bandId}/songs/${songId}/arrangements/${arrangementId}`;

  const statusConfig: Record<string, { color: string; label: string }> = {
    draft: { color: "yellow", label: "Draft" },
    published: { color: "green", label: "Published" },
    archived: { color: "gray", label: "Archived" },
  };
  const status = statusConfig[arrangement.status] || statusConfig.draft;

  // Derived state
  const fullMix = arrangement.audioAssets.find((a) => a.assetRole === "full_mix");
  const stems = arrangement.audioAssets.filter((a) => a.assetRole === "stem");
  const hasStems = stems.length > 0;
  const hasParts = arrangement.parts.length > 0;
  const hasCharts = arrangement.parts.some((p) => p.sheetMusicAssets.length > 0);
  const hasAudio = arrangement.audioAssets.length > 0;
  const hasAssignments = arrangement.parts.some((p) => p.assignments.length > 0);
  const hasSections = arrangement.sectionMarkers.length > 0;
  const hasSyncMap = readiness?.checks.activeSyncMapPresent ?? false;

  // New step order: audio, parts, charts, assign, sections, syncMap
  const stepStatus = [hasAudio, hasParts, hasCharts, hasAssignments, hasSections, hasSyncMap];
  const completedSteps = stepStatus.filter(Boolean).length;
  const totalSteps = stepStatus.length;

  // Initialize stem mappings when stems appear and no parts exist
  if (hasStems && Object.keys(stemMappings).length === 0 && !hasParts) {
    const initial: Record<string, { checked: boolean; instrumentName: string }> = {};
    for (const stem of stems) {
      if (stem.stemName) {
        initial[stem.id] = {
          checked: true,
          instrumentName: stem.stemName.charAt(0).toUpperCase() + stem.stemName.slice(1),
        };
      }
    }
    if (Object.keys(initial).length > 0) {
      setStemMappings(initial);
    }
  }

  // Stems available for transcription (have matching part but no sheet music)
  const stemsForTranscription = stems.filter((stem) => {
    if (!stem.stemName) return false;
    const matchingPart = arrangement.parts.find((p) =>
      p.instrumentName.toLowerCase().includes(stem.stemName!.toLowerCase())
    );
    return matchingPart && matchingPart.sheetMusicAssets.length === 0;
  });

  // --- Step action handlers ---

  function handleStepAction(action: string) {
    if (action === "upload-sheet-music") {
      setShowUploadSheet(true);
    } else if (action === "upload-audio") {
      setShowUploadAudio(true);
    } else {
      router.push(`${basePath}/${action}`);
    }
  }

  // --- Inline AI sub-components ---

  function renderAiChip(label: string) {
    return (
      <Badge colorPalette="purple" variant="subtle" fontSize="2xs" px={1.5}>
        AI
        {label ? ` ${label}` : ""}
      </Badge>
    );
  }

  function renderProcessingStatus(
    isProcessing: boolean,
    error: string | null,
    processingLabel: string,
    processingHint: string,
    errorLabel: string,
    onRetry?: () => void
  ) {
    if (isProcessing) {
      return (
        <Flex align="center" gap={3} p={3} borderRadius="md" bg="blue.50" border="1px solid" borderColor="blue.100">
          <Spinner size="sm" color="blue.500" />
          <Box>
            <Text fontWeight="medium" fontSize="xs" color="blue.700">{processingLabel}</Text>
            <Text fontSize="xs" color="blue.500">{processingHint}</Text>
          </Box>
        </Flex>
      );
    }
    if (error) {
      return (
        <Flex align="center" p={3} borderRadius="md" bg="red.50" border="1px solid" borderColor="red.100">
          <Box flex={1}>
            <Text fontWeight="medium" fontSize="xs" color="red.700">{errorLabel}</Text>
            <Text fontSize="xs" color="red.500">{error}</Text>
          </Box>
          {onRetry && (
            <Button size="xs" variant="outline" colorPalette="red" onClick={onRetry}>
              Retry
            </Button>
          )}
        </Flex>
      );
    }
    return null;
  }

  // --- Audio step: inline AI (stem separation) ---

  function renderAudioStepExtra() {
    const showStemButton = fullMix && !hasStems && !isStemProcessing && !stemProcessingError;

    return (
      <VStack align="stretch" gap={2} mt={2}>
        {showStemButton && (
          <Flex align="center" gap={2} p={3} borderRadius="md" bg="purple.50" border="1px solid" borderColor="purple.100">
            <Box flex={1}>
              <Flex align="center" gap={1.5}>
                <Text fontWeight="medium" fontSize="xs" color="gray.700">Separate Stems</Text>
                {renderAiChip("")}
              </Flex>
              <Text fontSize="xs" color="gray.500">
                Split your full mix into vocals, drums, bass & other
              </Text>
            </Box>
            <Button
              size="xs"
              colorPalette="purple"
              onClick={() => startStemSeparation(fullMix.id, "stem_separation")}
            >
              Separate
            </Button>
          </Flex>
        )}

        {renderProcessingStatus(
          isStemProcessing,
          stemProcessingError,
          "Separating stems...",
          "Usually takes 1-3 minutes. You can leave and come back.",
          "Stem separation failed",
          fullMix ? () => startStemSeparation(fullMix.id, "stem_separation") : undefined
        )}

        {hasStems && (
          <Flex align="center" gap={2} p={3} borderRadius="md" bg="green.50" border="1px solid" borderColor="green.100">
            <Text fontSize="xs" color="green.700" fontWeight="medium">
              {stems.length} stems separated
            </Text>
            <Text fontSize="xs" color="gray.500">
              ({stems.map((s) => s.stemName).join(", ")})
            </Text>
          </Flex>
        )}
      </VStack>
    );
  }

  // --- Parts step: inline AI (stem-to-part mapping) ---

  function renderPartsStepExtra() {
    const showStemMapping = hasStems && !hasParts && Object.keys(stemMappings).length > 0;
    if (!showStemMapping) return null;

    return (
      <Box mt={2} p={3} borderRadius="md" bg="purple.50" border="1px solid" borderColor="purple.100">
        <Flex align="center" gap={1.5} mb={2}>
          <Text fontWeight="medium" fontSize="xs" color="gray.700">Map Stems to Parts</Text>
          {renderAiChip("")}
        </Flex>
        <Text fontSize="xs" color="gray.500" mb={3}>
          Select stems to create instrument parts from. Rename to match your arrangement.
        </Text>
        <VStack align="stretch" gap={2}>
          {stems.map((stem) => {
            const mapping = stemMappings[stem.id];
            if (!mapping) return null;
            return (
              <Flex key={stem.id} align="center" gap={3} p={2} bg="white" borderRadius="md" border="1px solid" borderColor="gray.100">
                <Checkbox.Root
                  checked={mapping.checked}
                  onCheckedChange={(e) =>
                    setStemMappings((prev) => ({
                      ...prev,
                      [stem.id]: { ...prev[stem.id], checked: !!e.checked },
                    }))
                  }
                >
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                </Checkbox.Root>
                <Badge colorPalette="purple" variant="subtle" fontSize="2xs">{stem.stemName}</Badge>
                <Input
                  size="sm"
                  flex={1}
                  value={mapping.instrumentName}
                  onChange={(e) =>
                    setStemMappings((prev) => ({
                      ...prev,
                      [stem.id]: { ...prev[stem.id], instrumentName: e.target.value },
                    }))
                  }
                  placeholder="Instrument name"
                />
              </Flex>
            );
          })}
        </VStack>
        <Flex justify="flex-end" mt={3}>
          <Button
            size="xs"
            colorPalette="purple"
            onClick={handleCreatePartsFromStems}
            loading={createPartMutation.isPending}
            disabled={!Object.values(stemMappings).some((m) => m.checked && m.instrumentName.trim())}
          >
            Create Parts from Stems
          </Button>
        </Flex>
      </Box>
    );
  }

  // --- Charts step: inline AI (transcription) ---

  function renderChartsStepExtra() {
    const showTranscribe = stemsForTranscription.length > 0 && !isTranscribing && !transcriptionError;

    return (
      <VStack align="stretch" gap={2} mt={2}>
        {showTranscribe && (
          <Flex align="center" gap={2} p={3} borderRadius="md" bg="purple.50" border="1px solid" borderColor="purple.100">
            <Box flex={1}>
              <Flex align="center" gap={1.5}>
                <Text fontWeight="medium" fontSize="xs" color="gray.700">Generate Sheet Music</Text>
                {renderAiChip("")}
              </Flex>
              <Text fontSize="xs" color="gray.500">
                Transcribe {stemsForTranscription.map((s) => s.stemName).join(", ")} to MusicXML
              </Text>
            </Box>
            <Button
              size="xs"
              colorPalette="purple"
              onClick={() => {
                for (const stem of stemsForTranscription) {
                  startTranscription(stem.id, "transcription");
                }
              }}
            >
              Transcribe{stemsForTranscription.length > 1 ? " All" : ""}
            </Button>
          </Flex>
        )}

        {renderProcessingStatus(
          isTranscribing,
          transcriptionError,
          "Transcribing audio to sheet music...",
          "AI is detecting notes and generating MusicXML. May take 2-5 minutes.",
          "Transcription failed"
        )}
      </VStack>
    );
  }

  // --- Sync Map step: inline AI (beat detection) ---

  function renderSyncMapStepExtra() {
    const showBeatButton = fullMix && !hasSyncMap && !isBeatProcessing && !beatProcessingError;

    return (
      <VStack align="stretch" gap={2} mt={2}>
        {showBeatButton && (
          <Flex align="center" gap={2} p={3} borderRadius="md" bg="purple.50" border="1px solid" borderColor="purple.100">
            <Box flex={1}>
              <Flex align="center" gap={1.5}>
                <Text fontWeight="medium" fontSize="xs" color="gray.700">Auto-Generate Sync Map</Text>
                {renderAiChip("")}
              </Flex>
              <Text fontSize="xs" color="gray.500">
                Detect beats and create bar-to-timestamp mapping
              </Text>
            </Box>
            <Button
              size="xs"
              colorPalette="purple"
              onClick={() => startBeatDetection(fullMix.id, "beat_detection")}
            >
              Generate
            </Button>
          </Flex>
        )}

        {renderProcessingStatus(
          isBeatProcessing,
          beatProcessingError,
          "Generating sync map...",
          "Detecting beats and mapping bar positions. Usually under a minute.",
          "Beat detection failed",
          fullMix ? () => startBeatDetection(fullMix.id, "beat_detection") : undefined
        )}

        {hasSyncMap && (
          <Flex align="center" gap={2} p={3} borderRadius="md" bg="green.50" border="1px solid" borderColor="green.100">
            <Text fontSize="xs" color="green.700" fontWeight="medium">Sync map active</Text>
            {renderAiChip("Generated")}
          </Flex>
        )}
      </VStack>
    );
  }

  // Map step keys to their inline AI extras
  function renderStepExtra(key: string) {
    switch (key) {
      case "audio": return renderAudioStepExtra();
      case "parts": return renderPartsStepExtra();
      case "charts": return renderChartsStepExtra();
      case "syncMap": return renderSyncMapStepExtra();
      default: return null;
    }
  }

  // Check if a step has AI content to show
  function stepHasAiContent(key: string): boolean {
    switch (key) {
      case "audio":
        return !!(fullMix && (!hasStems || isStemProcessing || stemProcessingError)) || hasStems;
      case "parts":
        return hasStems && !hasParts && Object.keys(stemMappings).length > 0;
      case "charts":
        return stemsForTranscription.length > 0 || isTranscribing || !!transcriptionError;
      case "syncMap":
        return !!(fullMix && (!hasSyncMap || isBeatProcessing || beatProcessingError)) || hasSyncMap;
      default:
        return false;
    }
  }

  return (
    <Box maxW="1000px">
      {/* Header */}
      <Flex justify="space-between" align="start" mb={8}>
        <Box>
          <Flex align="center" gap={3} mb={1}>
            <Button
              variant="ghost"
              size="sm"
              color="gray.500"
              onClick={() => router.push(`/bands/${bandId}/songs/${songId}`)}
            >
              ← Back to song
            </Button>
          </Flex>
          <Heading size="xl" color="gray.800">
            {arrangement.name}
            <Text as="span" color="gray.400" fontWeight="normal" ml={2}>
              {arrangement.versionLabel}
            </Text>
          </Heading>
          <Flex align="center" gap={3} mt={2}>
            <Badge colorPalette={status.color} size="lg">{status.label}</Badge>
            <Text fontSize="sm" color="gray.500">
              {completedSteps}/{totalSteps} setup steps complete
            </Text>
          </Flex>
        </Box>
        {arrangement.status === "draft" && (
          <Button
            colorPalette="green"
            onClick={() => publishMutation.mutate({})}
            loading={publishMutation.isPending}
            disabled={!readiness?.isReady}
          >
            Publish Arrangement
          </Button>
        )}
      </Flex>

      {/* Setup Checklist with integrated AI */}
      {arrangement.status === "draft" && (
        <Card.Root mb={8} bg="white" borderWidth="1px" borderColor="gray.100">
          <Card.Body p={6}>
            <Heading size="md" mb={1} color="gray.800">Setup Checklist</Heading>
            <Text fontSize="sm" color="gray.500" mb={5}>
              Complete these steps to get your arrangement rehearsal-ready.
            </Text>
            <VStack align="stretch" gap={3}>
              {STEP_CONFIG.map((step, i) => {
                const done = stepStatus[i];
                const hasAi = stepHasAiContent(step.key);
                return (
                  <Box key={step.key}>
                    <Flex
                      align="center"
                      p={4}
                      borderRadius={hasAi ? "lg lg 0 0" : "lg"}
                      bg={done ? "green.50" : "gray.50"}
                      border="1px solid"
                      borderColor={done ? "green.100" : "gray.100"}
                      borderBottomWidth={hasAi ? 0 : "1px"}
                      transition="all 0.15s"
                      _hover={{ borderColor: done ? "green.200" : "blue.200", shadow: "sm" }}
                    >
                      <Flex
                        w="32px"
                        h="32px"
                        borderRadius="full"
                        bg={done ? "green.100" : "white"}
                        border={done ? "none" : "2px solid"}
                        borderColor="gray.200"
                        align="center"
                        justify="center"
                        flexShrink={0}
                        mr={4}
                        fontSize="sm"
                        fontWeight="bold"
                        color={done ? "green.700" : "gray.400"}
                      >
                        {done ? "✓" : step.icon}
                      </Flex>
                      <Box flex={1}>
                        <Text fontWeight="semibold" fontSize="sm" color={done ? "green.700" : "gray.800"}>
                          {step.label}
                        </Text>
                        <Text fontSize="xs" color="gray.500">
                          {step.description}
                        </Text>
                      </Box>
                      <Button
                        size="sm"
                        minW="140px"
                        variant={done ? "outline" : "solid"}
                        colorPalette={done ? "gray" : "blue"}
                        onClick={() => handleStepAction(step.action)}
                      >
                        {done ? "Edit" : step.actionLabel}
                      </Button>
                    </Flex>

                    {/* Inline AI actions for this step */}
                    {hasAi && (
                      <Box
                        px={4}
                        pb={4}
                        pt={2}
                        bg={done ? "green.50" : "gray.50"}
                        border="1px solid"
                        borderColor={done ? "green.100" : "gray.100"}
                        borderTopWidth={0}
                        borderRadius="0 0 lg lg"
                        ml="48px"
                      >
                        {renderStepExtra(step.key)}
                      </Box>
                    )}
                  </Box>
                );
              })}
            </VStack>
          </Card.Body>
        </Card.Root>
      )}

      <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6}>
        {/* Parts Overview */}
        <Card.Root bg="white" borderWidth="1px" borderColor="gray.100">
          <Card.Body p={6}>
            <Flex justify="space-between" align="center" mb={4}>
              <Heading size="sm" color="gray.800">Parts & Assignments</Heading>
              <Button
                size="xs"
                variant="outline"
                onClick={() => router.push(`${basePath}/parts`)}
              >
                Manage
              </Button>
            </Flex>
            {arrangement.parts.length === 0 ? (
              <Box p={6} textAlign="center" bg="gray.50" borderRadius="lg">
                <Text fontSize="sm" color="gray.500">
                  No parts yet. Add instrument parts to get started.
                </Text>
              </Box>
            ) : (
              <Table.Root size="sm">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader color="gray.500" fontSize="xs" textTransform="uppercase">
                      Instrument
                    </Table.ColumnHeader>
                    <Table.ColumnHeader color="gray.500" fontSize="xs" textTransform="uppercase">
                      Chart
                    </Table.ColumnHeader>
                    <Table.ColumnHeader color="gray.500" fontSize="xs" textTransform="uppercase">
                      Player
                    </Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {arrangement.parts.map((part) => (
                    <Table.Row key={part.id}>
                      <Table.Cell>
                        <Flex align="center" gap={2}>
                          <Text fontSize="sm" fontWeight="medium">
                            {part.instrumentName}
                            {part.partName ? ` (${part.partName})` : ""}
                          </Text>
                          {part.isRequired && (
                            <Badge colorPalette="orange" size="sm" variant="subtle">
                              required
                            </Badge>
                          )}
                        </Flex>
                      </Table.Cell>
                      <Table.Cell>
                        {part.sheetMusicAssets.length > 0 ? (
                          <Flex align="center" gap={2}>
                            <Badge colorPalette="green" variant="subtle">
                              {part.sheetMusicAssets[0].fileType.toUpperCase()}
                            </Badge>
                            <Button
                              size="xs"
                              variant="ghost"
                              colorPalette="blue"
                              onClick={() =>
                                setPreviewAsset({
                                  objectKey: part.sheetMusicAssets[0].storageObject.objectKey,
                                  fileType: part.sheetMusicAssets[0].fileType,
                                  fileName: part.sheetMusicAssets[0].storageObject.originalFileName,
                                })
                              }
                            >
                              Preview
                            </Button>
                          </Flex>
                        ) : (
                          <Text fontSize="sm" color="gray.400">—</Text>
                        )}
                      </Table.Cell>
                      <Table.Cell>
                        {part.assignments[0]?.member.displayName ? (
                          <Text fontSize="sm">{part.assignments[0].member.displayName}</Text>
                        ) : (
                          <Text fontSize="sm" color="gray.400">Unassigned</Text>
                        )}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            )}
          </Card.Body>
        </Card.Root>

        {/* Audio & Sections */}
        <VStack align="stretch" gap={6}>
          {/* Audio Assets */}
          <Card.Root bg="white" borderWidth="1px" borderColor="gray.100">
            <Card.Body p={6}>
              <Flex justify="space-between" align="center" mb={4}>
                <Heading size="sm" color="gray.800">Audio Tracks</Heading>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => setShowUploadAudio(true)}
                >
                  Upload
                </Button>
              </Flex>
              {arrangement.audioAssets.length === 0 ? (
                <Box p={6} textAlign="center" bg="gray.50" borderRadius="lg">
                  <Text fontSize="sm" color="gray.500">
                    No audio yet. Upload a backing track or stems.
                  </Text>
                </Box>
              ) : (
                <VStack align="stretch" gap={4}>
                  {/* Track list */}
                  <VStack align="stretch" gap={1}>
                    {arrangement.audioAssets.map((a) => (
                      <Flex
                        key={a.id}
                        align="center"
                        py={2}
                        px={3}
                        borderRadius="md"
                        bg="gray.50"
                        gap={2}
                      >
                        <Badge
                          colorPalette={
                            a.assetRole === "full_mix" ? "blue" :
                            a.assetRole === "stem" ? "purple" :
                            a.assetRole === "click" ? "orange" : "green"
                          }
                          variant="subtle"
                          fontSize="xs"
                        >
                          {a.assetRole.replace("_", " ")}
                        </Badge>
                        <Text fontSize="sm" fontWeight="medium" flex={1}>
                          {a.stemName || a.storageObject.originalFileName}
                        </Text>
                        <Text fontSize="xs" color="gray.400">
                          {a.storageObject.originalFileName}
                        </Text>
                      </Flex>
                    ))}
                  </VStack>
                  {/* Player */}
                  <AudioPlayer
                    tracks={arrangement.audioAssets.map((a) => ({
                      id: a.id,
                      url: a.storageObject.objectKey,
                      label: a.stemName || a.assetRole.replace("_", " "),
                      role: a.assetRole,
                    }))}
                  />
                </VStack>
              )}
            </Card.Body>
          </Card.Root>

          {/* Sections */}
          <Card.Root bg="white" borderWidth="1px" borderColor="gray.100">
            <Card.Body p={6}>
              <Flex justify="space-between" align="center" mb={4}>
                <Heading size="sm" color="gray.800">Song Sections</Heading>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => router.push(`${basePath}/sections`)}
                >
                  Edit
                </Button>
              </Flex>
              {arrangement.sectionMarkers.length === 0 ? (
                <Box p={6} textAlign="center" bg="gray.50" borderRadius="lg">
                  <Text fontSize="sm" color="gray.500">
                    No sections defined. Add markers like Intro, Verse, Chorus.
                  </Text>
                </Box>
              ) : (
                <VStack align="stretch" gap={1}>
                  {arrangement.sectionMarkers.map((s, i) => (
                    <Flex
                      key={s.id}
                      justify="space-between"
                      align="center"
                      py={2}
                      px={3}
                      borderRadius="md"
                      bg={i % 2 === 0 ? "gray.50" : "transparent"}
                    >
                      <Flex align="center" gap={2}>
                        <Box w="6px" h="6px" borderRadius="full" bg="blue.400" />
                        <Text fontSize="sm" fontWeight="medium">{s.name}</Text>
                      </Flex>
                      <Text fontSize="xs" color="gray.400" fontFamily="mono">
                        Bar {s.startBar}
                      </Text>
                    </Flex>
                  ))}
                </VStack>
              )}
            </Card.Body>
          </Card.Root>
        </VStack>
      </SimpleGrid>

      {/* Upload Sheet Music Modal */}
      <Dialog.Root open={showUploadSheet} onOpenChange={(e) => setShowUploadSheet(e.open)}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="500px">
            <Dialog.Header>
              <Dialog.Title>Upload Sheet Music</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body>
              <form id="upload-sheet-form" onSubmit={handleSheetSubmit}>
                <VStack gap={4} align="stretch">
                  <FileDropzone
                    accept={[".musicxml", ".xml", ".mxl", ".pdf"]}
                    onFile={setSheetFile}
                    label="Drop MusicXML or PDF"
                  />
                  <Field.Root>
                    <Field.Label>Part</Field.Label>
                    <NativeSelect.Root>
                      <NativeSelect.Field
                        value={sheetPartId}
                        onChange={(e) => setSheetPartId(e.target.value)}
                      >
                        <option value="">Select a part...</option>
                        {parts?.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.instrumentName}
                            {p.partName ? ` — ${p.partName}` : ""}
                          </option>
                        ))}
                      </NativeSelect.Field>
                    </NativeSelect.Root>
                  </Field.Root>
                  {isUploadingSheet && (
                    <Text fontSize="sm" color="blue.500">
                      Uploading... {sheetProgress}%
                    </Text>
                  )}
                  {sheetUploadError && (
                    <Text fontSize="sm" color="red.500">
                      {sheetUploadError}
                    </Text>
                  )}
                </VStack>
              </form>
            </Dialog.Body>
            <Dialog.Footer>
              <Flex gap={3} w="full">
                <Button
                  variant="outline"
                  flex={1}
                  onClick={() => setShowUploadSheet(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="upload-sheet-form"
                  colorPalette="blue"
                  flex={1}
                  loading={isUploadingSheet || createSheetAsset.isPending}
                  disabled={!sheetFile || !sheetPartId}
                >
                  Upload
                </Button>
              </Flex>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* Sheet Music Preview Modal */}
      <Dialog.Root
        open={!!previewAsset}
        onOpenChange={(e) => { if (!e.open) setPreviewAsset(null); }}
      >
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="900px" w="90vw">
            <Dialog.Header>
              <Dialog.Title>Sheet Music Preview</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body>
              {previewAsset && (
                <SheetMusicViewer
                  fileUrl={`/api/v1/files/${previewAsset.objectKey}`}
                  fileType={previewAsset.fileType as "pdf" | "musicxml"}
                  fileName={previewAsset.fileName}
                />
              )}
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* Upload Audio Modal */}
      <Dialog.Root open={showUploadAudio} onOpenChange={(e) => { setShowUploadAudio(e.open); if (!e.open) setCopyrightAck(false); }}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="500px">
            <Dialog.Header>
              <Dialog.Title>Upload Audio</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body>
              <form id="upload-audio-form" onSubmit={handleAudioSubmit}>
                <VStack gap={4} align="stretch">
                  <FileDropzone
                    accept={[".wav", ".mp3", ".m4a", ".aac"]}
                    onFile={setAudioFile}
                    label="Drop audio file (WAV, MP3, M4A)"
                  />
                  <Field.Root>
                    <Field.Label>Asset Role</Field.Label>
                    <NativeSelect.Root>
                      <NativeSelect.Field
                        value={assetRole}
                        onChange={(e) => setAssetRole(e.target.value)}
                      >
                        <option value="full_mix">Full Mix</option>
                        <option value="stem">Stem</option>
                        <option value="click">Click Track</option>
                        <option value="guide">Guide Track</option>
                      </NativeSelect.Field>
                    </NativeSelect.Root>
                  </Field.Root>
                  {assetRole === "stem" && (
                    <Field.Root>
                      <Field.Label>Stem Name</Field.Label>
                      <Input
                        value={stemName}
                        onChange={(e) => setStemName(e.target.value)}
                        placeholder="e.g. Drums, Bass, Guitar"
                        required
                      />
                    </Field.Root>
                  )}
                  {isUploadingAudio && (
                    <Text fontSize="sm" color="blue.500">
                      Uploading... {audioProgress}%
                    </Text>
                  )}
                  {audioUploadError && (
                    <Text fontSize="sm" color="red.500">
                      {audioUploadError}
                    </Text>
                  )}
                  <Box bg="orange.50" border="1px solid" borderColor="orange.200" borderRadius="md" p={3}>
                    <Text fontSize="xs" color="orange.800" mb={2}>
                      By uploading audio, you confirm that you have the right to use this content
                      for rehearsal purposes and that it does not infringe on any third-party
                      copyrights, or that your use qualifies as fair use under applicable law.
                    </Text>
                    <Checkbox.Root
                      checked={copyrightAck}
                      onCheckedChange={(e) => setCopyrightAck(!!e.checked)}
                    >
                      <Checkbox.HiddenInput />
                      <Checkbox.Control />
                      <Checkbox.Label fontSize="xs" fontWeight="medium" color="orange.900">
                        I acknowledge and agree
                      </Checkbox.Label>
                    </Checkbox.Root>
                  </Box>
                </VStack>
              </form>
            </Dialog.Body>
            <Dialog.Footer>
              <Flex gap={3} w="full">
                <Button
                  variant="outline"
                  flex={1}
                  onClick={() => setShowUploadAudio(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="upload-audio-form"
                  colorPalette="blue"
                  flex={1}
                  loading={isUploadingAudio || createAudioAsset.isPending}
                  disabled={!audioFile || !copyrightAck}
                >
                  Upload
                </Button>
              </Flex>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </Box>
  );
}
