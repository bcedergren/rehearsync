"use client";

import {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
  memo,
} from "react";
import {
  Box,
  Flex,
  Text,
  Button,
  Badge,
  Slider,
  Spinner,
} from "@chakra-ui/react";
import { useSignedUrls } from "@/hooks/useSignedUrl";
import { Play, Pause, Volume2, VolumeX, SlidersHorizontal } from "lucide-react";
import { PracticeToolsPanel } from "./PracticeToolsPanel";
import { processPitchShift, clearPitchCache } from "@/lib/audio/pitch-processor";

interface AudioTrack {
  id: string;
  url: string; // objectKey (not a direct URL)
  label: string;
  role: string;
}

interface AudioPlayerProps {
  tracks: AudioTrack[];
  /** Track IDs to solo by default on first render */
  defaultSoloTrackIds?: string[];
  positionMs?: number;
  /** Set to [ms, counter] to force a seek — increment counter to re-seek to the same position */
  seekTo?: [number, number];
  transportStatus?: string;
  onPositionChange?: (ms: number) => void;
  /** Whether practice tools (tempo/key) are unlocked for this user */
  allowPracticeTools?: boolean;
  /** Controlled tempo (50-150), managed by parent */
  tempoPercent?: number;
  onTempoChange?: (percent: number) => void;
  /** Controlled pitch semitones (-6 to +6), managed by parent */
  pitchSemitones?: number;
  onPitchChange?: (semitones: number) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const ROLE_COLORS: Record<string, string> = {
  full_mix: "blue",
  stem: "purple",
  click: "orange",
  guide: "green",
};

const WAVEFORM_COLORS: Record<string, { wave: string; progress: string }> = {
  full_mix: { wave: "#90CDF4", progress: "#3182CE" },
  stem: { wave: "#D6BCFA", progress: "#805AD5" },
  click: { wave: "#FBD38D", progress: "#DD6B20" },
  guide: { wave: "#9AE6B4", progress: "#38A169" },
};

// --- TrackRow: renders one waveform + mute/solo controls ---

interface TrackRowProps {
  track: AudioTrack;
  signedUrl: string | null | undefined;
  muted: boolean;
  soloed: boolean;
  anySoloed: boolean;
  volume: number;
  onSeek: (time: number) => void;
  onMuteToggle: () => void;
  onSoloToggle: () => void;
  onVolumeChange: (vol: number) => void;
  onDuration: (dur: number) => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
}

const TrackRow = memo(function TrackRow({
  track,
  signedUrl,
  muted,
  soloed,
  anySoloed,
  volume,
  onSeek,
  onMuteToggle,
  onSoloToggle,
  onVolumeChange,
  onDuration,
  audioRef,
}: TrackRowProps) {
  const waveformRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wsRef = useRef<any>(null);

  // Compute effective volume
  const effectivelyMuted = muted || (anySoloed && !soloed);
  const effectiveVolume = effectivelyMuted ? 0 : volume / 100;

  // Keep audio element volume in sync
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = effectiveVolume;
    }
  }, [effectiveVolume, audioRef]);

  // Report duration
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onDur = () => {
      if (audio.duration && isFinite(audio.duration)) onDuration(audio.duration);
    };
    audio.addEventListener("durationchange", onDur);
    return () => audio.removeEventListener("durationchange", onDur);
  }, [audioRef, onDuration]);

  // Initialize WaveSurfer
  useEffect(() => {
    if (!waveformRef.current || !signedUrl) return;
    const audio = audioRef.current;
    if (!audio) return;

    if (wsRef.current) {
      wsRef.current.destroy();
      wsRef.current = null;
    }

    let cancelled = false;
    const colors = WAVEFORM_COLORS[track.role] || WAVEFORM_COLORS.full_mix;

    import("wavesurfer.js").then(({ default: WS }) => {
      if (cancelled || !waveformRef.current) return;

      const ws = WS.create({
        container: waveformRef.current,
        waveColor: colors.wave,
        progressColor: colors.progress,
        cursorColor: "transparent",
        cursorWidth: 0,
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        height: 36,
        normalize: true,
        interact: true,
        media: audio,
        url: signedUrl,
      });

      ws.on("seeking", (time: number) => {
        onSeek(time);
      });

      wsRef.current = ws;
    });

    return () => {
      cancelled = true;
      if (wsRef.current) {
        wsRef.current.destroy();
        wsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track.id, signedUrl]);

  const colors = WAVEFORM_COLORS[track.role] || WAVEFORM_COLORS.full_mix;

  return (
    <Flex align="center" gap={2} py={1}>
      {/* Track label */}
      <Badge
        colorPalette={ROLE_COLORS[track.role] || "gray"}
        variant="subtle"
        fontSize="2xs"
        w="60px"
        textAlign="center"
        flexShrink={0}
      >
        {track.label}
      </Badge>

      {/* Solo button */}
      <Button
        size="xs"
        variant={soloed ? "solid" : "outline"}
        colorPalette={soloed ? "yellow" : "gray"}
        px={1.5}
        minW="26px"
        h="26px"
        fontSize="xs"
        fontWeight="bold"
        onClick={onSoloToggle}
        title="Solo"
      >
        S
      </Button>

      {/* Mute button */}
      <Button
        size="xs"
        variant={muted ? "solid" : "outline"}
        colorPalette={muted ? "red" : "gray"}
        px={1.5}
        minW="26px"
        h="26px"
        fontSize="xs"
        fontWeight="bold"
        onClick={onMuteToggle}
        title="Mute"
      >
        M
      </Button>

      {/* Waveform */}
      <Box
        ref={waveformRef}
        data-waveform
        flex={1}
        h="36px"
        borderRadius="md"
        bg="gray.50"
        overflow="hidden"
        cursor="pointer"
        opacity={effectivelyMuted ? 0.4 : 1}
        transition="opacity 0.15s"
        borderWidth="1px"
        borderColor={soloed ? "yellow.400" : "transparent"}
      />

      {/* Per-track volume */}
      <Flex align="center" gap={1} w="70px" flexShrink={0}>
        {effectivelyMuted ? (
          <VolumeX size={12} color="var(--chakra-colors-gray-400)" />
        ) : (
          <Volume2 size={12} color={colors.progress} />
        )}
        <Box flex={1}>
          <Slider.Root
            min={0}
            max={100}
            step={1}
            value={[volume]}
            onValueChange={(d) => onVolumeChange(d.value[0])}
            size="sm"
          >
            <Slider.Control>
              <Slider.Track>
                <Slider.Range />
              </Slider.Track>
              <Slider.Thumb index={0} />
            </Slider.Control>
          </Slider.Root>
        </Box>
      </Flex>
    </Flex>
  );
});

