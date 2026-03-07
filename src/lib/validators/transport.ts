import { z } from "zod";

export const transportPlaySchema = z.object({
  positionMs: z.number().int().min(0).default(0),
});

export const transportPauseSchema = z.object({
  positionMs: z.number().int().min(0),
});

export const transportStopSchema = z.object({
  positionMs: z.number().int().min(0).default(0),
});

export const transportSeekSchema = z.object({
  positionMs: z.number().int().min(0),
  currentBar: z.number().int().min(1).optional(),
  sectionMarkerId: z.string().uuid().optional(),
});

export const transportJumpSectionSchema = z.object({
  sectionMarkerId: z.string().uuid(),
});

export type TransportPlayInput = z.infer<typeof transportPlaySchema>;
export type TransportPauseInput = z.infer<typeof transportPauseSchema>;
export type TransportStopInput = z.infer<typeof transportStopSchema>;
export type TransportSeekInput = z.infer<typeof transportSeekSchema>;
export type TransportJumpSectionInput = z.infer<typeof transportJumpSectionSchema>;
