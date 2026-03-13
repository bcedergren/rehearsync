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
  Progress,
} from "@chakra-ui/react";
import { useParams, useRouter } from "next/navigation";
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useApiQuery, useApiMutation } from "@/hooks/useApi";
import { useUpload } from "@/hooks/useUpload";
import { useProcessingJob } from "@/hooks/useProcessingJob";
import { FileDropzone } from "@/components/uploads/FileDropzone";
import { AssignmentReviewModal } from "@/components/assignments/AssignmentReviewModal";
import { SyncMapEditorModal } from "@/components/sync-map/SyncMapEditorModal";
import { Eye, Pencil } from "lucide-react";
import dynamic from "next/dynamic";
const SheetMusicViewer = dynamic(
  () => import("@/components/sheet-music/SheetMusicViewer").then((m) => m.SheetMusicViewer),
  { ssr: false }
);
const AudioPlayer = dynamic(
  () => import("@/components/audio/AudioPlayer").then((m) => m.AudioPlayer),
  { ssr: false }
);
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
  syncMaps: {
    id: string;
    points: { barNumber: number; timeMs: number }[];
  }[];
  song: { id: string; title: string; bandId: string };
}

// --- Step config ---

const STEP_CONFIG = [
  {
    key: "audio",
    label: "Audio",
    description: "Full mix, stems, or click track",
    action: "upload-audio",
    actionLabel: "Upload",
  },
  {
    key: "parts",
    label: "Parts",
    description: "Define instrument parts",
    action: "parts",
    actionLabel: "Manage",
  },
  {
    key: "charts",
    label: "Charts",
    description: "Sheet music for each part",
    action: "upload-sheet-music",
    actionLabel: "Upload",
  },
  {
    key: "assign",
    label: "Assign",
    description: "Members to parts",
    action: "assign",
    actionLabel: "Assign",
  },
  {
    key: "sections",
    label: "Sections",
    description: "Intro, Verse, Chorus, etc.",
    action: "sections",
    actionLabel: "Edit",
  },
  {
    key: "syncMap",
    label: "Sync Map",
    description: "Audio-to-bar mapping",
    action: "sync-map",
    actionLabel: "Edit",
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

  // Band members (for auto-assigning parts)
  interface BandMember {
    id: string;
    displayName: string;
    defaultInstrument: string | null;
  }
  const { data: bandMembers } = useApiQuery<BandMember[]>(
    ["members", bandId],
    `/bands/${bandId}/members`
  );

  // User tier for feature gating
  interface MeResponse {
    user: { id: string; tier: string };
    subscription: { tier: string; limits: Record<string, boolean | number> };
  }
  const { data: meData } = useApiQuery<MeResponse>(["me"], "/me");
  const allowPracticeTools = meData?.subscription?.limits?.allowPracticeTools === true;

  // Practice tools state (lifted so AudioPlayer + SheetMusicViewer share the same values)
  const [tempoPercent, setTempoPercent] = useState(100);
  const [pitchSemitones, setPitchSemitones] = useState(0);

  // Inline editing for song title and arrangement name
  const [editingSongTitle, setEditingSongTitle] = useState(false);
  const [editingArrName, setEditingArrName] = useState(false);
  const [songTitleDraft, setSongTitleDraft] = useState("");
  const [arrNameDraft, setArrNameDraft] = useState("");

  const updateSongMutation = useApiMutation(
    `/songs/${songId}`,
    "PATCH",
    { invalidateKeys: [["arrangement", arrangementId]] }
  );

  const updateArrMutation = useApiMutation(
    `/arrangements/${arrangementId}`,
    "PATCH",
    { invalidateKeys: [["arrangement", arrangementId]] }
  );

  function startEditSongTitle() {
    setSongTitleDraft(arrangement?.song.title ?? "");
    setEditingSongTitle(true);
  }

  function saveSongTitle() {
    const trimmed = songTitleDraft.trim();
    if (trimmed && trimmed !== arrangement?.song.title) {
      updateSongMutation.mutate({ title: trimmed });
    }
    setEditingSongTitle(false);
  }

  function startEditArrName() {
    setArrNameDraft(arrangement?.name ?? "");
    setEditingArrName(true);
  }

  function saveArrName() {
    const trimmed = arrNameDraft.trim();
    if (trimmed && trimmed !== arrangement?.name) {
      updateArrMutation.mutate({ name: trimmed });
    }
    setEditingArrName(false);
  }

  const publishMutation = useApiMutation(
    `/arrangements/${arrangementId}/publish`,
    "POST",
    { invalidateKeys: [["arrangement", arrangementId], ["readiness", arrangementId]] }
  );

  const archiveMutation = useApiMutation(
    `/arrangements/${arrangementId}/archive`,
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

  // Inline drag-and-drop: upload directly as full_mix (skips modal for first upload)
  async function handleInlineDrop(file: File) {
    setAudioFile(file);
    const storageObjectId = await uploadAudio(file, bandId, "audio");
    if (!storageObjectId) return;
    createAudioAsset.mutate({ storageObjectId, assetRole: "full_mix" });
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
    progress: stemProgress,
    progressLabel: stemProgressLabel,
    startJob: startStemSeparation,
    resumeJob: resumeStemSeparation,
  } = useProcessingJob(handleProcessingComplete);

  const {
    isProcessing: isBeatProcessing,
    error: beatProcessingError,
    progress: beatProgress,
    progressLabel: beatProgressLabel,
    startJob: startBeatDetection,
    resumeJob: resumeBeatDetection,
  } = useProcessingJob(handleProcessingComplete);

  const {
    isProcessing: isTranscribing,
    error: transcriptionError,
    progress: transcriptionProgress,
    progressLabel: transcriptionProgressLabel,
    startJob: startTranscription,
    resumeJob: resumeTranscription,
  } = useProcessingJob(handleProcessingComplete);

  // Feature flag for transcription (disabled when AI model is unavailable)
  const transcriptionEnabled = process.env.NEXT_PUBLIC_TRANSCRIPTION_ENABLED === "true";

  // Resume tracking any in-progress processing jobs on page load
  interface ActiveJob { id: string; jobType: string; status: string }
  const { data: activeJobs } = useApiQuery<ActiveJob[]>(
    ["active-jobs", arrangementId],
    `/arrangements/${arrangementId}/processing-jobs?includeFailed=true`
  );

  // Check if transcription has already failed for this arrangement (guard against re-triggering)
  const hasFailedTranscription = activeJobs?.some(
    (j) => j.jobType === "transcription" && j.status === "failed"
  ) ?? false;

  const resumedRef = useRef(false);
  useEffect(() => {
    if (!activeJobs || activeJobs.length === 0 || resumedRef.current) return;
    resumedRef.current = true;
    const runnableJobs = activeJobs.filter((j) => j.status === "pending" || j.status === "running");
    for (const job of runnableJobs) {
      if (job.jobType === "stem_separation") resumeStemSeparation(job.id, job.jobType);
      if (job.jobType === "beat_detection") resumeBeatDetection(job.id, job.jobType);
      if (job.jobType === "transcription") resumeTranscription(job.id, job.jobType);
    }
  }, [activeJobs, resumeStemSeparation, resumeBeatDetection, resumeTranscription]);

  // AI Section generation state
  const [isGeneratingSections, setIsGeneratingSections] = useState(false);
  const [sectionGenError, setSectionGenError] = useState<string | null>(null);

  async function handleGenerateSections() {
    setIsGeneratingSections(true);
    setSectionGenError(null);
    try {
      const res = await fetch(`/api/v1/arrangements/${arrangementId}/sections/generate`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to generate sections");
      }
      queryClient.invalidateQueries({ queryKey: ["arrangement", arrangementId] });
      queryClient.invalidateQueries({ queryKey: ["sections", arrangementId] });
      queryClient.invalidateQueries({ queryKey: ["readiness", arrangementId] });
    } catch (err) {
      setSectionGenError(err instanceof Error ? err.message : "Failed to generate sections");
    } finally {
      setIsGeneratingSections(false);
    }
  }

  // Guitar transcription mode: "split" creates Lead + Rhythm parts, "merged" keeps single Guitar
  const [guitarSplitMode, setGuitarSplitMode] = useState<"split" | "merged">("split");

  // Stem-to-Part mapping state
  const [stemMappings, setStemMappings] = useState<
    Record<string, { checked: boolean; instrumentName: string }>
  >({});

  const createPartMutation = useApiMutation<{ id: string; instrumentName: string }, { instrumentName: string; isRequired: boolean }>(
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

  const assignMutation = useApiMutation(
    `/arrangements/${arrangementId}/assignments`,
    "POST",
    {
      invalidateKeys: [
        ["arrangement", arrangementId],
        ["readiness", arrangementId],
      ],
    }
  );

  // Fuzzy instrument matching: returns true if part and member instrument are related
  function instrumentsMatch(partInstrument: string, memberInstrument: string): boolean {
    const p = partInstrument.toLowerCase().trim();
    const m = memberInstrument.toLowerCase().trim();
    // Exact match
    if (p === m) return true;
    // One contains the other (e.g., "guitar" matches "lead guitar", "rhythm guitar")
    if (p.includes(m) || m.includes(p)) return true;
    // Common aliases
    const aliases: Record<string, string[]> = {
      guitar: ["electric guitar", "acoustic guitar", "lead guitar", "rhythm guitar", "gtr"],
      bass: ["bass guitar", "electric bass"],
      drums: ["drum", "percussion", "drummer"],
      vocals: ["voice", "singer", "vocal", "lead vocals", "backing vocals"],
      piano: ["keys", "keyboard", "synth", "synthesizer"],
      other: [],
    };
    for (const [key, alts] of Object.entries(aliases)) {
      const group = [key, ...alts];
      const pInGroup = group.some((g) => p.includes(g) || g.includes(p));
      const mInGroup = group.some((g) => m.includes(g) || g.includes(m));
      if (pInGroup && mInGroup) return true;
    }
    return false;
  }

  // Assignment review modal state
  const [showAssignReview, setShowAssignReview] = useState(false);
  const [reviewParts, setReviewParts] = useState<
    { id: string; instrumentName: string; partName: string | null }[]
  >([]);
  const [reviewAutoAssigned, setReviewAutoAssigned] = useState<
    { memberId: string; partId: string }[]
  >([]);
  const [isConfirmingAssignments, setIsConfirmingAssignments] = useState(false);

  // Modal states for setup steps
  const [showPartsModal, setShowPartsModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showSectionsModal, setShowSectionsModal] = useState(false);
  const [showSyncMapModal, setShowSyncMapModal] = useState(false);

  async function handleConfirmAssignments(
    assignments: { memberId: string; partId: string }[]
  ) {
    setIsConfirmingAssignments(true);
    try {
      for (const { memberId, partId } of assignments) {
        try {
          await assignMutation.mutateAsync({ memberId, partId, isDefault: true });
        } catch {
          // continue
        }
      }
      setShowAssignReview(false);
    } finally {
      setIsConfirmingAssignments(false);
    }
  }

  // --- Parts modal state ---
  interface PartRow { instrumentName: string; partName: string; isRequired: boolean }
  const emptyPartRow = (): PartRow => ({ instrumentName: "", partName: "", isRequired: true });
  const [showAddPart, setShowAddPart] = useState(false);
  const [partRows, setPartRows] = useState<PartRow[]>([emptyPartRow()]);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [editInstrumentName, setEditInstrumentName] = useState("");
  const [editPartName, setEditPartName] = useState("");
  const [editIsRequired, setEditIsRequired] = useState(true);

  function openEditPart(part: Part) {
    setEditingPart(part);
    setEditInstrumentName(part.instrumentName);
    setEditPartName(part.partName || "");
    setEditIsRequired(part.isRequired);
  }

  const updatePartMutation = useApiMutation(
    editingPart ? `/arrangements/${arrangementId}/parts/${editingPart.id}` : "",
    "PATCH",
    {
      invalidateKeys: [["parts", arrangementId], ["arrangement", arrangementId], ["readiness", arrangementId]],
      onSuccess: () => setEditingPart(null),
    }
  );

  async function handleAddParts(e: React.FormEvent) {
    e.preventDefault();
    const validRows = partRows.filter((r) => r.instrumentName.trim());
    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      await createPartMutation.mutateAsync({
        instrumentName: row.instrumentName.trim(),
        partName: row.partName.trim() || undefined,
        isRequired: row.isRequired,
        displayOrder: (parts?.length ?? 0) + i + 1,
      } as never);
    }
    setShowAddPart(false);
    setPartRows([emptyPartRow()]);
  }

  // --- Assign modal state ---
  const [assignSelectedParts, setAssignSelectedParts] = useState<Record<string, string>>({});
  const [assignSavedMembers, setAssignSavedMembers] = useState<Record<string, boolean>>({});
  const [assignErrorMsg, setAssignErrorMsg] = useState<string | null>(null);

  function getAssignedPartId(memberId: string): string {
    if (assignSelectedParts[memberId] !== undefined) return assignSelectedParts[memberId];
    const existing = arrangement?.assignments?.find((a) => a.member.id === memberId);
    return existing?.part.id || "";
  }

  function hasAssignChanged(memberId: string): boolean {
    if (assignSelectedParts[memberId] === undefined) return false;
    const existing = arrangement?.assignments?.find((a) => a.member.id === memberId);
    return assignSelectedParts[memberId] !== (existing?.part.id || "");
  }

  async function handleAssignSave(memberId: string) {
    const partId = getAssignedPartId(memberId);
    if (!partId) return;
    setAssignErrorMsg(null);
    try {
      await assignMutation.mutateAsync({ memberId, partId });
      setAssignSavedMembers((s) => ({ ...s, [memberId]: true }));
      setAssignSelectedParts((s) => { const next = { ...s }; delete next[memberId]; return next; });
      setTimeout(() => setAssignSavedMembers((s) => ({ ...s, [memberId]: false })), 2000);
    } catch (err) {
      setAssignErrorMsg(err instanceof Error ? err.message : "Failed to save assignment");
    }
  }

  // --- Sections modal state ---
  interface SectionMarker { id: string; name: string; startBar: number; endBar: number | null; sortOrder: number }
  interface SectionRow { name: string; startBar: string; endBar: string }
  const SECTION_PRESETS = [
    ["Intro", "Verse", "Chorus", "Verse", "Chorus", "Bridge", "Chorus", "Outro"],
    ["Intro", "Verse", "Pre-Chorus", "Chorus", "Verse", "Pre-Chorus", "Chorus", "Bridge", "Chorus", "Outro"],
    ["Intro", "Head", "Solo", "Head", "Outro"],
  ];
  const EMPTY_SECTION_ROW: SectionRow = { name: "", startBar: "", endBar: "" };

  const { data: sectionsData, isLoading: sectionsLoading } = useApiQuery<SectionMarker[]>(
    ["sections", arrangementId],
    `/arrangements/${arrangementId}/sections`
  );

  const [sectionRows, setSectionRows] = useState<SectionRow[]>([{ ...EMPTY_SECTION_ROW }]);
  const [showAddSections, setShowAddSections] = useState(false);
  const [savingSections, setSavingSections] = useState(false);
  const [sectionModalError, setSectionModalError] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<SectionMarker | null>(null);
  const [editSectionName, setEditSectionName] = useState("");
  const [editSectionStartBar, setEditSectionStartBar] = useState("");
  const [editSectionEndBar, setEditSectionEndBar] = useState("");

  function openEditSection(section: SectionMarker) {
    setEditingSection(section);
    setEditSectionName(section.name);
    setEditSectionStartBar(String(section.startBar));
    setEditSectionEndBar(section.endBar != null ? String(section.endBar) : "");
  }

  const createSectionMutation = useApiMutation(
    `/arrangements/${arrangementId}/sections`,
    "POST",
    { invalidateKeys: [["sections", arrangementId], ["arrangement", arrangementId], ["readiness", arrangementId]] }
  );

  const updateSectionMutation = useApiMutation(
    editingSection ? `/arrangements/${arrangementId}/sections/${editingSection.id}` : "",
    "PATCH",
    {
      invalidateKeys: [["sections", arrangementId], ["arrangement", arrangementId], ["readiness", arrangementId]],
      onSuccess: () => setEditingSection(null),
    }
  );

  async function handleSubmitSections() {
    const validRows = sectionRows.filter((r) => r.name.trim() && r.startBar);
    if (validRows.length === 0) return;
    setSavingSections(true);
    setSectionModalError(null);
    const baseOrder = sectionsData?.length ?? 0;
    try {
      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];
        await createSectionMutation.mutateAsync({
          name: row.name.trim(),
          startBar: parseInt(row.startBar),
          endBar: row.endBar ? parseInt(row.endBar) : undefined,
          sortOrder: baseOrder + i + 1,
        });
      }
      setSectionRows([{ ...EMPTY_SECTION_ROW }]);
      setShowAddSections(false);
    } catch (err) {
      setSectionModalError(err instanceof Error ? err.message : "Failed to save sections");
    } finally {
      setSavingSections(false);
    }
  }

  async function handleCreatePartsFromStems() {
    const entries = Object.entries(stemMappings).filter(
      ([, v]) => v.checked && v.instrumentName.trim()
    );

    // Create parts and collect their IDs
    const createdParts: { id: string; instrumentName: string }[] = [];
    for (const [, mapping] of entries) {
      try {
        const part = await createPartMutation.mutateAsync({
          instrumentName: mapping.instrumentName,
          isRequired: true,
        });
        createdParts.push(part);
      } catch {
        // continue creating remaining parts
      }
    }

    // Auto-assign members whose defaultInstrument matches a created part
    if (bandMembers && createdParts.length > 0) {
      for (const member of bandMembers) {
        if (!member.defaultInstrument) continue;
        const matchingPart = createdParts.find(
          (p) => p.instrumentName.toLowerCase() === member.defaultInstrument!.toLowerCase()
        );
        if (matchingPart) {
          try {
            await assignMutation.mutateAsync({
              memberId: member.id,
              partId: matchingPart.id,
              isDefault: true,
            });
          } catch {
            // continue assigning remaining members
          }
        }
      }
    }

    setStemMappings({});
  }

  // Derived state (computed before early return so hooks below always run)
  const fullMix = arrangement?.audioAssets.find((a) => a.assetRole === "full_mix");
  const stems = (arrangement?.audioAssets.filter((a) => a.assetRole === "stem") ?? []).sort((a, b) => {
    const aIsOther = (a.stemName ?? "").toLowerCase() === "other";
    const bIsOther = (b.stemName ?? "").toLowerCase() === "other";
    if (aIsOther !== bIsOther) return aIsOther ? 1 : -1;
    return (a.stemName ?? "").localeCompare(b.stemName ?? "");
  });
  const hasStems = stems.length > 0;
  const sortedParts = useMemo(() => [...(arrangement?.parts ?? [])].sort((a, b) => {
    const aIsOther = a.instrumentName.toLowerCase() === "other";
    const bIsOther = b.instrumentName.toLowerCase() === "other";
    if (aIsOther !== bIsOther) return aIsOther ? 1 : -1;
    return a.instrumentName.localeCompare(b.instrumentName);
  }), [arrangement?.parts]);
  const hasParts = sortedParts.length > 0;
  const hasCharts = arrangement?.parts.some((p) => p.sheetMusicAssets.length > 0) ?? false;
  const hasAudio = (arrangement?.audioAssets.length ?? 0) > 0;
  const hasAssignments = arrangement?.parts.some((p) => p.assignments.length > 0) ?? false;
  const hasSections = (arrangement?.sectionMarkers.length ?? 0) > 0;
  const hasSyncMap = readiness?.checks.activeSyncMapPresent ?? false;

  // Build sorted sync map points for bar → timeMs lookup
  const syncPoints = useMemo(() => {
    const activeSyncMap = arrangement?.syncMaps?.[0];
    return activeSyncMap?.points ?? [];
  }, [arrangement?.syncMaps]);

  // Resolve a bar number to timeMs (exact match or closest bar ≤ target)
  const barToTimeMs = useCallback((bar: number): number | null => {
    if (syncPoints.length === 0) return null;
    // Exact match first
    const exact = syncPoints.find((p) => p.barNumber === bar);
    if (exact) return exact.timeMs;
    // Find closest bar ≤ target
    let closest: { barNumber: number; timeMs: number } | null = null;
    for (const p of syncPoints) {
      if (p.barNumber <= bar && (!closest || p.barNumber > closest.barNumber)) {
        closest = p;
      }
    }
    return closest?.timeMs ?? null;
  }, [syncPoints]);

  // Memoize audio tracks to prevent unnecessary AudioPlayer re-renders
  const audioTracks = useMemo(() => {
    if (!arrangement) return [];
    const all = arrangement.audioAssets.map((a) => ({
      id: a.id,
      url: a.storageObject.objectKey,
      label: a.stemName || a.assetRole.replace("_", " "),
      role: a.assetRole,
    }));
    const hasStems = all.some((t) => t.role === "stem");
    const filtered = hasStems ? all.filter((t) => t.role !== "full_mix") : all;
    return filtered.sort((a, b) => {
      const aIsOther = a.label.toLowerCase() === "other";
      const bIsOther = b.label.toLowerCase() === "other";
      if (aIsOther !== bIsOther) return aIsOther ? 1 : -1;
      return a.label.localeCompare(b.label);
    });
  }, [arrangement?.audioAssets]);

  // State for seeking audio player to a section
  const [audioSeekTo, setAudioSeekTo] = useState<[number, number] | undefined>(undefined);
  const seekCounter = useRef(0);

  const handleSectionClick = useCallback((startBar: number) => {
    const timeMs = barToTimeMs(startBar);
    if (timeMs != null) {
      seekCounter.current += 1;
      setAudioSeekTo([timeMs, seekCounter.current]);
    }
  }, [barToTimeMs]);

  // Auto-trigger stem separation when full mix exists and no stems yet
  const autoStemSeparationRef = useRef(false);
  useEffect(() => {
    if (!fullMix || hasStems || isStemProcessing || autoStemSeparationRef.current) return;
    autoStemSeparationRef.current = true;
    startStemSeparation(fullMix.id, "stem_separation");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullMix, hasStems, isStemProcessing]);

  // Auto-trigger beat detection when full mix exists and no sync map yet
  const autoBeatDetectionRef = useRef(false);
  useEffect(() => {
    if (!fullMix || hasSyncMap || isBeatProcessing || autoBeatDetectionRef.current) return;
    autoBeatDetectionRef.current = true;
    startBeatDetection(fullMix.id, "beat_detection");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullMix, hasSyncMap, isBeatProcessing]);

  // Auto-create parts from stems when stems appear and no parts exist
  const autoCreatedPartsRef = useRef(false);
  useEffect(() => {
    if (!hasStems || hasParts || autoCreatedPartsRef.current || stems.length === 0) return;
    autoCreatedPartsRef.current = true;

    async function autoCreateParts() {
      const createdParts: { id: string; instrumentName: string }[] = [];
      for (const stem of stems) {
        if (!stem.stemName) continue;
        // Split guitar into Lead Guitar + Rhythm Guitar
        if (stem.stemName.toLowerCase() === "guitar") {
          for (const prefix of ["Lead", "Rhythm"]) {
            try {
              const part = await createPartMutation.mutateAsync({
                instrumentName: `${prefix} Guitar`,
                isRequired: true,
              });
              createdParts.push(part);
            } catch {
              // continue creating remaining parts
            }
          }
          continue;
        }
        const instrumentName = stem.stemName.charAt(0).toUpperCase() + stem.stemName.slice(1);
        try {
          const part = await createPartMutation.mutateAsync({
            instrumentName,
            isRequired: true,
          });
          createdParts.push(part);
        } catch {
          // continue creating remaining parts
        }
      }

      // Fuzzy auto-assign members to created parts
      if (bandMembers && createdParts.length > 0) {
        const autoAssigned: { memberId: string; partId: string }[] = [];
        const assignedPartIds = new Set<string>();
        const assignedMemberIds = new Set<string>();

        for (const member of bandMembers) {
          if (!member.defaultInstrument) continue;
          const matchingPart = createdParts.find(
            (p) =>
              !assignedPartIds.has(p.id) &&
              instrumentsMatch(p.instrumentName, member.defaultInstrument!)
          );
          if (matchingPart) {
            autoAssigned.push({ memberId: member.id, partId: matchingPart.id });
            assignedPartIds.add(matchingPart.id);
            assignedMemberIds.add(member.id);
          }
        }

        // Save confident auto-assignments immediately
        for (const { memberId, partId } of autoAssigned) {
          try {
            await assignMutation.mutateAsync({ memberId, partId, isDefault: true });
          } catch {
            // continue
          }
        }

        // Check for unresolved parts or members
        const unresolvedParts = createdParts.filter((p) => !assignedPartIds.has(p.id));
        const unresolvedMembers = bandMembers.filter((m) => !assignedMemberIds.has(m.id));

        if (unresolvedParts.length > 0 && unresolvedMembers.length > 0) {
          // Show review modal for ambiguous assignments
          setReviewParts(createdParts.map((p) => ({ ...p, partName: null })));
          setReviewAutoAssigned(autoAssigned);
          setShowAssignReview(true);
        }
      }
    }

    autoCreateParts();
  }, [hasStems, hasParts, stems, bandMembers, createPartMutation, assignMutation]);

  // Auto-assign members to unassigned parts based on fuzzy instrument match
  const autoAssignedRef = useRef(false);
  useEffect(() => {
    if (!arrangement || !bandMembers || !hasParts || autoAssignedRef.current) return;
    const unassignedParts = arrangement.parts.filter((p) => p.assignments.length === 0);
    if (unassignedParts.length === 0) return;

    const alreadyAssignedMemberIds = new Set(
      arrangement.parts.flatMap((p) => p.assignments.map((a) => a.member.id))
    );

    const membersToAssign: { memberId: string; partId: string }[] = [];
    const assignedPartIds = new Set<string>();

    for (const member of bandMembers) {
      if (!member.defaultInstrument || alreadyAssignedMemberIds.has(member.id)) continue;
      const matchingPart = unassignedParts.find(
        (p) =>
          !assignedPartIds.has(p.id) &&
          instrumentsMatch(p.instrumentName, member.defaultInstrument!)
      );
      if (matchingPart) {
        membersToAssign.push({ memberId: member.id, partId: matchingPart.id });
        assignedPartIds.add(matchingPart.id);
      }
    }

    if (membersToAssign.length === 0) {
      // No fuzzy matches either — check if we should show review modal
      const hasUnassignedMembers = bandMembers.some(
        (m) => !alreadyAssignedMemberIds.has(m.id)
      );
      if (unassignedParts.length > 0 && hasUnassignedMembers) {
        autoAssignedRef.current = true;
        const autoAlready = arrangement.parts
          .filter((p) => p.assignments.length > 0)
          .map((p) => ({
            memberId: p.assignments[0].member.id,
            partId: p.id,
          }));
        setReviewParts(
          arrangement.parts.map((p) => ({
            id: p.id,
            instrumentName: p.instrumentName,
            partName: p.partName,
          }))
        );
        setReviewAutoAssigned(autoAlready);
        setShowAssignReview(true);
      }
      return;
    }

    autoAssignedRef.current = true;

    async function doAssign() {
      for (const { memberId, partId } of membersToAssign) {
        try {
          await assignMutation.mutateAsync({ memberId, partId, isDefault: true });
        } catch {
          // continue assigning remaining
        }
      }

      // After fuzzy assign, check for remaining unresolved
      const stillUnassigned = unassignedParts.filter((p) => !assignedPartIds.has(p.id));
      const alreadyAssignedAfter = new Set([
        ...alreadyAssignedMemberIds,
        ...membersToAssign.map((m) => m.memberId),
      ]);
      const stillUnassignedMembers = bandMembers!.filter(
        (m) => !alreadyAssignedAfter.has(m.id)
      );

      if (stillUnassigned.length > 0 && stillUnassignedMembers.length > 0) {
        const allAutoAssigned = [
          ...arrangement!.parts
            .filter((p) => p.assignments.length > 0)
            .map((p) => ({ memberId: p.assignments[0].member.id, partId: p.id })),
          ...membersToAssign,
        ];
        setReviewParts(
          arrangement!.parts.map((p) => ({
            id: p.id,
            instrumentName: p.instrumentName,
            partName: p.partName,
          }))
        );
        setReviewAutoAssigned(allAutoAssigned);
        setShowAssignReview(true);
      }
    }
    doAssign();
  }, [arrangement, bandMembers, hasParts, assignMutation]);

  // Auto-generate sections when sync map or charts are available (not just audio alone)
  // Waiting for sync map ensures we have BPM + bar count for much better section detection
  const autoGeneratedSectionsRef = useRef(false);
  useEffect(() => {
    if (
      (!hasSyncMap && !hasCharts) ||
      hasSections ||
      autoGeneratedSectionsRef.current ||
      isGeneratingSections
    )
      return;
    autoGeneratedSectionsRef.current = true;
    handleGenerateSections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasAudio, hasSyncMap, hasSections, isGeneratingSections]);

  // Stems available for transcription (no charts yet)
  const stemsForTranscription = stems.filter((stem) => {
    if (!stem.stemName) return false;
    // For guitar in split mode, check both Lead Guitar and Rhythm Guitar parts
    if (stem.stemName.toLowerCase() === "guitar" && guitarSplitMode === "split") {
      const leadPart = arrangement?.parts.find((p) =>
        p.instrumentName.toLowerCase() === "lead guitar"
      );
      const rhythmPart = arrangement?.parts.find((p) =>
        p.instrumentName.toLowerCase() === "rhythm guitar"
      );
      // Transcribable if either lead or rhythm part needs charts
      return (leadPart && leadPart.sheetMusicAssets.length === 0) ||
             (rhythmPart && rhythmPart.sheetMusicAssets.length === 0);
    }
    const matchingPart = arrangement?.parts.find((p) =>
      p.instrumentName.toLowerCase().includes(stem.stemName!.toLowerCase())
    );
    return matchingPart && matchingPart.sheetMusicAssets.length === 0;
  });

  // Stems that already have charts (for regeneration)
  const stemsWithCharts = stems.filter((stem) => {
    if (!stem.stemName) return false;
    const matchingPart = arrangement?.parts.find((p) =>
      p.instrumentName.toLowerCase().includes(stem.stemName!.toLowerCase())
    );
    return matchingPart && matchingPart.sheetMusicAssets.length > 0;
  });

  const [isRegenerating, setIsRegenerating] = useState(false);

  async function handleRegenerateCharts() {
    if (!arrangement) return;
    setIsRegenerating(true);
    try {
      // Retire all active sheet music assets
      for (const part of arrangement.parts) {
        for (const asset of part.sheetMusicAssets) {
          await fetch(`/api/v1/sheet-music/${asset.id}/retire`, { method: "POST" });
        }
      }
      // Invalidate arrangement data so stemsForTranscription recalculates
      queryClient.invalidateQueries({ queryKey: ["arrangement", arrangementId] });
      // Re-trigger transcription on all stems with matching parts
      const allTranscribableStems = stems.filter((stem) => {
        if (!stem.stemName) return false;
        return arrangement.parts.some((p) =>
          p.instrumentName.toLowerCase().includes(stem.stemName!.toLowerCase())
        );
      });
      for (let i = 0; i < allTranscribableStems.length; i++) {
        if (i > 0) await new Promise((r) => setTimeout(r, 12000));
        const stem = allTranscribableStems[i];
        const extras = stem.stemName?.toLowerCase() === "guitar" ? { guitarMode: guitarSplitMode } : undefined;
        await startTranscription(stem.id, "transcription", extras);
      }
    } catch (err) {
      console.error("Failed to regenerate charts:", err);
    } finally {
      setIsRegenerating(false);
    }
  }

  // Auto-trigger transcription when stems have matching parts without charts
  // Guarded by: feature flag, failed job check, and single-execution ref
  const autoTranscriptionRef = useRef(false);
  useEffect(() => {
    if (
      !transcriptionEnabled ||
      hasFailedTranscription ||
      stemsForTranscription.length === 0 ||
      isTranscribing ||
      autoTranscriptionRef.current
    )
      return;
    autoTranscriptionRef.current = true;
    async function autoTranscribe() {
      for (let i = 0; i < stemsForTranscription.length; i++) {
        if (i > 0) await new Promise((r) => setTimeout(r, 12000));
        const stem = stemsForTranscription[i];
        const extras = stem.stemName?.toLowerCase() === "guitar" ? { guitarMode: guitarSplitMode } : undefined;
        await startTranscription(stem.id, "transcription", extras);
      }
    }
    autoTranscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stemsForTranscription, isTranscribing, transcriptionEnabled, hasFailedTranscription]);

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

  const stepStatus = [hasAudio, hasParts, hasCharts, hasAssignments, hasSections, hasSyncMap];
  const completedSteps = stepStatus.filter(Boolean).length;
  const totalSteps = stepStatus.length;
  const progressPct = Math.round((completedSteps / totalSteps) * 100);

  // Find the first incomplete step for "next step" guidance
  const nextStepIndex = stepStatus.findIndex((done) => !done);

  // --- Step action handlers ---

  function handleStepAction(action: string) {
    if (action === "upload-sheet-music") {
      setShowUploadSheet(true);
    } else if (action === "upload-audio") {
      setShowUploadAudio(true);
    } else if (action === "parts") {
      setShowPartsModal(true);
    } else if (action === "assign") {
      setShowAssignModal(true);
    } else if (action === "sections") {
      setShowSectionsModal(true);
    } else if (action === "sync-map") {
      setShowSyncMapModal(true);
    }
  }

  // --- Inline AI helpers ---

  function renderAiChip(label: string) {
    return (
      <Badge colorPalette="purple" variant="subtle" fontSize="2xs" px={1.5}>
        AI{label ? ` ${label}` : ""}
      </Badge>
    );
  }

  // Processing status is now rendered as floating toasts at the bottom of the page

  // --- AI extras for each step ---

  function renderAudioStepExtra() {
    const showStemButton = fullMix && !hasStems && !isStemProcessing && !stemProcessingError;
    return (
      <VStack align="stretch" gap={2}>
        {showStemButton && (
          <Flex align="center" gap={2} p={3} borderRadius="md" bg="purple.50" border="1px solid" borderColor="purple.100">
            <Box flex={1}>
              <Flex align="center" gap={1.5}>
                <Text fontWeight="medium" fontSize="xs" color="gray.700">Separate Stems</Text>
                {renderAiChip("")}
              </Flex>
              <Text fontSize="xs" color="gray.500">
                Split into vocals, drums, bass, guitar, piano & other
              </Text>
            </Box>
            <Button size="xs" colorPalette="purple" onClick={() => startStemSeparation(fullMix.id, "stem_separation")}>
              Separate
            </Button>
          </Flex>
        )}
        {hasStems && (
          <Flex align="center" gap={2} p={3} borderRadius="md" bg="green.50" border="1px solid" borderColor="green.100">
            <Text fontSize="xs" color="green.700" fontWeight="medium">{stems.length} stems separated</Text>
            <Text fontSize="xs" color="gray.500">({stems.map((s) => s.stemName).join(", ")})</Text>
          </Flex>
        )}
      </VStack>
    );
  }

  function renderPartsStepExtra() {
    const showStemMapping = hasStems && !hasParts && Object.keys(stemMappings).length > 0;
    if (!showStemMapping) return null;
    return (
      <Box p={3} borderRadius="md" bg="purple.50" border="1px solid" borderColor="purple.100">
        <Flex align="center" gap={1.5} mb={2}>
          <Text fontWeight="medium" fontSize="xs" color="gray.700">Map Stems to Parts</Text>
          {renderAiChip("")}
        </Flex>
        <Text fontSize="xs" color="gray.500" mb={3}>
          Select stems to create instrument parts from.
        </Text>
        <VStack align="stretch" gap={2}>
          {stems.map((stem) => {
            const mapping = stemMappings[stem.id];
            if (!mapping) return null;
            return (
              <Flex key={stem.id} align="center" gap={3} p={2} bg="white" borderRadius="md" border="1px solid" borderColor="gray.100">
                <Checkbox.Root checked={mapping.checked} onCheckedChange={(e) => setStemMappings((prev) => ({ ...prev, [stem.id]: { ...prev[stem.id], checked: !!e.checked } }))}>
                  <Checkbox.HiddenInput />
                  <Checkbox.Control />
                </Checkbox.Root>
                <Badge colorPalette="purple" variant="subtle" fontSize="2xs">{stem.stemName}</Badge>
                <Input size="sm" flex={1} value={mapping.instrumentName} onChange={(e) => setStemMappings((prev) => ({ ...prev, [stem.id]: { ...prev[stem.id], instrumentName: e.target.value } }))} placeholder="Instrument name" />
              </Flex>
            );
          })}
        </VStack>
        <Flex justify="flex-end" mt={3}>
          <Button size="xs" colorPalette="purple" onClick={handleCreatePartsFromStems} loading={createPartMutation.isPending} disabled={!Object.values(stemMappings).some((m) => m.checked && m.instrumentName.trim())}>
            Create Parts from Stems
          </Button>
        </Flex>
      </Box>
    );
  }

  function renderChartsStepExtra() {
    const showTranscribe = transcriptionEnabled && stemsForTranscription.length > 0 && !isTranscribing;
    return (
      <VStack align="stretch" gap={2}>
        {transcriptionError && (
          <Flex align="center" gap={2} p={3} borderRadius="md" bg="red.50" border="1px solid" borderColor="red.100">
            <Box flex={1}>
              <Text fontWeight="medium" fontSize="xs" color="red.700">Transcription failed</Text>
              <Text fontSize="xs" color="gray.500">
                {transcriptionError} — you can retry below.
              </Text>
            </Box>
          </Flex>
        )}
        {showTranscribe && (
          <Box p={3} borderRadius="md" bg="purple.50" border="1px solid" borderColor="purple.100">
            <Flex align="center" gap={2}>
              <Box flex={1}>
                <Flex align="center" gap={1.5}>
                  <Text fontWeight="medium" fontSize="xs" color="gray.700">Generate Sheet Music</Text>
                  {renderAiChip("")}
                </Flex>
                <Text fontSize="xs" color="gray.500">
                  Transcribe {stemsForTranscription.map((s) => s.stemName).join(", ")} to MusicXML
                </Text>
              </Box>
              <Button size="xs" colorPalette="purple" onClick={async () => {
                for (let i = 0; i < stemsForTranscription.length; i++) {
                  if (i > 0) await new Promise((r) => setTimeout(r, 12000));
                  const stem = stemsForTranscription[i];
                  const extras = stem.stemName?.toLowerCase() === "guitar" ? { guitarMode: guitarSplitMode } : undefined;
                  await startTranscription(stem.id, "transcription", extras);
                }
              }}>
                Transcribe{stemsForTranscription.length > 1 ? " All" : ""}
              </Button>
            </Flex>
            {/* Guitar split/merge toggle */}
            {stemsForTranscription.some((s) => s.stemName?.toLowerCase() === "guitar") && (
              <Flex align="center" gap={2} mt={2} pt={2} borderTop="1px solid" borderColor="purple.100">
                <Text fontSize="xs" color="gray.600">Guitar mode:</Text>
                <Flex gap={1}>
                  <Button
                    size="2xs"
                    variant={guitarSplitMode === "split" ? "solid" : "outline"}
                    colorPalette={guitarSplitMode === "split" ? "purple" : "gray"}
                    onClick={() => setGuitarSplitMode("split")}
                  >
                    Lead + Rhythm
                  </Button>
                  <Button
                    size="2xs"
                    variant={guitarSplitMode === "merged" ? "solid" : "outline"}
                    colorPalette={guitarSplitMode === "merged" ? "purple" : "gray"}
                    onClick={() => setGuitarSplitMode("merged")}
                  >
                    Merged
                  </Button>
                </Flex>
                <Text fontSize="2xs" color="gray.400">
                  {guitarSplitMode === "split" ? "AI splits into lead & rhythm parts" : "Single guitar part"}
                </Text>
              </Flex>
            )}
          </Box>
        )}
        {transcriptionEnabled && hasCharts && stemsWithCharts.length > 0 && !isTranscribing && !isRegenerating && (
          <Flex align="center" gap={2} p={3} borderRadius="md" bg="gray.50" border="1px solid" borderColor="gray.200">
            <Box flex={1}>
              <Text fontWeight="medium" fontSize="xs" color="gray.700">Regenerate Charts</Text>
              <Text fontSize="xs" color="gray.500">
                Re-transcribe {stemsWithCharts.map((s) => s.stemName).join(", ")} with improved AI
              </Text>
            </Box>
            <Button size="xs" variant="outline" onClick={handleRegenerateCharts}>
              Regenerate
            </Button>
          </Flex>
        )}
      </VStack>
    );
  }

  function renderSyncMapStepExtra() {
    const showBeatButton = fullMix && !hasSyncMap && !isBeatProcessing && !beatProcessingError;
    return (
      <VStack align="stretch" gap={2}>
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
            <Button size="xs" colorPalette="purple" onClick={() => startBeatDetection(fullMix.id, "beat_detection")}>
              Generate
            </Button>
          </Flex>
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

  function renderSectionsStepExtra() {
    const canGenerate = hasAudio || hasSyncMap;
    return (
      <VStack align="stretch" gap={2}>
        {canGenerate && !isGeneratingSections && !sectionGenError && (
          <Flex align="center" gap={2} p={3} borderRadius="md" bg="purple.50" border="1px solid" borderColor="purple.100">
            <Box flex={1}>
              <Flex align="center" gap={1.5}>
                <Text fontWeight="medium" fontSize="xs" color="gray.700">Auto-Generate Sections</Text>
                {renderAiChip("")}
              </Flex>
              <Text fontSize="xs" color="gray.500">
                Analyze audio and sheet music to identify Intro, Verse, Chorus, etc.
              </Text>
            </Box>
            <Button size="xs" colorPalette="purple" onClick={handleGenerateSections}>
              Generate
            </Button>
          </Flex>
        )}
        {hasSections && !isGeneratingSections && (
          <Flex align="center" gap={2} p={3} borderRadius="md" bg="green.50" border="1px solid" borderColor="green.100">
            <Text fontSize="xs" color="green.700" fontWeight="medium">
              {arrangement?.sectionMarkers.length} sections defined
            </Text>
          </Flex>
        )}
      </VStack>
    );
  }

  function renderStepExtra(key: string) {
    switch (key) {
      case "audio": return renderAudioStepExtra();
      case "parts": return renderPartsStepExtra();
      case "charts": return renderChartsStepExtra();
      case "sections": return renderSectionsStepExtra();
      case "syncMap": return renderSyncMapStepExtra();
      default: return null;
    }
  }


  return (
    <Box maxW="1400px">
      {/* Header */}
      <Box mb={6}>
        <Button
          variant="ghost"
          size="sm"
          color="gray.500"
          mb={2}
          onClick={() => router.push(`/bands/${bandId}/songs/${songId}`)}
        >
          ← Back to song
        </Button>

        <Flex
          justify="space-between"
          align={{ base: "start", md: "center" }}
          direction={{ base: "column", md: "row" }}
          gap={{ base: 3, md: 0 }}
          mb={4}
        >
          <Box>
            {/* Song title — click to edit */}
            {editingSongTitle ? (
              <Input
                size="sm"
                value={songTitleDraft}
                onChange={(e) => setSongTitleDraft(e.target.value)}
                onBlur={saveSongTitle}
                onKeyDown={(e) => { if (e.key === "Enter") saveSongTitle(); if (e.key === "Escape") setEditingSongTitle(false); }}
                autoFocus
                mb={1}
                maxW="400px"
                fontWeight="medium"
                color="gray.500"
              />
            ) : (
              <Text
                fontSize="sm"
                color="gray.500"
                mb={1}
                cursor="pointer"
                _hover={{ color: "blue.500" }}
                onClick={startEditSongTitle}
                title="Click to edit song name"
              >
                {arrangement.song.title}
              </Text>
            )}
            {/* Arrangement name — click to edit */}
            <Flex align="center" gap={3} wrap="wrap">
              {editingArrName ? (
                <Input
                  size="lg"
                  value={arrNameDraft}
                  onChange={(e) => setArrNameDraft(e.target.value)}
                  onBlur={saveArrName}
                  onKeyDown={(e) => { if (e.key === "Enter") saveArrName(); if (e.key === "Escape") setEditingArrName(false); }}
                  autoFocus
                  maxW="400px"
                  fontWeight="bold"
                />
              ) : (
                <Heading
                  size={{ base: "lg", md: "xl" }}
                  color="gray.800"
                  cursor="pointer"
                  _hover={{ color: "blue.600" }}
                  onClick={startEditArrName}
                  title="Click to edit arrangement name"
                >
                  {arrangement.name}
                </Heading>
              )}
              <Text color="gray.400" fontWeight="normal" fontSize="lg">
                {arrangement.versionLabel}
              </Text>
              <Badge colorPalette={status.color} size="lg">{status.label}</Badge>
            </Flex>
          </Box>
          {arrangement.status === "published" && (
            <Flex align="center" gap={3}>
              <Button
                size="sm"
                variant="outline"
                colorPalette="gray"
                onClick={() => archiveMutation.mutate({})}
                loading={archiveMutation.isPending}
              >
                Archive
              </Button>
            </Flex>
          )}
        </Flex>

        {/* Progress bar */}
        {arrangement.status === "draft" && (
          <Box>
            <Flex justify="space-between" align="center" mb={2}>
              <Text fontSize="sm" fontWeight="medium" color="gray.600">
                Setup Progress
              </Text>
              <Text fontSize="sm" color="gray.500" fontWeight="semibold">
                {completedSteps} of {totalSteps} complete
              </Text>
            </Flex>
            <Progress.Root value={progressPct} size="sm" colorPalette={progressPct === 100 ? "green" : "blue"} borderRadius="full">
              <Progress.Track borderRadius="full" bg="gray.100">
                <Progress.Range />
              </Progress.Track>
            </Progress.Root>
          </Box>
        )}

        {/* Published banner */}
        {arrangement.status === "published" && (
          <Flex align="center" gap={3} p={4} bg="green.50" border="1px solid" borderColor="green.200" borderRadius="lg">
            <Text fontSize="lg">✓</Text>
            <Box flex={1}>
              <Text fontWeight="semibold" fontSize="sm" color="green.800">
                This arrangement is published and ready for rehearsal
              </Text>
              <Text fontSize="xs" color="green.600">
                All band members with assigned parts can now access their charts and audio.
              </Text>
            </Box>
          </Flex>
        )}

        {/* Archived banner */}
        {arrangement.status === "archived" && (
          <Flex align="center" gap={3} p={4} bg="gray.50" border="1px solid" borderColor="gray.200" borderRadius="lg">
            <Text fontSize="lg">📦</Text>
            <Box flex={1}>
              <Text fontWeight="semibold" fontSize="sm" color="gray.700">
                This arrangement has been archived
              </Text>
              <Text fontSize="xs" color="gray.500">
                It is no longer active for rehearsal but all data is preserved.
              </Text>
            </Box>
          </Flex>
        )}
      </Box>

      {/* Setup Steps - Compact Grid */}
      {arrangement.status === "draft" && (
        <Box mb={8}>
          <SimpleGrid columns={{ base: 2, md: 3, lg: 6 }} gap={3} mb={3}>
            {STEP_CONFIG.map((step, i) => {
              const done = stepStatus[i];
              const isNext = i === nextStepIndex;

              return (
                <Box
                  key={step.key}
                  role="button"
                  tabIndex={0}
                  textAlign="left"
                  p={3}
                  borderRadius="xl"
                  bg={done ? "green.50" : isNext ? "blue.50" : "gray.50"}
                  border="2px solid"
                  borderColor={done ? "green.200" : isNext ? "blue.300" : "gray.100"}
                  transition="all 0.15s"
                  _hover={{ borderColor: done ? "green.300" : "blue.300", shadow: "md", transform: "translateY(-1px)", "& .step-edit-icon": { opacity: 1 } }}
                  cursor="pointer"
                  onClick={() => handleStepAction(step.action)}
                  position="relative"
                >
                  {/* Edit icon — visible on hover */}
                  <Box
                    className="step-edit-icon"
                    position="absolute"
                    top={2}
                    right={2}
                    opacity={0}
                    transition="opacity 0.15s"
                    color="gray.400"
                  >
                    <Pencil size={14} />
                  </Box>

                  {/* Step check + label */}
                  <Flex align="center" gap={2} mb={1}>
                    <Flex
                      w="24px"
                      h="24px"
                      borderRadius="full"
                      bg={done ? "green.500" : isNext ? "blue.500" : "gray.300"}
                      align="center"
                      justify="center"
                      fontSize="xs"
                      fontWeight="bold"
                      color="white"
                      flexShrink={0}
                    >
                      {done ? "✓" : i + 1}
                    </Flex>
                    <Box>
                      <Text fontWeight="semibold" fontSize="sm" color={done ? "green.700" : "gray.800"} lineHeight="short">
                        {step.label}
                      </Text>
                      <Text fontSize="xs" color="gray.500" lineHeight="short">
                        {step.description}
                      </Text>
                    </Box>
                  </Flex>

                  {/* Action hint */}
                  {isNext && !done && (
                    <Text fontSize="xs" fontWeight="semibold" color="blue.600" mt={1}>
                      Next step →
                    </Text>
                  )}
                </Box>
              );
            })}
          </SimpleGrid>

        </Box>
      )}

      {/* Upload prompt — shown full-width when no audio exists */}
      {!hasAudio && (
        <Card.Root bg="white" borderWidth="2px" borderColor="blue.200" mb={6}>
          <Card.Body p={8}>
            <VStack gap={1} mb={4}>
              <Heading size="md" color="gray.800">
                Upload your song to get started
              </Heading>
              <Text fontSize="sm" color="gray.500">
                Drop a full mix and AI will handle the rest — stems, parts, charts, sections & sync map
              </Text>
            </VStack>
            <FileDropzone
              accept={[".wav", ".mp3", ".m4a", ".aac"]}
              onFile={handleInlineDrop}
              label="Drop audio file here or click to browse"
            />
            {isUploadingAudio && (
              <Flex align="center" justify="center" gap={2} mt={3}>
                <Spinner size="sm" />
                <Text fontSize="sm" color="blue.500">
                  Uploading... {audioProgress}%
                </Text>
              </Flex>
            )}
            {audioUploadError && (
              <Text fontSize="sm" color="red.500" mt={2} textAlign="center">
                {audioUploadError}
              </Text>
            )}
            <Text fontSize="xs" color="gray.400" mt={3} textAlign="center">
              WAV, MP3, M4A, or AAC — by uploading you confirm you have the right to use this content
            </Text>
          </Card.Body>
        </Card.Root>
      )}

      {/* Main Content - Two Column Layout */}
      <Flex gap={6} direction={{ base: "column", lg: "row" }} alignItems="stretch">
        {/* Parts & Assignments */}
        <Card.Root bg="white" borderWidth="1px" borderColor="gray.100" flex={{ base: "1 1 auto", lg: "0 0 auto" }} w={{ base: "100%", lg: "380px" }}>
          <Card.Body p={5}>
            <Heading size="sm" color="gray.800" mb={4}>Parts & Assignments</Heading>
            {sortedParts.length === 0 ? (
              <Flex direction="column" align="center" justify="center" p={8} bg="gray.50" borderRadius="lg" textAlign="center">
                <Text fontSize="2xl" mb={2}>🎵</Text>
                <Text fontSize="sm" color="gray.500" mb={3}>
                  No parts defined yet
                </Text>
                <Button size="sm" colorPalette="blue" variant="outline" onClick={() => setShowPartsModal(true)}>
                  Add Parts
                </Button>
              </Flex>
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
                  {sortedParts.map((part) => (
                    <Table.Row key={part.id}>
                      <Table.Cell>
                        <Flex align="center" gap={2}>
                          <Text fontSize="sm" fontWeight="medium">
                            {part.instrumentName}
                            {part.partName ? ` (${part.partName})` : ""}
                          </Text>
                          {part.isRequired && (
                            <Badge colorPalette="orange" size="sm" variant="subtle">req</Badge>
                          )}
                        </Flex>
                      </Table.Cell>
                      <Table.Cell>
                        {part.sheetMusicAssets.length > 0 ? (
                          <Flex align="center" gap={2}>
                            <Badge colorPalette="green" variant="subtle" fontSize="xs">
                              {part.sheetMusicAssets[0].fileType.toUpperCase()}
                            </Badge>
                            <Button
                              size="xs"
                              variant="ghost"
                              colorPalette="blue"
                              p={1}
                              minW="auto"
                              onClick={() =>
                                setPreviewAsset({
                                  objectKey: part.sheetMusicAssets[0].storageObject.objectKey,
                                  fileType: part.sheetMusicAssets[0].fileType,
                                  fileName: part.sheetMusicAssets[0].storageObject.originalFileName,
                                })
                              }
                              title="Preview"
                            >
                              <Eye size={16} />
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
                          <Text fontSize="sm" color="gray.400">—</Text>
                        )}
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            )}
          </Card.Body>
        </Card.Root>

        {/* Audio Tracks + Song Sections stacked */}
        <Box flex="1 1 auto" minW={0} display="flex" flexDirection="column" gap={4}>
          <Card.Root bg="white" borderWidth="1px" borderColor="gray.100" display="flex" flexDirection="column">
            <Card.Body p={5} display="flex" flexDirection="column" flex={1}>
              <Flex align="center" gap={2} mb={4} wrap="wrap">
                <Heading size="sm" color="gray.800">Audio Tracks</Heading>
                <Text fontSize="sm" color="gray.400" fontWeight="normal" display={{ base: "none", sm: "block" }}>— {arrangement.song.title}</Text>
              </Flex>
              {arrangement.audioAssets.length === 0 ? (
                <Flex direction="column" align="center" justify="center" p={8} bg="gray.50" borderRadius="lg" textAlign="center">
                  <Text fontSize="sm" color="gray.500" mb={3}>
                    No audio uploaded yet
                  </Text>
                  <Button size="sm" colorPalette="blue" variant="outline" onClick={() => setShowUploadAudio(true)}>
                    Upload Audio
                  </Button>
                </Flex>
              ) : (
                <AudioPlayer
                  tracks={audioTracks}
                  seekTo={audioSeekTo}
                  allowPracticeTools={allowPracticeTools}
                  tempoPercent={tempoPercent}
                  onTempoChange={setTempoPercent}
                  pitchSemitones={pitchSemitones}
                  onPitchChange={setPitchSemitones}
                />
              )}

              {/* Song Sections inline */}
              <Box mt={4} pt={3} borderTopWidth="1px" borderColor="gray.100">
                {arrangement.sectionMarkers.length === 0 ? (
                  <Flex align="center" justify="center" gap={3} flexWrap="wrap">
                    {isGeneratingSections ? (
                      <>
                        <Spinner size="sm" color="blue.500" />
                        <Text fontSize="sm" color="blue.500">Analyzing song structure...</Text>
                      </>
                    ) : sectionGenError ? (
                      <>
                        <Text fontSize="sm" color="red.500">{sectionGenError}</Text>
                        <Button size="xs" colorPalette="purple" variant="outline" onClick={handleGenerateSections}>Retry</Button>
                        <Button size="xs" colorPalette="blue" variant="outline" onClick={() => setShowSectionsModal(true)}>Add Manually</Button>
                      </>
                    ) : (
                      <>
                        <Text fontSize="xs" color="gray.500">No sections yet</Text>
                        {hasAudio && (
                          <Button size="xs" colorPalette="purple" onClick={handleGenerateSections}>
                            {renderAiChip("")} Auto-Generate
                          </Button>
                        )}
                        <Button size="xs" colorPalette="blue" variant="outline" onClick={() => setShowSectionsModal(true)}>Add Manually</Button>
                      </>
                    )}
                  </Flex>
                ) : (
                  <Flex gap={2} flexWrap="wrap" justify="center">
                    {arrangement.sectionMarkers.map((s) => {
                      const hasTime = syncPoints.length > 0;
                      return (
                        <Flex
                          key={s.id}
                          align="center"
                          gap={1.5}
                          py={1}
                          px={2.5}
                          borderRadius="md"
                          bg="blue.50"
                          cursor={hasTime ? "pointer" : "default"}
                          _hover={hasTime ? { bg: "blue.100" } : undefined}
                          onClick={hasTime ? () => handleSectionClick(s.startBar) : undefined}
                          transition="background 0.15s"
                        >
                          <Text fontSize="xs" fontWeight="medium" color="blue.700">
                            {s.name}
                          </Text>
                          <Text fontSize="2xs" color="blue.400" fontFamily="mono">
                            {s.startBar}
                          </Text>
                        </Flex>
                      );
                    })}
                  </Flex>
                )}
              </Box>
            </Card.Body>
          </Card.Root>
        </Box>
      </Flex>

      {/* Publish button */}
      {arrangement.status === "draft" && (
        <Flex justify="center" mt={6}>
          <Button
            colorPalette="green"
            size="lg"
            w={{ base: "100%", md: "50%" }}
            onClick={() => publishMutation.mutate({})}
            loading={publishMutation.isPending}
            disabled={!readiness?.isReady}
          >
            Publish Arrangement
          </Button>
        </Flex>
      )}

      {/* Charts Modal */}
      <Dialog.Root open={showUploadSheet} onOpenChange={(e) => setShowUploadSheet(e.open)}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="500px">
            <Dialog.Header>
              <Dialog.Title>Charts</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body>
              <VStack gap={4} align="stretch">
                {/* AI Generate option */}
                {transcriptionEnabled && stemsForTranscription.length > 0 && !isTranscribing && (
                  <Box>
                    <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" mb={2}>
                      Generate with AI
                    </Text>
                    {transcriptionError && (
                      <Text fontSize="xs" color="red.500" mb={2}>
                        {transcriptionError} — you can retry.
                      </Text>
                    )}
                    <Box p={3} borderRadius="md" bg="purple.50" border="1px solid" borderColor="purple.100">
                      <Flex align="center" gap={2}>
                        <Box flex={1}>
                          <Text fontSize="sm" fontWeight="medium" color="gray.700">
                            Transcribe {stemsForTranscription.map((s) => s.stemName).join(", ")}
                          </Text>
                          <Text fontSize="xs" color="gray.500">
                            Auto-generate MusicXML sheet music from audio stems
                          </Text>
                        </Box>
                        <Button size="xs" colorPalette="purple" onClick={async () => {
                          setShowUploadSheet(false);
                          for (let i = 0; i < stemsForTranscription.length; i++) {
                            if (i > 0) await new Promise((r) => setTimeout(r, 12000));
                            const stem = stemsForTranscription[i];
                            const extras = stem.stemName?.toLowerCase() === "guitar" ? { guitarMode: guitarSplitMode } : undefined;
                            await startTranscription(stem.id, "transcription", extras);
                          }
                        }}>
                          Transcribe{stemsForTranscription.length > 1 ? " All" : ""}
                        </Button>
                      </Flex>
                      {stemsForTranscription.some((s) => s.stemName?.toLowerCase() === "guitar") && (
                        <Flex align="center" gap={2} mt={2} pt={2} borderTop="1px solid" borderColor="purple.100">
                          <Text fontSize="xs" color="gray.600">Guitar:</Text>
                          <Flex gap={1}>
                            <Button
                              size="2xs"
                              variant={guitarSplitMode === "split" ? "solid" : "outline"}
                              colorPalette={guitarSplitMode === "split" ? "purple" : "gray"}
                              onClick={() => setGuitarSplitMode("split")}
                            >
                              Lead + Rhythm
                            </Button>
                            <Button
                              size="2xs"
                              variant={guitarSplitMode === "merged" ? "solid" : "outline"}
                              colorPalette={guitarSplitMode === "merged" ? "purple" : "gray"}
                              onClick={() => setGuitarSplitMode("merged")}
                            >
                              Merged
                            </Button>
                          </Flex>
                        </Flex>
                      )}
                    </Box>
                  </Box>
                )}
                {isTranscribing && (
                  <Flex align="center" gap={2} p={3} borderRadius="md" bg="blue.50" border="1px solid" borderColor="blue.100">
                    <Spinner size="sm" />
                    <Text fontSize="sm" color="blue.700">Transcription in progress...</Text>
                  </Flex>
                )}
                {/* Existing charts */}
                {hasCharts && (
                  <Box>
                    <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" mb={2}>
                      Current Charts
                    </Text>
                    <VStack gap={2} align="stretch">
                      {sortedParts.filter((p) => p.sheetMusicAssets.length > 0).map((part) => (
                        <Flex key={part.id} align="center" justify="space-between" p={2} bg="green.50" borderRadius="md" border="1px solid" borderColor="green.100">
                          <Flex align="center" gap={2}>
                            <Badge colorPalette="green" variant="subtle" fontSize="xs">
                              {part.sheetMusicAssets[0].fileType.toUpperCase()}
                            </Badge>
                            <Text fontSize="sm" fontWeight="medium">{part.instrumentName}</Text>
                          </Flex>
                          <Button
                            size="xs"
                            variant="ghost"
                            colorPalette="blue"
                            p={1}
                            minW="auto"
                            onClick={() => {
                              setPreviewAsset({
                                objectKey: part.sheetMusicAssets[0].storageObject.objectKey,
                                fileType: part.sheetMusicAssets[0].fileType,
                                fileName: part.sheetMusicAssets[0].storageObject.originalFileName,
                              });
                            }}
                            title="Preview"
                          >
                            <Eye size={16} />
                          </Button>
                        </Flex>
                      ))}
                    </VStack>
                    {stemsWithCharts.length > 0 && !isTranscribing && !isRegenerating && (
                      <Button
                        size="sm"
                        variant="outline"
                        mt={3}
                        w="full"
                        onClick={() => { setShowUploadSheet(false); handleRegenerateCharts(); }}
                        loading={isRegenerating}
                      >
                        Regenerate All Charts
                      </Button>
                    )}
                  </Box>
                )}

                {/* Upload new chart */}
                <Box>
                  <Text fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" mb={2}>
                    Upload Chart
                  </Text>
                  <form id="upload-sheet-form" onSubmit={handleSheetSubmit}>
                    <VStack gap={3} align="stretch">
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
                </Box>
              </VStack>
            </Dialog.Body>
            <Dialog.Footer>
              <Flex gap={3} w="full">
                <Button variant="outline" flex={1} onClick={() => setShowUploadSheet(false)}>
                  Close
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

      {/* Assignment Review Modal (drag-and-drop for ambiguous assignments) */}
      {bandMembers && (
        <AssignmentReviewModal
          open={showAssignReview}
          onClose={() => setShowAssignReview(false)}
          unassignedParts={reviewParts}
          members={bandMembers}
          autoAssigned={reviewAutoAssigned}
          onConfirm={handleConfirmAssignments}
          isSubmitting={isConfirmingAssignments}
        />
      )}

      {/* Sync Map Modal */}
      {arrangement && (
        <SyncMapEditorModal
          open={showSyncMapModal}
          onClose={() => setShowSyncMapModal(false)}
          arrangementId={arrangementId}
          audioAssets={arrangement.audioAssets}
        />
      )}

      {/* Parts Modal */}
      <Dialog.Root open={showPartsModal} onOpenChange={(e) => { if (!e.open) setShowPartsModal(false); }}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="640px">
            <Dialog.Header>
              <Dialog.Title>Parts</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body>
              <Flex justify="flex-end" mb={4}>
                <Button colorPalette="blue" size="sm" onClick={() => setShowAddPart(true)}>
                  Add Part
                </Button>
              </Flex>
              {parts && parts.length > 0 && (
                <Table.Root size="sm">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader>Order</Table.ColumnHeader>
                      <Table.ColumnHeader>Instrument</Table.ColumnHeader>
                      <Table.ColumnHeader>Part Name</Table.ColumnHeader>
                      <Table.ColumnHeader>Required</Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {parts.map((part) => (
                      <Table.Row
                        key={part.id}
                        cursor="pointer"
                        _hover={{ bg: "gray.50" }}
                        onClick={() => openEditPart(part)}
                      >
                        <Table.Cell>{part.displayOrder}</Table.Cell>
                        <Table.Cell>{part.instrumentName}</Table.Cell>
                        <Table.Cell>{part.partName || "—"}</Table.Cell>
                        <Table.Cell>{part.isRequired ? "Yes" : "No"}</Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              )}
              {(!parts || parts.length === 0) && (
                <Text fontSize="sm" color="gray.500" textAlign="center" py={4}>No parts defined yet. Click &quot;Add Part&quot; to get started.</Text>
              )}
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* Add Part Sub-Modal */}
      <Dialog.Root open={showAddPart} onOpenChange={(e) => { if (!e.open) { setShowAddPart(false); setPartRows([emptyPartRow()]); } }}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="640px">
            <Dialog.Header>
              <Dialog.Title>Add Parts</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body>
              <form id="modal-add-part-form" onSubmit={handleAddParts}>
                <VStack gap={3} align="stretch">
                  <Flex gap={2} px={1}>
                    <Text fontSize="xs" fontWeight="semibold" color="gray.500" flex={2}>Instrument *</Text>
                    <Text fontSize="xs" fontWeight="semibold" color="gray.500" flex={2}>Part Name</Text>
                    <Text fontSize="xs" fontWeight="semibold" color="gray.500" w="70px" textAlign="center">Required</Text>
                    <Box w="32px" />
                  </Flex>
                  {partRows.map((row, i) => (
                    <Flex key={i} gap={2} align="center">
                      <Input flex={2} size="sm" value={row.instrumentName} onChange={(e) => setPartRows((rows) => rows.map((r, j) => (j === i ? { ...r, instrumentName: e.target.value } : r)))} placeholder="e.g. Electric Guitar" required autoFocus={i === 0} />
                      <Input flex={2} size="sm" value={row.partName} onChange={(e) => setPartRows((rows) => rows.map((r, j) => (j === i ? { ...r, partName: e.target.value } : r)))} placeholder="e.g. Guitar 1" />
                      <Flex w="70px" justify="center">
                        <Checkbox.Root checked={row.isRequired} onCheckedChange={(e) => setPartRows((rows) => rows.map((r, j) => (j === i ? { ...r, isRequired: !!e.checked } : r)))}>
                          <Checkbox.HiddenInput />
                          <Checkbox.Control />
                        </Checkbox.Root>
                      </Flex>
                      <Button size="xs" variant="ghost" colorPalette="red" w="32px" minW="32px" disabled={partRows.length === 1} onClick={() => setPartRows((rows) => rows.filter((_, j) => j !== i))}>✕</Button>
                    </Flex>
                  ))}
                  <Button size="sm" variant="ghost" colorPalette="blue" alignSelf="flex-start" onClick={() => setPartRows((rows) => [...rows, emptyPartRow()])}>+ Add another part</Button>
                </VStack>
              </form>
            </Dialog.Body>
            <Dialog.Footer>
              <Flex gap={3} w="full">
                <Button variant="outline" flex={1} onClick={() => { setShowAddPart(false); setPartRows([emptyPartRow()]); }}>Cancel</Button>
                <Button type="submit" form="modal-add-part-form" colorPalette="blue" flex={1} loading={createPartMutation.isPending} disabled={!partRows.some((r) => r.instrumentName.trim())}>
                  Add {partRows.filter((r) => r.instrumentName.trim()).length === 1 ? "Part" : `${partRows.filter((r) => r.instrumentName.trim()).length} Parts`}
                </Button>
              </Flex>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* Edit Part Sub-Modal */}
      <Dialog.Root open={!!editingPart} onOpenChange={(e) => { if (!e.open) setEditingPart(null); }}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="440px">
            <Dialog.Header>
              <Dialog.Title>Edit Part</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body>
              <form id="modal-edit-part-form" onSubmit={(e) => { e.preventDefault(); updatePartMutation.mutate({ instrumentName: editInstrumentName, partName: editPartName || undefined, isRequired: editIsRequired }); }}>
                <VStack gap={4}>
                  <Field.Root>
                    <Field.Label>Instrument</Field.Label>
                    <Input value={editInstrumentName} onChange={(e) => setEditInstrumentName(e.target.value)} required autoFocus />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>Part Name (optional)</Field.Label>
                    <Input value={editPartName} onChange={(e) => setEditPartName(e.target.value)} />
                  </Field.Root>
                  <Checkbox.Root checked={editIsRequired} onCheckedChange={(e) => setEditIsRequired(!!e.checked)}>
                    <Checkbox.HiddenInput />
                    <Checkbox.Control />
                    <Checkbox.Label>Required part</Checkbox.Label>
                  </Checkbox.Root>
                </VStack>
              </form>
            </Dialog.Body>
            <Dialog.Footer>
              <Flex gap={3} w="full">
                <Button variant="outline" flex={1} onClick={() => setEditingPart(null)}>Cancel</Button>
                <Button type="submit" form="modal-edit-part-form" colorPalette="blue" flex={1} loading={updatePartMutation.isPending}>Save Changes</Button>
              </Flex>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* Assign Modal */}
      <Dialog.Root open={showAssignModal} onOpenChange={(e) => { if (!e.open) setShowAssignModal(false); }}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="640px">
            <Dialog.Header>
              <Dialog.Title>Assign Parts</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body>
              <Text fontSize="sm" color="gray.500" mb={4}>
                Select a part for each member, then click Save.
              </Text>
              {assignErrorMsg && (
                <Box bg="red.50" border="1px solid" borderColor="red.200" borderRadius="md" p={3} mb={4}>
                  <Text fontSize="sm" color="red.600">{assignErrorMsg}</Text>
                </Box>
              )}
              {bandMembers && parts ? (
                <Table.Root size="sm">
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader>Member</Table.ColumnHeader>
                      <Table.ColumnHeader>Default Instrument</Table.ColumnHeader>
                      <Table.ColumnHeader>Assigned Part</Table.ColumnHeader>
                      <Table.ColumnHeader></Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {bandMembers.map((member) => {
                      const currentPartId = getAssignedPartId(member.id);
                      const changed = hasAssignChanged(member.id);
                      const saved = assignSavedMembers[member.id];
                      return (
                        <Table.Row key={member.id}>
                          <Table.Cell><Text fontWeight="medium" fontSize="sm">{member.displayName}</Text></Table.Cell>
                          <Table.Cell><Text color="gray.500" fontSize="sm">{member.defaultInstrument || "—"}</Text></Table.Cell>
                          <Table.Cell>
                            <NativeSelect.Root size="sm">
                              <NativeSelect.Field value={currentPartId} onChange={(e) => setAssignSelectedParts((s) => ({ ...s, [member.id]: e.target.value }))}>
                                <option value="">— Select a part —</option>
                                {parts.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.instrumentName}{p.partName ? ` — ${p.partName}` : ""}
                                  </option>
                                ))}
                              </NativeSelect.Field>
                            </NativeSelect.Root>
                          </Table.Cell>
                          <Table.Cell>
                            {saved ? (
                              <Badge colorPalette="green" variant="subtle">Saved</Badge>
                            ) : (
                              <Button size="xs" colorPalette="blue" onClick={() => handleAssignSave(member.id)} loading={assignMutation.isPending} disabled={!currentPartId || !changed}>
                                Save
                              </Button>
                            )}
                          </Table.Cell>
                        </Table.Row>
                      );
                    })}
                  </Table.Body>
                </Table.Root>
              ) : (
                <Flex justify="center" py={6}><Spinner size="md" color="blue.500" /></Flex>
              )}
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* Sections Modal */}
      <Dialog.Root open={showSectionsModal} onOpenChange={(e) => { if (!e.open) { setShowSectionsModal(false); setShowAddSections(false); setSectionRows([{ ...EMPTY_SECTION_ROW }]); } }}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="640px">
            <Dialog.Header>
              <Dialog.Title>Section Markers</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body>
              <Flex justify="space-between" align="center" mb={4}>
                <Text fontSize="sm" color="gray.500">Define song sections with bar numbers.</Text>
                <Flex gap={2}>
                  {!showAddSections && (
                    <Button colorPalette="blue" size="sm" onClick={() => setShowAddSections(true)}>Add Sections</Button>
                  )}
                  <Button size="sm" variant="outline" onClick={handleGenerateSections} loading={isGeneratingSections}>AI Generate</Button>
                </Flex>
              </Flex>

              {sectionModalError && !showAddSections && (
                <Box bg="red.50" border="1px solid" borderColor="red.200" borderRadius="md" p={3} mb={4}>
                  <Text fontSize="sm" color="red.600">{sectionModalError}</Text>
                </Box>
              )}

              {/* Existing sections table */}
              {sectionsData && sectionsData.length > 0 && (
                <Table.Root size="sm" mb={showAddSections ? 4 : 0}>
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeader w="40px" color="gray.400">#</Table.ColumnHeader>
                      <Table.ColumnHeader>Name</Table.ColumnHeader>
                      <Table.ColumnHeader>Start Bar</Table.ColumnHeader>
                      <Table.ColumnHeader>End Bar</Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {sectionsData.map((s, i) => (
                      <Table.Row key={s.id} cursor="pointer" _hover={{ bg: "gray.50" }} onClick={() => openEditSection(s)}>
                        <Table.Cell><Text fontSize="xs" color="gray.400">{i + 1}</Text></Table.Cell>
                        <Table.Cell><Text fontWeight="medium" fontSize="sm">{s.name}</Text></Table.Cell>
                        <Table.Cell><Badge variant="subtle" fontFamily="mono">{s.startBar}</Badge></Table.Cell>
                        <Table.Cell>{s.endBar != null ? <Badge variant="subtle" fontFamily="mono">{s.endBar}</Badge> : <Text color="gray.400">—</Text>}</Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              )}

              {sectionsLoading && <Flex justify="center" py={4}><Spinner size="md" color="blue.500" /></Flex>}

              {/* Add sections inline form */}
              {showAddSections && (
                <Box bg="gray.50" border="1px solid" borderColor="gray.200" borderRadius="lg" p={4}>
                  <Heading size="sm" mb={2}>Add Sections</Heading>
                  <Box mb={3}>
                    <Text fontSize="xs" color="gray.500" mb={2} fontWeight="medium">Quick presets:</Text>
                    <Flex gap={2} flexWrap="wrap">
                      <Button size="xs" variant="outline" onClick={() => { setSectionRows(SECTION_PRESETS[0].map((name) => ({ name, startBar: "", endBar: "" }))); }}>Pop/Rock (8)</Button>
                      <Button size="xs" variant="outline" onClick={() => { setSectionRows(SECTION_PRESETS[1].map((name) => ({ name, startBar: "", endBar: "" }))); }}>Pop Extended (10)</Button>
                      <Button size="xs" variant="outline" onClick={() => { setSectionRows(SECTION_PRESETS[2].map((name) => ({ name, startBar: "", endBar: "" }))); }}>Jazz (5)</Button>
                    </Flex>
                  </Box>
                  {sectionModalError && (
                    <Box bg="red.50" border="1px solid" borderColor="red.200" borderRadius="md" p={3} mb={3}>
                      <Text fontSize="sm" color="red.600">{sectionModalError}</Text>
                    </Box>
                  )}
                  <VStack align="stretch" gap={2}>
                    <Flex gap={2} px={1}>
                      <Text fontSize="xs" color="gray.500" fontWeight="medium" flex={1}>Section Name</Text>
                      <Text fontSize="xs" color="gray.500" fontWeight="medium" w="80px">Start Bar</Text>
                      <Text fontSize="xs" color="gray.500" fontWeight="medium" w="80px">End Bar</Text>
                      <Box w="32px" />
                    </Flex>
                    {sectionRows.map((row, i) => (
                      <Flex key={i} gap={2} align="center">
                        <Input size="sm" flex={1} placeholder="e.g. Chorus" value={row.name} onChange={(e) => setSectionRows((prev) => prev.map((r, j) => (j === i ? { ...r, name: e.target.value } : r)))} autoFocus={i === 0} />
                        <Input size="sm" w="80px" type="number" placeholder="Bar" min={1} value={row.startBar} onChange={(e) => setSectionRows((prev) => prev.map((r, j) => (j === i ? { ...r, startBar: e.target.value } : r)))} />
                        <Input size="sm" w="80px" type="number" placeholder="End" min={1} value={row.endBar} onChange={(e) => setSectionRows((prev) => prev.map((r, j) => (j === i ? { ...r, endBar: e.target.value } : r)))} />
                        <Button size="xs" variant="ghost" color="gray.400" onClick={() => setSectionRows((prev) => prev.filter((_, j) => j !== i))} disabled={sectionRows.length <= 1} w="32px" flexShrink={0}>✕</Button>
                      </Flex>
                    ))}
                  </VStack>
                  <Flex mt={3} justify="space-between" align="center">
                    <Button size="sm" variant="ghost" onClick={() => setSectionRows((prev) => [...prev, { ...EMPTY_SECTION_ROW }])}>+ Add another row</Button>
                    <Flex gap={2}>
                      <Button size="sm" variant="outline" onClick={() => { setShowAddSections(false); setSectionRows([{ ...EMPTY_SECTION_ROW }]); setSectionModalError(null); }}>Cancel</Button>
                      <Button size="sm" colorPalette="blue" onClick={handleSubmitSections} loading={savingSections} disabled={!sectionRows.some((r) => r.name.trim() && r.startBar)}>
                        Save {sectionRows.filter((r) => r.name.trim() && r.startBar).length} section{sectionRows.filter((r) => r.name.trim() && r.startBar).length !== 1 ? "s" : ""}
                      </Button>
                    </Flex>
                  </Flex>
                </Box>
              )}
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>

      {/* Edit Section Sub-Modal */}
      <Dialog.Root open={!!editingSection} onOpenChange={(e) => { if (!e.open) setEditingSection(null); }}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content maxW="440px">
            <Dialog.Header>
              <Dialog.Title>Edit Section</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body>
              <form id="modal-edit-section-form" onSubmit={(e) => { e.preventDefault(); updateSectionMutation.mutate({ name: editSectionName, startBar: parseInt(editSectionStartBar), endBar: editSectionEndBar ? parseInt(editSectionEndBar) : undefined }); }}>
                <VStack gap={4}>
                  <Field.Root>
                    <Field.Label>Section Name</Field.Label>
                    <Input value={editSectionName} onChange={(e) => setEditSectionName(e.target.value)} required autoFocus />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>Start Bar</Field.Label>
                    <Input type="number" value={editSectionStartBar} onChange={(e) => setEditSectionStartBar(e.target.value)} required min={1} />
                  </Field.Root>
                  <Field.Root>
                    <Field.Label>End Bar (optional)</Field.Label>
                    <Input type="number" value={editSectionEndBar} onChange={(e) => setEditSectionEndBar(e.target.value)} min={1} />
                  </Field.Root>
                </VStack>
              </form>
            </Dialog.Body>
            <Dialog.Footer>
              <Flex gap={3} w="full">
                <Button variant="outline" flex={1} onClick={() => setEditingSection(null)}>Cancel</Button>
                <Button type="submit" form="modal-edit-section-form" colorPalette="blue" flex={1} loading={updateSectionMutation.isPending}>Save Changes</Button>
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
                  transposeSemitones={pitchSemitones}
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
                <Button variant="outline" flex={1} onClick={() => setShowUploadAudio(false)}>
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
      {/* Floating processing toast stack */}
      {(() => {
        const toasts: { key: string; isProcessing: boolean; error: string | null; label: string; hint: string; errorLabel: string; onRetry?: () => void; onDismiss?: () => void; pct?: number | null; pctMsg?: string | null }[] = [
          { key: "stems", isProcessing: isStemProcessing, error: stemProcessingError, label: "Separating stems...", hint: "Usually takes 1-3 minutes.", errorLabel: "Stem separation failed", onRetry: fullMix ? () => startStemSeparation(fullMix.id, "stem_separation") : undefined, pct: stemProgress, pctMsg: stemProgressLabel },
          { key: "transcription", isProcessing: isTranscribing || isRegenerating, error: transcriptionError, label: "Transcribing audio to sheet music...", hint: "May take 2-5 minutes.", errorLabel: "Transcription failed", pct: transcriptionProgress, pctMsg: transcriptionProgressLabel },
          { key: "beats", isProcessing: isBeatProcessing, error: beatProcessingError, label: "Generating sync map...", hint: "Usually under a minute.", errorLabel: "Beat detection failed", onRetry: fullMix ? () => startBeatDetection(fullMix.id, "beat_detection") : undefined, pct: beatProgress, pctMsg: beatProgressLabel },
          { key: "sections", isProcessing: isGeneratingSections, error: sectionGenError, label: "Analyzing song structure...", hint: "AI is identifying sections.", errorLabel: "Section generation failed", onRetry: handleGenerateSections, onDismiss: () => setSectionGenError(null) },
        ];
        const active = toasts.filter((t) => t.isProcessing || t.error);
        if (active.length === 0) return null;
        return (
          <VStack
            position="fixed"
            top="66px"
            left="50%"
            transform="translateX(-50%)"
            zIndex={9998}
            gap={2}
            align="stretch"
            maxW="400px"
            w="full"
          >
            {active.map((t) => {
              if (t.isProcessing) {
                const hasProgress = t.pct != null && t.pct >= 0;
                return (
                  <Box key={t.key} p={3} borderRadius="lg" bg="white" shadow="xl" border="1px solid" borderColor="blue.200">
                    <Flex align="center" gap={3}>
                      <Spinner size="sm" color="blue.500" />
                      <Box flex={1}>
                        <Flex align="center" gap={2}>
                          <Text fontWeight="medium" fontSize="xs" color="blue.700">{t.label}</Text>
                          {hasProgress && <Text fontSize="xs" color="blue.600" fontWeight="semibold">{t.pct}%</Text>}
                        </Flex>
                        <Text fontSize="xs" color="gray.500">{t.pctMsg || t.hint}</Text>
                      </Box>
                    </Flex>
                    {hasProgress && (
                      <Box mt={2}>
                        <Progress.Root value={t.pct!} size="xs" colorPalette="blue" borderRadius="full">
                          <Progress.Track borderRadius="full">
                            <Progress.Range />
                          </Progress.Track>
                        </Progress.Root>
                      </Box>
                    )}
                  </Box>
                );
              }
              return (
                <Box key={t.key} p={3} borderRadius="lg" bg="white" shadow="xl" border="1px solid" borderColor="red.200">
                  <Flex align="center" gap={2}>
                    <Box flex={1}>
                      <Text fontWeight="medium" fontSize="xs" color="red.700">{t.errorLabel}</Text>
                      <Text fontSize="xs" color="red.500">{t.error}</Text>
                    </Box>
                    {t.onRetry && (
                      <Button size="xs" variant="outline" colorPalette="red" onClick={t.onRetry}>Retry</Button>
                    )}
                    {t.onDismiss && (
                      <CloseButton size="xs" onClick={t.onDismiss} />
                    )}
                  </Flex>
                </Box>
              );
            })}
          </VStack>
        );
      })()}
    </Box>
  );
}