// --- Main AudioPlayer ---

export function AudioPlayer({
  tracks,
  defaultSoloTrackIds,
  positionMs,
  seekTo,
  transportStatus,
  onPositionChange,
  allowPracticeTools = false,
  tempoPercent: controlledTempo,
  onTempoChange: controlledOnTempoChange,
  pitchSemitones: controlledPitch,
  onPitchChange: controlledOnPitchChange,
}: AudioPlayerProps) {
  // Resolve signed URLs for all tracks
  const objectKeys = useMemo(() => tracks.map((t) => t.url), [tracks]);
  const signedUrls = useSignedUrls(objectKeys);

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [masterVolume, setMasterVolume] = useState([80]);

  // Practice tools state (internal fallback when not controlled)
  const [internalTempo, setInternalTempo] = useState(100);
  const [internalPitch, setInternalPitch] = useState(0);
  const tempoPercent = controlledTempo ?? internalTempo;
  const pitchSemitones = controlledPitch ?? internalPitch;
  const onTempoChange = controlledOnTempoChange ?? setInternalTempo;
  const onPitchChange = controlledOnPitchChange ?? setInternalPitch;

  const [showPracticeTools, setShowPracticeTools] = useState(false);
  const [isPitchProcessing, setIsPitchProcessing] = useState(false);

  // Pitch-shifted blob URLs: trackId → blob URL (replaces signedUrl when pitch ≠ 0)
  const [pitchShiftedUrls, setPitchShiftedUrls] = useState<Map<string, string>>(new Map());
  const activePitchRef = useRef(0); // tracks which pitch value the current blob URLs are for

  // Use a ref for currentTime to avoid re-renders on every frame
  const currentTimeRef = useRef(0);

  // DOM refs for direct manipulation (no re-renders)
  const playheadRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<HTMLParagraphElement | null>(null);
  const durationRef = useRef(0);
  // Keep durationRef in sync with state
  useEffect(() => { durationRef.current = duration; }, [duration]);

  // Per-track state: { [trackId]: { muted, soloed, volume } }
  const [trackStates, setTrackStates] = useState<
    Record<string, { muted: boolean; soloed: boolean; volume: number }>
  >({});

  // Stable track IDs string for dependency comparison
  const trackIdsKey = useMemo(() => tracks.map((t) => t.id).join(","), [tracks]);

  // Initialize track states when tracks change (by ID, not reference)
  useEffect(() => {
    setTrackStates((prev) => {
      const next: typeof prev = {};
      let changed = false;
      for (const t of tracks) {
        if (prev[t.id]) {
          next[t.id] = prev[t.id];
        } else {
          changed = true;
          next[t.id] = {
            muted: false,
            soloed: defaultSoloTrackIds?.includes(t.id) || false,
            volume: 80,
          };
        }
      }
      // Also check if any old keys were removed
      if (!changed && Object.keys(prev).length === Object.keys(next).length) {
        return prev; // No change — return same reference to skip re-render
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackIdsKey]);

  // Tracks container ref + waveform area measurements for unified playhead
  const tracksContainerRef = useRef<HTMLDivElement | null>(null);
  const waveformLeftRef = useRef(0);
  const waveformWidthRef = useRef(0);
  const [waveformMeasured, setWaveformMeasured] = useState(false);

  // Audio element refs — one per track
  const audioRefsMap = useRef<Map<string, HTMLAudioElement>>(new Map());
  const audioRefAccessors = useRef<Map<string, React.RefObject<HTMLAudioElement | null>>>(new Map());

  // Create stable ref objects for each track
  const getAudioRef = useCallback((trackId: string) => {
    if (!audioRefAccessors.current.has(trackId)) {
      const ref = { current: null } as React.RefObject<HTMLAudioElement | null>;
      audioRefAccessors.current.set(trackId, ref);
    }
    return audioRefAccessors.current.get(trackId)!;
  }, []);

  const onPositionChangeRef = useRef(onPositionChange);
  onPositionChangeRef.current = onPositionChange;

  // Register audio elements — stable callback per track
  const registerAudio = useCallback((trackId: string, el: HTMLAudioElement | null) => {
    if (el) {
      audioRefsMap.current.set(trackId, el);
      const ref = getAudioRef(trackId);
      (ref as { current: HTMLAudioElement | null }).current = el;
    } else {
      audioRefsMap.current.delete(trackId);
    }
  }, [getAudioRef]);

  // Measure waveform column position for unified playhead
  useEffect(() => {
    const container = tracksContainerRef.current;
    if (!container) return;

    const measure = () => {
      const waveformEl = container.querySelector("[data-waveform]") as HTMLElement | null;
      if (!waveformEl) return;
      const containerRect = container.getBoundingClientRect();
      const waveRect = waveformEl.getBoundingClientRect();
      waveformLeftRef.current = waveRect.left - containerRect.left;
      waveformWidthRef.current = waveRect.width;
      setWaveformMeasured(waveRect.width > 0);
    };

    // Delay initial measurement to ensure children are rendered
    const raf = requestAnimationFrame(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackIdsKey]);

  // Determine master track (full_mix first, then first track)
  const masterTrack = useMemo(
    () => tracks.find((t) => t.role === "full_mix") || tracks[0],
    [tracks]
  );

  const anySoloed = useMemo(
    () => Object.values(trackStates).some((s) => s.soloed),
    [trackStates]
  );

  // Sort: full_mix first, then stems, then others
  const sortedTracks = useMemo(() => {
    const order: Record<string, number> = { full_mix: 0, stem: 1, click: 2, guide: 3 };
    return [...tracks].sort((a, b) => (order[a.role] ?? 99) - (order[b.role] ?? 99));
  }, [tracks]);

  // --- Apply tempo via playbackRate ---
  useEffect(() => {
    const rate = tempoPercent / 100;
    audioRefsMap.current.forEach((audio) => {
      audio.playbackRate = rate;
      audio.preservesPitch = true;
    });
  }, [tempoPercent]);

  // --- Offline pitch processing ---
  useEffect(() => {
    if (pitchSemitones === 0) {
      // Reset to original URLs
      if (activePitchRef.current !== 0) {
        setPitchShiftedUrls(new Map());
        activePitchRef.current = 0;
      }
      return;
    }

    // Build map of trackId → signed URL for processing
    const trackUrlMap = new Map<string, string>();
    for (const t of tracks) {
      const url = signedUrls[t.url];
      if (url) trackUrlMap.set(t.id, url);
    }
    if (trackUrlMap.size === 0) return;

    let cancelled = false;
    setIsPitchProcessing(true);

    // Remember current position before processing
    const masterAudio = masterTrack ? audioRefsMap.current.get(masterTrack.id) : null;
    const savedTime = masterAudio?.currentTime ?? 0;
    const wasPlaying = isPlaying;

    // Pause during processing to avoid audio glitches on source swap
    if (wasPlaying) {
      audioRefsMap.current.forEach((audio) => audio.pause());
    }

    processPitchShift(trackUrlMap, pitchSemitones)
      .then((result) => {
        if (cancelled) return;
        setPitchShiftedUrls(result);
        activePitchRef.current = pitchSemitones;
        setIsPitchProcessing(false);

        // Restore position and playback after source swap settles
        // Use a small timeout to let the browser load the new blob URLs
        setTimeout(() => {
          if (cancelled) return;
          audioRefsMap.current.forEach((audio) => {
            audio.currentTime = savedTime;
          });
          if (wasPlaying) {
            audioRefsMap.current.forEach((audio) => {
              if (audio.src) audio.play().catch(() => {});
            });
            setIsPlaying(true);
          }
        }, 100);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[AudioPlayer] Pitch shift failed:", err);
        setIsPitchProcessing(false);
        // Resume playback on error
        if (wasPlaying) {
          audioRefsMap.current.forEach((audio) => {
            if (audio.src) audio.play().catch(() => {});
          });
          setIsPlaying(true);
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pitchSemitones, trackIdsKey]);

  // Cleanup pitch cache on unmount
  useEffect(() => {
    return () => clearPitchCache();
  }, []);

  // Compute effective src for each track (pitch-shifted blob URL or signed URL)
  const getTrackSrc = useCallback(
    (track: AudioTrack): string | undefined => {
      if (pitchSemitones !== 0 && pitchShiftedUrls.has(track.id)) {
        return pitchShiftedUrls.get(track.id);
      }
      return signedUrls[track.url] || undefined;
    },
    [pitchSemitones, pitchShiftedUrls, signedUrls]
  );

  // --- RAF loop: update playhead & timer via direct DOM manipulation ---
  const isPlayingRef = useRef(false);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  const updatePlayheadDOM = useCallback((time: number) => {
    const dur = durationRef.current;
    if (playheadRef.current && dur > 0) {
      playheadRef.current.style.left = `${(time / dur) * 100}%`;
    }
    if (timerRef.current) {
      timerRef.current.textContent = `${formatTime(time)} / ${formatTime(dur)}`;
    }
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    let rafId: number;
    const tick = () => {
      const masterAudio = masterTrack ? audioRefsMap.current.get(masterTrack.id) : null;
      if (masterAudio) {
        const time = masterAudio.currentTime;
        currentTimeRef.current = time;
        updatePlayheadDOM(time);
        onPositionChangeRef.current?.(time * 1000);
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, masterTrack, updatePlayheadDOM]);

  // Handle master audio ended
  const handleMasterEnded = useCallback(() => {
    setIsPlaying(false);
  }, []);

  // Drift correction: sync non-master audio elements to master
  useEffect(() => {
    if (!isPlaying) return;
    const masterTrackId = masterTrack?.id;
    const interval = setInterval(() => {
      const masterAudio = masterTrackId ? audioRefsMap.current.get(masterTrackId) : null;
      if (!masterAudio) return;
      const masterTime = masterAudio.currentTime;
      audioRefsMap.current.forEach((audio, trackId) => {
        if (trackId === masterTrackId) return;
        if (Math.abs(audio.currentTime - masterTime) > 0.05) {
          audio.currentTime = masterTime;
        }
      });
    }, 500);
    return () => clearInterval(interval);
  }, [isPlaying, masterTrack]);

  // Apply master volume
  useEffect(() => {
    const mv = masterVolume[0] / 100;
    audioRefsMap.current.forEach((audio, trackId) => {
      const ts = trackStates[trackId];
      if (!ts) return;
      const effectivelyMuted = ts.muted || (anySoloed && !ts.soloed);
      audio.volume = effectivelyMuted ? 0 : (ts.volume / 100) * mv;
    });
  }, [masterVolume, trackStates, anySoloed]);

  // Sync with external transport position
  useEffect(() => {
    if (positionMs != null && !isPlaying) {
      const posSec = positionMs / 1000;
      const masterAudio = masterTrack ? audioRefsMap.current.get(masterTrack.id) : null;
      if (masterAudio && Math.abs(masterAudio.currentTime - posSec) > 1) {
        seekAll(posSec);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionMs, isPlaying]);

  // Imperative seek from parent (e.g. clicking a section)
  useEffect(() => {
    if (!seekTo) return;
    const [ms] = seekTo;
    seekAll(ms / 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seekTo]);

  // Sync with external transport status
  useEffect(() => {
    if (!transportStatus) return;
    if (transportStatus === "playing" && !isPlaying) {
      playAll();
    } else if (transportStatus === "paused" && isPlaying) {
      pauseAll();
    } else if (transportStatus === "stopped") {
      pauseAll();
      seekAll(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transportStatus]);

  // Track duration reports
  const handleDuration = useCallback((dur: number) => {
    setDuration((prev) => Math.max(prev, dur));
  }, []);

  // --- Playback controls ---

  const playAll = useCallback(() => {
    const promises: Promise<void>[] = [];
    audioRefsMap.current.forEach((audio) => {
      if (audio.src) {
        promises.push(audio.play().catch(() => {}));
      }
    });
    if (promises.length > 0) {
      Promise.all(promises).then(() => setIsPlaying(true));
    }
  }, []);

  const pauseAll = useCallback(() => {
    audioRefsMap.current.forEach((audio) => audio.pause());
    setIsPlaying(false);
  }, []);

  const seekAll = useCallback((time: number) => {
    audioRefsMap.current.forEach((audio) => {
      audio.currentTime = time;
    });
    currentTimeRef.current = time;
    updatePlayheadDOM(time);
  }, [updatePlayheadDOM]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pauseAll();
    } else {
      playAll();
    }
  }, [isPlaying, playAll, pauseAll]);

  // Handle seek from any track row waveform
  const handleSeek = useCallback((time: number) => {
    seekAll(time);
  }, [seekAll]);

  // --- Track state mutators (stable callbacks) ---

  const toggleMute = useCallback((trackId: string) => {
    setTrackStates((prev) => ({
      ...prev,
      [trackId]: { ...prev[trackId], muted: !prev[trackId]?.muted },
    }));
  }, []);

  const toggleSolo = useCallback((trackId: string) => {
    setTrackStates((prev) => ({
      ...prev,
      [trackId]: { ...prev[trackId], soloed: !prev[trackId]?.soloed },
    }));
  }, []);

  const setTrackVolume = useCallback((trackId: string, vol: number) => {
    setTrackStates((prev) => ({
      ...prev,
      [trackId]: { ...prev[trackId], volume: vol },
    }));
  }, []);

  // Stable per-track callbacks to avoid breaking TrackRow memo
  const trackCallbacks = useMemo(() => {
    const map: Record<string, {
      onMuteToggle: () => void;
      onSoloToggle: () => void;
      onVolumeChange: (vol: number) => void;
    }> = {};
    for (const t of tracks) {
      map[t.id] = {
        onMuteToggle: () => toggleMute(t.id),
        onSoloToggle: () => toggleSolo(t.id),
        onVolumeChange: (vol: number) => setTrackVolume(t.id, vol),
      };
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackIdsKey, toggleMute, toggleSolo, setTrackVolume]);

  if (tracks.length === 0) {
    return (
      <Flex h="80px" align="center" justify="center" bg="gray.50" borderRadius="md">
        <Text color="gray.400" fontSize="sm">
          No audio tracks available.
        </Text>
      </Flex>
    );
  }

  return (
    <Box w="full">
      {/* Hidden audio elements — one per track */}
      {tracks.map((t) => {
        const isMaster = masterTrack?.id === t.id;
        return (
          <audio
            key={t.id}
            ref={(el) => registerAudio(t.id, el)}
            src={getTrackSrc(t)}
            crossOrigin="anonymous"
            preload="metadata"
            style={{ display: "none" }}
            {...(isMaster && {
              onEnded: handleMasterEnded,
            })}
          />
        );
      })}

      {/* Transport controls */}
      <Flex align="center" gap={3} mb={2} position="relative">
        <Button
          size="sm"
          variant="solid"
          colorPalette={isPlaying ? "orange" : "green"}
          onClick={togglePlay}
          px={3}
          minW="40px"
          disabled={isPitchProcessing}
        >
          {isPitchProcessing ? (
            <Spinner size="sm" />
          ) : isPlaying ? (
            <Pause size={16} />
          ) : (
            <Play size={16} />
          )}
        </Button>

        {/* Timestamp centered above waveform area — updated via ref, not state */}
        <Text
          as="span"
          ref={timerRef}
          fontSize="xs"
          color="gray.500"
          fontFamily="mono"
          position="absolute"
          left="50%"
          transform="translateX(-50%)"
          pointerEvents="none"
          visibility={waveformMeasured ? "visible" : "hidden"}
        >
          0:00 / 0:00
        </Text>

        <Box flex={1} />

        {/* Practice tools toggle */}
        {allowPracticeTools !== undefined && (
          <Button
            size="xs"
            variant={showPracticeTools ? "solid" : "ghost"}
            colorPalette={showPracticeTools ? "purple" : "gray"}
            onClick={() => setShowPracticeTools((v) => !v)}
            title="Practice tools (tempo & key)"
            px={1.5}
          >
            <SlidersHorizontal size={14} />
          </Button>
        )}

        <Volume2 size={14} color="var(--chakra-colors-gray-400)" />
        <Box w="80px">
          <Slider.Root
            min={0}
            max={100}
            step={1}
            value={masterVolume}
            onValueChange={(d) => setMasterVolume(d.value)}
            size="sm"
          >
            <Slider.Control>
              <Slider.Track>
                <Slider.Range />
              </Slider.Track>
              <Slider.Thumb index={0} />
            </Slider.Control>
          </Slider.Root>
        </Box>
      </Flex>

      {/* Practice tools panel (collapsible) */}
      {showPracticeTools && (
        <Box mb={2}>
          <PracticeToolsPanel
            tempoPercent={tempoPercent}
            onTempoChange={onTempoChange}
            pitchSemitones={pitchSemitones}
            onPitchChange={onPitchChange}
            isLocked={!allowPracticeTools}
            isPitchProcessing={isPitchProcessing}
          />
        </Box>
      )}

      {/* Track rows with unified playhead */}
      <Box borderWidth="1px" borderColor="gray.100" borderRadius="md" p={2} ref={tracksContainerRef} position="relative">
        {sortedTracks.map((track) => {
          const ts = trackStates[track.id] || { muted: false, soloed: false, volume: 80 };
          const cbs = trackCallbacks[track.id];
          return (
            <TrackRow
              key={track.id}
              track={track}
              signedUrl={signedUrls[track.url]}
              muted={ts.muted}
              soloed={ts.soloed}
              anySoloed={anySoloed}
              volume={ts.volume}
              onSeek={handleSeek}
              onMuteToggle={cbs?.onMuteToggle ?? (() => toggleMute(track.id))}
              onSoloToggle={cbs?.onSoloToggle ?? (() => toggleSolo(track.id))}
              onVolumeChange={cbs?.onVolumeChange ?? ((vol) => setTrackVolume(track.id, vol))}
              onDuration={handleDuration}
              audioRef={getAudioRef(track.id)}
            />
          );
        })}

        {/* Unified playhead line — positioned via ref, not state */}
        <Box
          position="absolute"
          top={0}
          bottom={0}
          left={`${waveformLeftRef.current}px`}
          w={`${waveformWidthRef.current}px`}
          pointerEvents="none"
          zIndex={10}
          visibility={duration > 0 ? "visible" : "hidden"}
        >
          <Box
            ref={playheadRef}
            position="absolute"
            top={0}
            bottom={0}
            left="0%"
            w="2px"
            bg="yellow.400"
          />
        </Box>
      </Box>

    </Box>
  );
}
