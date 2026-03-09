import { z } from "zod";

export const processingJobTypes = [
  "stem_separation",
  "transcription",
  "beat_detection",
] as const;

export type ProcessingJobType = (typeof processingJobTypes)[number];

export const startProcessingSchema = z.object({
  audioAssetId: z.string().uuid(),
  jobType: z.enum(processingJobTypes),
});

export type StartProcessingInput = z.infer<typeof startProcessingSchema>;
