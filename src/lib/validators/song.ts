import { z } from "zod";

export const createSongSchema = z.object({
  title: z.string().min(1).max(200),
  artist: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
  songKey: z.string().max(10).optional(),
  timeSignature: z.string().max(10).optional(),
  defaultBpm: z.number().min(20).max(400).optional(),
});

export const updateSongSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  artist: z.string().max(200).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  songKey: z.string().max(10).nullable().optional(),
  timeSignature: z.string().max(10).nullable().optional(),
  defaultBpm: z.number().min(20).max(400).nullable().optional(),
});

export type CreateSongInput = z.infer<typeof createSongSchema>;
export type UpdateSongInput = z.infer<typeof updateSongSchema>;
