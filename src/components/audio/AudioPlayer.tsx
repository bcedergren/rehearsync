"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Flex,
  Text,
  Button,
  Badge,
  Slider,
} from "@chakra-ui/react";
import { useSignedUrls } from "@/hooks/useSignedUrl";
import { Play, Pause, Volume2 } from "lucide-react";
import type WaveSurfer from "wavesurfer.js";

interface AudioTrack {
  id: string;
  url: string; // objectKey (not a direct URL)
  label: string;
  role: string;
}

interface AudioPlayerProps {
  tracks: AudioTrack[];
  positionMs?: number;
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

export function AudioPlayer({
  tracks,
  positionMs,
  transportStatus,
  onPositionChange,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(null);

  // Resolve signed URLs for all tracks
  const objectKeys = useMemo(() => tracks.map((t) => t.url), [tracks]);
  const signedUrls = useSignedUrls(objectKeys);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState([80]);
  const seekingRef = useRef(false);
  const pendingPlayRef = useRef(false);
  const pendingTimeRef = useRef<number | null>(null);

  // Waveform refs
  const waveformContainerRef = useRef<HTMLDivElement | null>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const wavesurferReadyRef = useRef(false);

  const activeTrack = tracks.find((t) => t.id === activeTrackId) || tracks[0];
  const activeSignedUrl = activeTrack ? signedUrls[activeTrack.url] : null;

  // Auto-select first track
  useEffect(() => {
    if (tracks.length > 0 && !activeTrackId) {
      setActiveTrackId(tracks[0].id);
    }
  }, [tracks, activeTrackId]);

  // Update time display and handle canplay for pending operations
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      if (!seekingRef.current) {
        setCurrentTime(audio.currentTime);
        onPositionChange?.(audio.currentTime * 1000);
      }
    };
    const onDurationChange = () => setDuration(audio.duration || 0);
    const onEnded = () => setIsPlaying(false);
    const onCanPlay = () => {
      if (pendingTimeRef.current != null) {
        audio.currentTime = pendingTimeRef.current;
        pendingTimeRef.current = null;
      }
      if (pendingPlayRef.current) {
        pendingPlayRef.current = false;
        audio.play().then(() => setIsPlaying(true)).catch(() => {});
      }
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("canplay", onCanPlay);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("canplay", onCanPlay);
    };
  }, [onPositionChange]);

  // Volume control
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume[0] / 100;
    }
  }, [volume]);

  // Sync with external transport position
  useEffect(() => {
    if (positionMs != null && audioRef.current && !isPlaying) {
      const posSec = positionMs / 1000;
      if (Math.abs(audioRef.current.currentTime - posSec) > 1) {
        audioRef.current.currentTime = posSec;
        setCurrentTime(posSec);
      }
    }
  }, [positionMs, isPlaying]);

  // Sync with external transport status
  useEffect(() => {
    if (!audioRef.current || !transportStatus) return;
    if (transportStatus === "playing" && !isPlaying) {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else if (transportStatus === "paused" && isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else if (transportStatus === "stopped") {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [transportStatus, isPlaying]);

  // Set audio src when active track or signed URL changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (activeSignedUrl) {
      if (audio.src !== activeSignedUrl) {
        audio.src = activeSignedUrl;
        audio.load();
      }
    } else {
      audio.removeAttribute("src");
    }
  }, [activeSignedUrl]);

  // Initialize / update WaveSurfer for the active track
  useEffect(() => {
    if (!waveformContainerRef.current || !activeTrack || !activeSignedUrl) return;
    const audio = audioRef.current;
    if (!audio) return;

    // Destroy previous instance
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
      wavesurferRef.current = null;
      wavesurferReadyRef.current = false;
    }

    let cancelled = false;
    const colors = WAVEFORM_COLORS[activeTrack.role] || WAVEFORM_COLORS.full_mix;

    import("wavesurfer.js").then(({ default: WS }) => {
      if (cancelled || !waveformContainerRef.current) return;

      const ws = WS.create({
        container: waveformContainerRef.current,
        waveColor: colors.wave,
        progressColor: colors.progress,
        cursorColor: colors.progress,
        cursorWidth: 2,
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        height: 48,
        normalize: true,
        interact: true,
        media: audio,
        url: activeSignedUrl,
      });

      ws.on("ready", () => {
        wavesurferReadyRef.current = true;
      });

      // WaveSurfer handles seeking the media element automatically when using `media` option
      ws.on("seeking", (currentTime: number) => {
        setCurrentTime(currentTime);
      });

      wavesurferRef.current = ws;
    });

    return () => {
      cancelled = true;
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
        wavesurferReadyRef.current = false;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTrack?.id, activeSignedUrl]);

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

  const switchTrack = useCallback(
    (trackId: string) => {
      const wasPlaying = isPlaying;
      const time = audioRef.current?.currentTime || 0;

      if (wasPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      }

      // Queue position restore and auto-play for when the new source is ready
      pendingTimeRef.current = time;
      pendingPlayRef.current = wasPlaying;
      setActiveTrackId(trackId);
    },
    [isPlaying]
  );

  if (tracks.length === 0) {
    return (
      <Flex
        h="80px"
        align="center"
        justify="center"
        bg="gray.50"
        borderRadius="md"
      >
        <Text color="gray.400" fontSize="sm">
          No audio tracks available.
        </Text>
      </Flex>
    );
  }

  return (
    <Box w="full">
      {/* Hidden audio element — always mounted so ref is stable */}
      <audio ref={audioRef} preload="metadata" />

      {/* Track selector */}
      {tracks.length > 1 && (() => {
        const fullMix = tracks.find((t) => t.role === "full_mix");
        const otherTracks = tracks.filter((t) => t.role !== "full_mix");
        return (
          <Flex direction="column" gap={2} mb={3}>
            {fullMix && (
              <Button
                size="xs"
                w="full"
                variant={fullMix.id === activeTrack?.id ? "solid" : "outline"}
                colorPalette={ROLE_COLORS[fullMix.role] || "gray"}
                onClick={() => switchTrack(fullMix.id)}
              >
                {fullMix.label}
              </Button>
            )}
            {otherTracks.length > 0 && (
              <Flex gap={2} flexWrap="wrap">
                {otherTracks.map((track) => (
                  <Button
                    key={track.id}
                    size="xs"
                    flex="1 1 0"
                    variant={track.id === activeTrack?.id ? "solid" : "outline"}
                    colorPalette={ROLE_COLORS[track.role] || "gray"}
                    onClick={() => switchTrack(track.id)}
                  >
                    {track.label}
                  </Button>
                ))}
              </Flex>
            )}
          </Flex>
        );
      })()}

      {/* Waveform */}
      <Box
        ref={waveformContainerRef}
        w="full"
        h="48px"
        mb={2}
        borderRadius="md"
        bg="gray.50"
        overflow="hidden"
        cursor="pointer"
      />

      {/* Player controls */}
      <Flex align="center" gap={3}>
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

        <Text fontSize="xs" color="gray.500" fontFamily="mono" w="45px" flexShrink={0}>
          {formatTime(currentTime)}
        </Text>

        <Box flex={1} />

        <Text fontSize="xs" color="gray.500" fontFamily="mono" w="45px" flexShrink={0}>
          {formatTime(duration)}
        </Text>

        {/* Volume */}
        <Volume2 size={14} color="var(--chakra-colors-gray-400)" />
        <Box w="80px">
          <Slider.Root
            min={0}
            max={100}
            step={1}
            value={volume}
            onValueChange={(d) => setVolume(d.value)}
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

      {/* Now playing label */}
      {activeTrack && (
        <Flex mt={2} align="center" gap={2}>
          <Badge
            colorPalette={ROLE_COLORS[activeTrack.role] || "gray"}
            variant="subtle"
            fontSize="xs"
          >
            {activeTrack.role.replace("_", " ")}
          </Badge>
          <Text fontSize="xs" color="gray.500">
            {activeTrack.label}
          </Text>
        </Flex>
      )}
    </Box>
  );
}
