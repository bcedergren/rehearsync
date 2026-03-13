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
  /** For guitar transcription: "split" creates Lead + Rhythm parts, "merged" keeps a single part */
  guitarMode: z.enum(["split", "merged"]).optional(),
});

export type StartProcessingInput = z.infer<typeof startProcessingSchema>;
