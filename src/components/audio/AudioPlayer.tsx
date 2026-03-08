"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Flex,
  Text,
  Button,
  Badge,
  VStack,
  Slider,
} from "@chakra-ui/react";
import { useSignedUrls } from "@/hooks/useSignedUrl";

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

  const activeTrack = tracks.find((t) => t.id === activeTrackId) || tracks[0];

  // Auto-select first track
  useEffect(() => {
    if (tracks.length > 0 && !activeTrackId) {
      setActiveTrackId(tracks[0].id);
    }
  }, [tracks, activeTrackId]);

  // Update time display
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

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("ended", onEnded);
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

  const handleSeek = useCallback((details: { value: number[] }) => {
    seekingRef.current = true;
    setCurrentTime(details.value[0]);
  }, []);

  const handleSeekEnd = useCallback((details: { value: number[] }) => {
    if (audioRef.current) {
      audioRef.current.currentTime = details.value[0];
    }
    seekingRef.current = false;
  }, []);

  const switchTrack = useCallback(
    (trackId: string) => {
      const wasPlaying = isPlaying;
      const time = audioRef.current?.currentTime || 0;
      setActiveTrackId(trackId);
      // After source change, restore position
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.currentTime = time;
          if (wasPlaying) {
            audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
          }
        }
      }, 50);
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
      {/* Hidden audio element */}
      {activeTrack && signedUrls[activeTrack.url] && (
        <audio ref={audioRef} src={signedUrls[activeTrack.url]!} preload="metadata" />
      )}

      {/* Track selector */}
      {tracks.length > 1 && (
        <Flex gap={2} mb={3} flexWrap="wrap">
          {tracks.map((track) => (
            <Button
              key={track.id}
              size="xs"
              variant={track.id === activeTrack?.id ? "solid" : "outline"}
              colorPalette={ROLE_COLORS[track.role] || "gray"}
              onClick={() => switchTrack(track.id)}
            >
              {track.label}
            </Button>
          ))}
        </Flex>
      )}

      {/* Player controls */}
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

        <Text fontSize="xs" color="gray.500" fontFamily="mono" w="45px" flexShrink={0}>
          {formatTime(currentTime)}
        </Text>

        <Box flex={1}>
          <Slider.Root
            min={0}
            max={duration || 1}
            step={0.1}
            value={[currentTime]}
            onValueChange={handleSeek}
            onValueChangeEnd={handleSeekEnd}
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

        <Text fontSize="xs" color="gray.500" fontFamily="mono" w="45px" flexShrink={0}>
          {formatTime(duration)}
        </Text>

        {/* Volume */}
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
