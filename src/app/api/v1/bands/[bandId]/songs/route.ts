import { NextRequest } from "next/server";
import { withBandRole } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import { createSongSchema } from "@/lib/validators/song";
import * as songService from "@/lib/services/song.service";
import { checkSongLimit } from "@/lib/subscriptions/guards";

export const GET = withBandRole()(async (req: NextRequest, ctx) => {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || undefined;
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const cursor = searchParams.get("cursor") || undefined;

  const songs = await songService.listSongs(ctx.bandId, search, limit, cursor);
  return response.ok(songs);
});

export const POST = withBandRole()(async (req: NextRequest, ctx) => {
  await checkSongLimit(ctx.bandId, ctx.userId);

  const body = await req.json();
  const parsed = createSongSchema.safeParse(body);
  if (!parsed.success) {
    return response.validationError("Invalid input", {
      issues: parsed.error.issues,
    });
  }

  const song = await songService.createSong(ctx.bandId, ctx.memberId, parsed.data);
  return response.created(song);
});
