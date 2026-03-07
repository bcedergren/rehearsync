import { z } from "zod";

export const createPartSchema = z.object({
  instrumentName: z.string().min(1).max(100),
  partName: z.string().max(100).optional(),
  transposition: z.string().max(20).optional(),
  displayOrder: z.number().int().min(0).default(0),
  isRequired: z.boolean().default(true),
});

export const updatePartSchema = z.object({
  instrumentName: z.string().min(1).max(100).optional(),
  partName: z.string().max(100).nullable().optional(),
  transposition: z.string().max(20).nullable().optional(),
  displayOrder: z.number().int().min(0).optional(),
  isRequired: z.boolean().optional(),
});

export type CreatePartInput = z.infer<typeof createPartSchema>;
export type UpdatePartInput = z.infer<typeof updatePartSchema>;
