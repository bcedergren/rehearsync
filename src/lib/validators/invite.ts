import { z } from "zod";

export const inviteLinkTypes = ["band_invite", "session_join"] as const;

export type InviteLinkType = (typeof inviteLinkTypes)[number];

export const createInviteLinkSchema = z.object({
  expiresInHours: z.number().int().min(1).max(168).optional(), // 1h to 7 days
  maxUses: z.number().int().min(1).max(100).optional(),
});

export type CreateInviteLinkInput = z.infer<typeof createInviteLinkSchema>;
