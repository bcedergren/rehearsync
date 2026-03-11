import { withBandRole } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import { prisma } from "@/lib/prisma";

export const DELETE = withBandRole("leader", "admin")(async (_req, ctx, params) => {
  const inviteId = params.inviteId;
  if (!inviteId) return response.validationError("inviteId is required");

  const link = await prisma.inviteLink.findFirst({
    where: { id: inviteId, bandId: ctx.bandId },
  });

  if (!link) return response.notFound("Invite not found");
  if (link.isRevoked) return response.ok({ revoked: true });

  await prisma.inviteLink.update({
    where: { id: inviteId },
    data: { isRevoked: true },
  });

  return response.ok({ revoked: true });
});
