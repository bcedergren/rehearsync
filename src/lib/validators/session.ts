import { z } from "zod";

export const createSessionSchema = z.object({
  arrangementId: z.string().uuid(),
  leaderMemberId: z.string().uuid().optional(),
});

export const joinSessionSchema = z.object({
  deviceLabel: z.string().max(100).optional(),
  deviceType: z
    .enum(["ipad", "android_tablet", "laptop", "phone", "desktop", "unknown"])
    .default("unknown"),
});

export const createSectionMarkerSchema = z.object({
  name: z.string().min(1).max(100),
  startBar: z.number().int().min(1),
  endBar: z.number().int().min(1).optional(),
  sortOrder: z.number().int().min(0).default(0),
});

export const updateSectionMarkerSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  startBar: z.number().int().min(1).optional(),
  endBar: z.number().int().min(1).nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const createSyncMapSchema = z.object({
  sourceType: z.enum(["manual", "imported", "generated"]).default("manual"),
});

export const addSyncMapPointsSchema = z.object({
  points: z.array(
    z.object({
      timeMs: z.number().int().min(0),
      barNumber: z.number().int().min(1),
      beatNumber: z.number().int().min(1).optional(),
      tickOffset: z.number().int().min(0).optional(),
    })
  ).min(1),
});

export const assignmentSchema = z.object({
  memberId: z.string().uuid(),
  partId: z.string().uuid(),
  isDefault: z.boolean().default(true),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type JoinSessionInput = z.infer<typeof joinSessionSchema>;
export type CreateSectionMarkerInput = z.infer<typeof createSectionMarkerSchema>;
export type UpdateSectionMarkerInput = z.infer<typeof updateSectionMarkerSchema>;
export type CreateSyncMapInput = z.infer<typeof createSyncMapSchema>;
export type AddSyncMapPointsInput = z.infer<typeof addSyncMapPointsSchema>;
export type AssignmentInput = z.infer<typeof assignmentSchema>;
