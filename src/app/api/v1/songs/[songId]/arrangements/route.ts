import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import { createArrangementSchema } from "@/lib/validators/arrangement";
import * as arrangementService from "@/lib/services/arrangement.service";
import { checkArrangementLimit } from "@/lib/subscriptions/guards";
import { prisma } from "@/lib/prisma";

export const GET = withAuth(async (_req, _ctx, params) => {
  const arrangements = await arrangementService.listArrangements(params.songId);
  return response.ok(arrangements);
});

export const POST = withAuth(async (req: NextRequest, ctx, params) => {
  await checkArrangementLimit(params.songId, ctx.userId);

  // Look up the song to get bandId, then resolve the member
  const song = await prisma.song.findUnique({
    where: { id: params.songId },
    select: { bandId: true },
  });
  if (!song) {
    return response.error("not_found", "Song not found", 404);
  }

  const member = await prisma.member.findFirst({
    where: { bandId: song.bandId, userId: ctx.userId, isActive: true },
  });
  if (!member) {
    return response.error("forbidden", "You are not a member of this band", 403);
  }

  const body = await req.json();
  const parsed = createArrangementSchema.safeParse(body);
  if (!parsed.success) {
    return response.validationError("Invalid input", {
      issues: parsed.error.issues,
    });
  }

  const arrangement = await arrangementService.createArrangement(
    params.songId,
    member.id,
    parsed.data
  );
  return response.created(arrangement);
});
