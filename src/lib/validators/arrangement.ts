import { z } from "zod";

export const createArrangementSchema = z.object({
  name: z.string().min(1).max(200),
  versionLabel: z.string().min(1).max(50).default("v1"),
});

export const updateArrangementSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  versionLabel: z.string().min(1).max(50).optional(),
});

export type CreateArrangementInput = z.infer<typeof createArrangementSchema>;
export type UpdateArrangementInput = z.infer<typeof updateArrangementSchema>;
