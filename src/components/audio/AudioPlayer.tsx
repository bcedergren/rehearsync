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
} from "@chakra-ui/react";
import { useSignedUrls } from "@/hooks/useSignedUrl";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";

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
}: AudioPlayerProps) {
  // Resolve signed URLs for all tracks
  const objectKeys = useMemo(() => tracks.map((t) => t.url), [tracks]);
  const signedUrls = useSignedUrls(objectKeys);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [masterVolume, setMasterVolume] = useState([80]);

  // Per-track state: { [trackId]: { muted, soloed, volume } }
  const [trackStates, setTrackStates] = useState<
    Record<string, { muted: boolean; soloed: boolean; volume: number }>
  >({});

  // Initialize track states when tracks change
  useEffect(() => {
    setTrackStates((prev) => {
      const next: typeof prev = {};
      for (const t of tracks) {
        next[t.id] = prev[t.id] || {
          muted: false,
          soloed: defaultSoloTrackIds?.includes(t.id) || false,
          volume: 80,
        };
      }
      return next;
    });
  }, [tracks]);

  // Tracks container ref + waveform area measurements for unified playhead
  const tracksContainerRef = useRef<HTMLDivElement | null>(null);
  const [waveformLeft, setWaveformLeft] = useState(0);
  const [waveformWidth, setWaveformWidth] = useState(0);

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

  // Register audio elements
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
      setWaveformLeft(waveRect.left - containerRect.left);
      setWaveformWidth(waveRect.width);
    };

    // Delay initial measurement to ensure children are rendered
    const raf = requestAnimationFrame(measure);
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [tracks]);

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

  // Master audio event handlers (used as JSX props on the <audio> element)
  const handleMasterTimeUpdate = useCallback((e: React.SyntheticEvent<HTMLAudioElement>) => {
    const audio = e.currentTarget;
    setCurrentTime(audio.currentTime);
    onPositionChangeRef.current?.(audio.currentTime * 1000);
  }, []);

  const handleMasterEnded = useCallback(() => {
    setIsPlaying(false);
  }, []);

  // Drift correction: sync non-master audio elements to master
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      const masterAudio = masterTrack ? audioRefsMap.current.get(masterTrack.id) : null;
      if (!masterAudio) return;
      const masterTime = masterAudio.currentTime;
      audioRefsMap.current.forEach((audio, trackId) => {
        if (trackId === masterTrack?.id) return;
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
    setCurrentTime(time);
  }, []);

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

  // --- Track state mutators ---

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
            src={signedUrls[t.url] || undefined}
            preload="metadata"
            style={{ display: "none" }}
            {...(isMaster && {
              onTimeUpdate: handleMasterTimeUpdate,
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
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </Button>

        {/* Timestamp centered above waveform area */}
        {waveformWidth > 0 && (
          <Text
            fontSize="xs"
            color="gray.500"
            fontFamily="mono"
            position="absolute"
            left={`${waveformLeft + waveformWidth / 2}px`}
            transform="translateX(-50%)"
            pointerEvents="none"
          >
            {formatTime(currentTime)} / {formatTime(duration)}
          </Text>
        )}

        <Box flex={1} />

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

      {/* Track rows with unified playhead */}
      <Box borderWidth="1px" borderColor="gray.100" borderRadius="md" p={2} ref={tracksContainerRef} position="relative">
        {sortedTracks.map((track) => {
          const ts = trackStates[track.id] || { muted: false, soloed: false, volume: 80 };
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
              onMuteToggle={() => toggleMute(track.id)}
              onSoloToggle={() => toggleSolo(track.id)}
              onVolumeChange={(vol) => setTrackVolume(track.id, vol)}
              onDuration={handleDuration}
              audioRef={getAudioRef(track.id)}
            />
          );
        })}

        {/* Unified playhead line */}
        {duration > 0 && (
          <Box
            position="absolute"
            top={0}
            bottom={0}
            left={`${waveformLeft}px`}
            w={`${waveformWidth}px`}
            pointerEvents="none"
            zIndex={10}
          >
            <Box
              position="absolute"
              top={0}
              bottom={0}
              left={`${(currentTime / duration) * 100}%`}
              w="2px"
              bg="yellow.400"
              transition={isPlaying ? "none" : "left 0.1s"}
            />
          </Box>
        )}
      </Box>

    </Box>
  );
}
