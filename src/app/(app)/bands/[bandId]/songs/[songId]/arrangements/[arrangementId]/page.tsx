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
} from "@chakra-ui/react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useApiQuery, useApiMutation } from "@/hooks/useApi";
import { useUpload } from "@/hooks/useUpload";
import { FileDropzone } from "@/components/uploads/FileDropzone";
import { SheetMusicViewer } from "@/components/sheet-music/SheetMusicViewer";

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
  audioAssets: { id: string; assetRole: string; stemName: string | null }[];
  assignments: {
    id: string;
    member: { id: string; displayName: string };
    part: { id: string; instrumentName: string };
  }[];
  sectionMarkers: { id: string; name: string; startBar: number }[];
  song: { id: string; title: string; bandId: string };
}

const STEP_CONFIG = [
  {
    key: "parts",
    label: "Define Parts",
    description: "Add instrument parts to this arrangement",
    icon: "🎹",
    action: "parts",
    actionLabel: "Manage Parts",
  },
  {
    key: "charts",
    label: "Upload Charts",
    description: "Upload sheet music (PDF or MusicXML) for each part",
    icon: "📄",
    action: "upload-sheet-music",
    actionLabel: "Upload Sheet Music",
  },
  {
    key: "audio",
    label: "Upload Audio",
    description: "Add a backing track, click, or stems",
    icon: "🎧",
    action: "upload-audio",
    actionLabel: "Upload Audio",
  },
  {
    key: "assign",
    label: "Assign Parts",
    description: "Assign band members to their instrument parts",
    icon: "👤",
    action: "assign",
    actionLabel: "Assign Members",
  },
  {
    key: "sections",
    label: "Mark Sections",
    description: "Define song sections (Intro, Verse, Chorus, etc.)",
    icon: "📐",
    action: "sections",
    actionLabel: "Edit Sections",
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

  // Calculate step completion
  const hasParts = arrangement.parts.length > 0;
  const hasCharts = arrangement.parts.some((p) => p.sheetMusicAssets.length > 0);
  const hasAudio = arrangement.audioAssets.length > 0;
  const hasAssignments = arrangement.parts.some((p) => p.assignments.length > 0);
  const hasSections = arrangement.sectionMarkers.length > 0;

  const stepStatus = [hasParts, hasCharts, hasAudio, hasAssignments, hasSections];
  const completedSteps = stepStatus.filter(Boolean).length;
  const totalSteps = stepStatus.length;

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

      {/* Setup Steps */}
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
                return (
                  <Flex
                    key={step.key}
                    align="center"
                    p={4}
                    borderRadius="lg"
                    bg={done ? "green.50" : "gray.50"}
                    border="1px solid"
                    borderColor={done ? "green.100" : "gray.100"}
                    transition="all 0.15s"
                    _hover={{ borderColor: done ? "green.200" : "blue.200", shadow: "sm" }}
                  >
                    <Flex
                      w="36px"
                      h="36px"
                      borderRadius="full"
                      bg={done ? "green.100" : "white"}
                      border={done ? "none" : "2px solid"}
                      borderColor="gray.200"
                      align="center"
                      justify="center"
                      flexShrink={0}
                      mr={4}
                      fontSize="md"
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
                      variant={done ? "outline" : "solid"}
                      colorPalette={done ? "gray" : "blue"}
                      onClick={() => {
                        if (step.action === "upload-sheet-music") {
                          setShowUploadSheet(true);
                        } else if (step.action === "upload-audio") {
                          setShowUploadAudio(true);
                        } else {
                          router.push(`${basePath}/${step.action}`);
                        }
                      }}
                    >
                      {done ? "Edit" : step.actionLabel}
                    </Button>
                  </Flex>
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
                <VStack align="stretch" gap={2}>
                  {arrangement.audioAssets.map((audio) => (
                    <Flex
                      key={audio.id}
                      justify="space-between"
                      align="center"
                      p={3}
                      bg="gray.50"
                      borderRadius="md"
                    >
                      <Flex align="center" gap={2}>
                        <Text fontSize="sm">🎧</Text>
                        <Text fontSize="sm" fontWeight="medium">
                          {audio.assetRole.replace("_", " ")}
                          {audio.stemName ? ` — ${audio.stemName}` : ""}
                        </Text>
                      </Flex>
                      <Badge colorPalette="green" variant="subtle">Active</Badge>
                    </Flex>
                  ))}
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
      <Dialog.Root open={showUploadAudio} onOpenChange={(e) => setShowUploadAudio(e.open)}>
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
                  disabled={!audioFile}
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
