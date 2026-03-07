import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import { updateSongSchema } from "@/lib/validators/song";
import * as songService from "@/lib/services/song.service";

export const GET = withAuth(async (_req, _ctx, params) => {
  const song = await songService.getSong(params.songId);
  return response.ok(song);
});

export const PATCH = withAuth(async (req: NextRequest, _ctx, params) => {
  const body = await req.json();
  const parsed = updateSongSchema.safeParse(body);
  if (!parsed.success) {
    return response.validationError("Invalid input", {
      issues: parsed.error.issues,
    });
  }

  const song = await songService.updateSong(params.songId, parsed.data);
  return response.ok(song);
});
