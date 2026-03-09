import { withBandRole } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import * as inviteService from "@/lib/services/invite.service";

export const DELETE = withBandRole("leader", "admin")(async (_req, ctx, params) => {
  const inviteId = params.inviteId;
  if (!inviteId) return response.validationError("inviteId is required");

  await inviteService.revokeInviteLink(inviteId);
  return response.ok({ revoked: true });
});
