"use client";

import { Flex, Text, Button, Slider, Box, Badge } from "@chakra-ui/react";
import { Minus, Plus, RotateCcw, Lock } from "lucide-react";
import { memo } from "react";

interface PracticeToolsPanelProps {
  tempoPercent: number;
  onTempoChange: (percent: number) => void;
  pitchSemitones: number;
  onPitchChange: (semitones: number) => void;
  isLocked: boolean;
  isPitchProcessing?: boolean;
}

const SEMITONE_LABELS: Record<number, string> = {
  "-6": "-6",
  "-5": "-5",
  "-4": "-4",
  "-3": "-3",
  "-2": "-2",
  "-1": "-1",
  "0": "0",
  "1": "+1",
  "2": "+2",
  "3": "+3",
  "4": "+4",
  "5": "+5",
  "6": "+6",
};

export const PracticeToolsPanel = memo(function PracticeToolsPanel({
  tempoPercent,
  onTempoChange,
  pitchSemitones,
  onPitchChange,
  isLocked,
  isPitchProcessing,
}: PracticeToolsPanelProps) {
  if (isLocked) {
    return (
      <Flex
        align="center"
        justify="center"
        gap={2}
        py={2}
        px={3}
        bg="gray.50"
        borderRadius="md"
        borderWidth="1px"
        borderColor="gray.200"
      >
        <Lock size={14} color="var(--chakra-colors-gray-400)" />
        <Text fontSize="xs" color="gray.500">
          Tempo &amp; key controls require a{" "}
          <Text as="span" fontWeight="bold" color="blue.500">
            Band
          </Text>{" "}
          plan or higher
        </Text>
      </Flex>
    );
  }

  return (
    <Flex
      align="center"
      gap={4}
      py={2}
      px={3}
      bg="gray.50"
      borderRadius="md"
      borderWidth="1px"
      borderColor="gray.200"
      flexWrap="wrap"
    >
      {/* Tempo control */}
      <Flex align="center" gap={2} flex={1} minW="200px">
        <Text fontSize="xs" fontWeight="medium" color="gray.600" flexShrink={0}>
          Tempo
        </Text>
        <Box flex={1}>
          <Slider.Root
            min={50}
            max={150}
            step={5}
            value={[tempoPercent]}
            onValueChange={(d) => onTempoChange(d.value[0])}
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
        <Badge
          variant="outline"
          fontSize="2xs"
          fontFamily="mono"
          minW="40px"
          textAlign="center"
        >
          {tempoPercent}%
        </Badge>
        {tempoPercent !== 100 && (
          <Button
            size="xs"
            variant="ghost"
            px={1}
            minW="20px"
            h="20px"
            onClick={() => onTempoChange(100)}
            title="Reset tempo"
          >
            <RotateCcw size={10} />
          </Button>
        )}
      </Flex>

      {/* Key/pitch control */}
      <Flex align="center" gap={1.5} flexShrink={0}>
        <Text fontSize="xs" fontWeight="medium" color="gray.600">
          Key
        </Text>
        <Button
          size="xs"
          variant="outline"
          px={1}
          minW="24px"
          h="24px"
          onClick={() => onPitchChange(Math.max(-6, pitchSemitones - 1))}
          disabled={pitchSemitones <= -6 || isPitchProcessing}
          title="Lower key"
        >
          <Minus size={12} />
        </Button>
        <Badge
          variant={pitchSemitones === 0 ? "outline" : "solid"}
          colorPalette={pitchSemitones === 0 ? "gray" : pitchSemitones > 0 ? "green" : "red"}
          fontSize="2xs"
          fontFamily="mono"
          minW="32px"
          textAlign="center"
        >
          {isPitchProcessing ? "..." : SEMITONE_LABELS[pitchSemitones] ?? pitchSemitones}
        </Badge>
        <Button
          size="xs"
          variant="outline"
          px={1}
          minW="24px"
          h="24px"
          onClick={() => onPitchChange(Math.min(6, pitchSemitones + 1))}
          disabled={pitchSemitones >= 6 || isPitchProcessing}
          title="Raise key"
        >
          <Plus size={12} />
        </Button>
        {pitchSemitones !== 0 && !isPitchProcessing && (
          <Button
            size="xs"
            variant="ghost"
            px={1}
            minW="20px"
            h="20px"
            onClick={() => onPitchChange(0)}
            title="Reset key"
          >
            <RotateCcw size={10} />
          </Button>
        )}
      </Flex>
    </Flex>
  );
});
