"use client";

import {
  Box,
  Button,
  Dialog,
  CloseButton,
  Heading,
  Text,
  VStack,
  Badge,
  Flex,
  Spinner,
  Table,
  NativeSelect,
  Field,
  Input,
} from "@chakra-ui/react";
import { useState, useRef, useEffect, useCallback } from "react";
import { useApiQuery, useApiMutation } from "@/hooks/useApi";
import { useSignedUrl } from "@/hooks/useSignedUrl";

interface AudioAsset {
  id: string;
  assetRole: string;
  stemName: string | null;
  storageObject: { objectKey: string; originalFileName: string };
}

interface SyncMapListItem {
  id: string;
  versionNum: number;
  status: string;
  isActive: boolean;
  sourceType: string;
  _count: { points: number };
}

interface SyncMapPoint {
  id: string;
  timeMs: number;
  barNumber: number;
  beatNumber: number | null;
  tickOffset: number | null;
}

interface SyncMapDetail {
  id: string;
  versionNum: number;
  status: string;
  isActive: boolean;
  points: SyncMapPoint[];
}

function formatMs(ms: number): string {
  const totalSec = ms / 1000;
  const m = Math.floor(totalSec / 60);
  const s = Math.floor(totalSec % 60);
  const frac = Math.floor((totalSec % 1) * 10);
  return `${m}:${s.toString().padStart(2, "0")}.${frac}`;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface Props {
  open: boolean;
  onClose: () => void;
  arrangementId: string;
  audioAssets: AudioAsset[];
}

export function SyncMapEditorModal({ open, onClose, arrangementId, audioAssets }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [selectedSyncMapId, setSelectedSyncMapId] = useState<string | null>(null);
  const [nextBar, setNextBar] = useState(1);
  const [tappedPoints, setTappedPoints] = useState<{ timeMs: number; barNumber: number }[]>([]);
  const [mode, setMode] = useState<"select" | "create" | "edit">("select");

  // Auto-select first audio asset when modal opens
  useEffect(() => {
    if (open && audioAssets.length > 0 && !selectedAssetId) {
      setSelectedAssetId(audioAssets[0].id);
    }
  }, [open, audioAssets, selectedAssetId]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [open]);

  const { data: syncMaps, refetch: refetchSyncMaps } = useApiQuery<SyncMapListItem[]>(
    ["syncMaps", selectedAssetId || ""],
    `/audio/${selectedAssetId}/sync-maps`,
    { enabled: !!selectedAssetId && open }
  );

  const { data: syncMapDetail, refetch: refetchDetail } = useApiQuery<SyncMapDetail>(
    ["syncMap", selectedSyncMapId || ""],
    `/sync-maps/${selectedSyncMapId}`,
    { enabled: !!selectedSyncMapId && open }
  );

  const createSyncMap = useApiMutation(
    `/audio/${selectedAssetId}/sync-maps`,
    "POST",
    {
      onSuccess: (data: SyncMapListItem) => {
        setSelectedSyncMapId(data.id);
        setMode("edit");
        setTappedPoints([]);
        setNextBar(1);
        refetchSyncMaps();
      },
    }
  );

  const addPoints = useApiMutation(
    `/sync-maps/${selectedSyncMapId}/points`,
    "POST",
    {
      onSuccess: () => {
        setTappedPoints([]);
        refetchDetail();
      },
    }
  );

  const activateSyncMap = useApiMutation(
    `/sync-maps/${selectedSyncMapId}/activate`,
    "POST",
    {
      invalidateKeys: [
        ["arrangement", arrangementId],
        ["readiness", arrangementId],
      ],
      onSuccess: () => {
        refetchSyncMaps();
        refetchDetail();
      },
    }
  );

  // Audio time tracking
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onDur = () => setDuration(audio.duration || 0);
    const onEnd = () => setIsPlaying(false);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("durationchange", onDur);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("durationchange", onDur);
      audio.removeEventListener("ended", onEnd);
    };
  }, [selectedAssetId]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }, [isPlaying]);

  const handleTap = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const timeMs = Math.round(audio.currentTime * 1000);
    setTappedPoints((prev) => [...prev, { timeMs, barNumber: nextBar }]);
    setNextBar((b) => b + 1);
  }, [nextBar]);

  // Keyboard shortcut: spacebar to tap
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.code === "Space" && mode === "edit" && isPlaying) {
        e.preventDefault();
        handleTap();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, mode, isPlaying, handleTap]);

  const handleSavePoints = () => {
    if (tappedPoints.length === 0 || !selectedSyncMapId) return;
    addPoints.mutate({
      points: tappedPoints.map((p) => ({
        timeMs: p.timeMs,
        barNumber: p.barNumber,
      })),
    });
  };

  const handleDeletePoint = async (pointId: string) => {
    await fetch(`/api/v1/sync-maps/${selectedSyncMapId}/points/${pointId}`, {
      method: "DELETE",
    });
    refetchDetail();
  };

  const seekTo = (ms: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = ms / 1000;
      setCurrentTime(ms / 1000);
    }
  };

  const activeAsset = audioAssets.find((a) => a.id === selectedAssetId);
  const audioSignedUrl = useSignedUrl(activeAsset?.storageObject.objectKey || null);

  const allPoints = [
    ...(syncMapDetail?.points || []),
    ...tappedPoints.map((p, i) => ({
      id: `pending-${i}`,
      timeMs: p.timeMs,
      barNumber: p.barNumber,
      beatNumber: null,
      tickOffset: null,
      pending: true,
    })),
  ].sort((a, b) => a.barNumber - b.barNumber);

  return (
    <Dialog.Root open={open} onOpenChange={(e) => { if (!e.open) onClose(); }}>
      <Dialog.Backdrop />
      <Dialog.Positioner>
        <Dialog.Content maxW="800px" w="90vw">
          <Dialog.Header>
            <Dialog.Title>Sync Map Editor</Dialog.Title>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
          </Dialog.Header>
          <Dialog.Body>
            <Text fontSize="sm" color="gray.500" mb={4}>
              Map audio timestamps to bar numbers for real-time score following.
            </Text>

            {audioAssets.length === 0 ? (
              <Box p={6} textAlign="center" bg="gray.50" borderRadius="lg">
                <Text color="gray.500">No audio assets uploaded yet. Upload a backing track first.</Text>
              </Box>
            ) : (
              <>
                {/* Audio Selection + Player */}
                <Box mb={4}>
                  <Flex gap={4} align="end" mb={3}>
                    <Field.Root flex={1}>
                      <Field.Label>Audio Track</Field.Label>
                      <NativeSelect.Root>
                        <NativeSelect.Field
                          value={selectedAssetId || ""}
                          onChange={(e) => {
                            setSelectedAssetId(e.target.value);
                            setSelectedSyncMapId(null);
                            setMode("select");
                            setTappedPoints([]);
                          }}
                        >
                          {audioAssets.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.stemName || a.assetRole.replace("_", " ")} — {a.storageObject.originalFileName}
                            </option>
                          ))}
                        </NativeSelect.Field>
                      </NativeSelect.Root>
                    </Field.Root>
                  </Flex>

                  {activeAsset && audioSignedUrl && (
                    <>
                      <audio ref={audioRef} src={audioSignedUrl} preload="metadata" />
                      <Flex align="center" gap={3}>
                        <Button
                          size="sm"
                          variant="solid"
                          colorPalette={isPlaying ? "orange" : "green"}
                          onClick={togglePlay}
                          w="70px"
                        >
                          {isPlaying ? "Pause" : "Play"}
                        </Button>
                        <Text fontSize="xs" color="gray.500" fontFamily="mono">
                          {formatTime(currentTime)} / {formatTime(duration)}
                        </Text>
                        <Box
                          flex={1}
                          h="6px"
                          bg="gray.100"
                          borderRadius="full"
                          cursor="pointer"
                          position="relative"
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const pct = (e.clientX - rect.left) / rect.width;
                            seekTo(pct * duration * 1000);
                          }}
                        >
                          <Box
                            h="full"
                            bg="blue.400"
                            borderRadius="full"
                            w={`${duration ? (currentTime / duration) * 100 : 0}%`}
                            transition="width 0.1s"
                          />
                          {allPoints.map((p) => (
                            <Box
                              key={p.id}
                              position="absolute"
                              top="-2px"
                              h="10px"
                              w="2px"
                              bg={"pending" in p ? "orange.400" : "green.500"}
                              left={`${duration ? (p.timeMs / (duration * 1000)) * 100 : 0}%`}
                            />
                          ))}
                        </Box>
                      </Flex>
                    </>
                  )}
                </Box>

                {/* Existing Sync Maps */}
                <Box mb={4} p={4} bg="gray.50" borderRadius="lg">
                  <Flex justify="space-between" align="center" mb={3}>
                    <Heading size="sm" color="gray.800">Sync Maps</Heading>
                    <Button
                      size="sm"
                      colorPalette="blue"
                      onClick={() => createSyncMap.mutate({ sourceType: "manual" })}
                      loading={createSyncMap.isPending}
                      disabled={!selectedAssetId}
                    >
                      New Sync Map
                    </Button>
                  </Flex>

                  {!syncMaps || syncMaps.length === 0 ? (
                    <Text fontSize="sm" color="gray.500" textAlign="center" py={2}>
                      No sync maps yet. Create one to start mapping.
                    </Text>
                  ) : (
                    <VStack align="stretch" gap={2}>
                      {syncMaps.map((sm) => (
                        <Flex
                          key={sm.id}
                          align="center"
                          p={3}
                          borderRadius="md"
                          bg={selectedSyncMapId === sm.id ? "blue.50" : "white"}
                          border="1px solid"
                          borderColor={selectedSyncMapId === sm.id ? "blue.200" : "gray.200"}
                          cursor="pointer"
                          onClick={() => {
                            setSelectedSyncMapId(sm.id);
                            setMode("edit");
                            setTappedPoints([]);
                            setNextBar((syncMapDetail?.points?.length || 0) + 1);
                          }}
                          _hover={{ borderColor: "blue.200" }}
                        >
                          <Box flex={1}>
                            <Flex align="center" gap={2}>
                              <Text fontSize="sm" fontWeight="medium">v{sm.versionNum}</Text>
                              <Badge colorPalette={sm.isActive ? "green" : sm.status === "draft" ? "yellow" : "gray"} size="sm">
                                {sm.isActive ? "Active" : sm.status}
                              </Badge>
                              <Text fontSize="xs" color="gray.400">{sm._count.points} points</Text>
                            </Flex>
                          </Box>
                          {!sm.isActive && sm._count.points > 0 && (
                            <Button
                              size="xs"
                              colorPalette="green"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSyncMapId(sm.id);
                                activateSyncMap.mutate({});
                              }}
                            >
                              Activate
                            </Button>
                          )}
                        </Flex>
                      ))}
                    </VStack>
                  )}
                </Box>

                {/* Tap-to-Mark Editor */}
                {mode === "edit" && selectedSyncMapId && (
                  <Box>
                    <Heading size="sm" color="gray.800" mb={2}>Tap-to-Mark</Heading>
                    <Text fontSize="sm" color="gray.500" mb={3}>
                      Play the audio and tap the button (or press Space) on each downbeat.
                    </Text>

                    <Flex align="center" gap={4} mb={4} flexWrap="wrap">
                      <Field.Root w="120px">
                        <Field.Label>Next Bar #</Field.Label>
                        <Input
                          type="number"
                          min={1}
                          value={nextBar}
                          onChange={(e) => setNextBar(parseInt(e.target.value) || 1)}
                          size="sm"
                        />
                      </Field.Root>
                      <Button
                        size="lg"
                        colorPalette="purple"
                        onClick={handleTap}
                        disabled={!isPlaying}
                        px={8}
                      >
                        TAP — Bar {nextBar}
                      </Button>
                      {tappedPoints.length > 0 && (
                        <Flex gap={2}>
                          <Button size="sm" colorPalette="green" onClick={handleSavePoints} loading={addPoints.isPending}>
                            Save {tappedPoints.length} Points
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setTappedPoints([]);
                              setNextBar((syncMapDetail?.points?.length || 0) + 1);
                            }}
                          >
                            Discard
                          </Button>
                        </Flex>
                      )}
                    </Flex>

                    {/* Points Table */}
                    {allPoints.length > 0 && (
                      <Box maxH="300px" overflowY="auto">
                        <Table.Root size="sm">
                          <Table.Header>
                            <Table.Row>
                              <Table.ColumnHeader color="gray.500" fontSize="xs" textTransform="uppercase">Bar</Table.ColumnHeader>
                              <Table.ColumnHeader color="gray.500" fontSize="xs" textTransform="uppercase">Time</Table.ColumnHeader>
                              <Table.ColumnHeader color="gray.500" fontSize="xs" textTransform="uppercase">Status</Table.ColumnHeader>
                              <Table.ColumnHeader color="gray.500" fontSize="xs" textTransform="uppercase" w="80px">Actions</Table.ColumnHeader>
                            </Table.Row>
                          </Table.Header>
                          <Table.Body>
                            {allPoints.map((point) => {
                              const isPending = "pending" in point;
                              return (
                                <Table.Row
                                  key={point.id}
                                  bg={isPending ? "orange.50" : undefined}
                                  cursor="pointer"
                                  _hover={{ bg: isPending ? "orange.100" : "gray.50" }}
                                  onClick={() => seekTo(point.timeMs)}
                                >
                                  <Table.Cell><Text fontSize="sm" fontWeight="medium" fontFamily="mono">{point.barNumber}</Text></Table.Cell>
                                  <Table.Cell><Text fontSize="sm" fontFamily="mono" color="gray.600">{formatMs(point.timeMs)}</Text></Table.Cell>
                                  <Table.Cell>
                                    <Badge colorPalette={isPending ? "orange" : "green"} variant="subtle" size="sm">
                                      {isPending ? "Unsaved" : "Saved"}
                                    </Badge>
                                  </Table.Cell>
                                  <Table.Cell>
                                    {isPending ? (
                                      <Button size="xs" variant="ghost" colorPalette="red" onClick={(e) => { e.stopPropagation(); setTappedPoints((prev) => prev.filter((_, i) => `pending-${i}` !== point.id)); }}>
                                        Remove
                                      </Button>
                                    ) : (
                                      <Button size="xs" variant="ghost" colorPalette="red" onClick={(e) => { e.stopPropagation(); handleDeletePoint(point.id); }}>
                                        Delete
                                      </Button>
                                    )}
                                  </Table.Cell>
                                </Table.Row>
                              );
                            })}
                          </Table.Body>
                        </Table.Root>
                      </Box>
                    )}

                    {/* Activate button */}
                    {syncMapDetail && !syncMapDetail.isActive && (syncMapDetail.points.length > 0 || tappedPoints.length > 0) && (
                      <Flex mt={4} justify="end">
                        <Button
                          colorPalette="green"
                          onClick={() => activateSyncMap.mutate({})}
                          loading={activateSyncMap.isPending}
                          disabled={tappedPoints.length > 0}
                        >
                          Activate This Sync Map
                        </Button>
                        {tappedPoints.length > 0 && (
                          <Text fontSize="xs" color="gray.400" ml={3} alignSelf="center">
                            Save unsaved points first
                          </Text>
                        )}
                      </Flex>
                    )}
                  </Box>
                )}
              </>
            )}
          </Dialog.Body>
        </Dialog.Content>
      </Dialog.Positioner>
    </Dialog.Root>
  );
}
