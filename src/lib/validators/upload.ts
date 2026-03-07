import { z } from "zod";

export const prepareUploadSchema = z.object({
  bandId: z.string().uuid(),
  fileName: z.string().min(1).max(500),
  mimeType: z.string().min(1).max(200),
  sizeBytes: z.number().int().positive(),
  kind: z.enum(["sheet_music", "audio"]),
});

export const completeUploadSchema = z.object({
  bucket: z.string().min(1),
  objectKey: z.string().min(1),
  originalFileName: z.string().min(1).max(500),
  mimeType: z.string().min(1).max(200),
  sizeBytes: z.number().int().positive(),
  checksumSha256: z.string().optional(),
});

export const createSheetMusicAssetSchema = z.object({
  partId: z.string().uuid(),
  storageObjectId: z.string().uuid(),
  fileType: z.enum(["musicxml", "pdf"]),
  notes: z.string().max(1000).optional(),
});

export const createAudioAssetSchema = z.object({
  storageObjectId: z.string().uuid(),
  assetRole: z.enum(["full_mix", "stem", "click", "guide"]),
  stemName: z.string().max(100).optional(),
  channelMode: z.enum(["mono", "stereo"]).optional(),
  durationMs: z.number().int().positive().optional(),
  sampleRateHz: z.number().int().positive().optional(),
  notes: z.string().max(1000).optional(),
});

export const activateAssetSchema = z.object({
  effectiveMode: z.enum(["immediate", "next_stop", "next_section"]).default("immediate"),
});

export type PrepareUploadInput = z.infer<typeof prepareUploadSchema>;
export type CompleteUploadInput = z.infer<typeof completeUploadSchema>;
export type CreateSheetMusicAssetInput = z.infer<typeof createSheetMusicAssetSchema>;
export type CreateAudioAssetInput = z.infer<typeof createAudioAssetSchema>;
export type ActivateAssetInput = z.infer<typeof activateAssetSchema>;
