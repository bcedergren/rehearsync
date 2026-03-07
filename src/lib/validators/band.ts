import { z } from "zod";

export const createBandSchema = z.object({
  name: z.string().min(1).max(100),
});

export const updateBandSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(1).max(100),
  role: z.enum(["leader", "admin", "musician"]).default("musician"),
  defaultInstrument: z.string().max(100).optional(),
});

export type CreateBandInput = z.infer<typeof createBandSchema>;
export type UpdateBandInput = z.infer<typeof updateBandSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
