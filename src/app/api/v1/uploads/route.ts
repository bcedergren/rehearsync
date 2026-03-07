import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import * as uploadService from "@/lib/services/upload.service";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/subscriptions/guards";

export const POST = withAuth(async (req: NextRequest, ctx) => {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const bandId = formData.get("bandId") as string | null;
  const kind = formData.get("kind") as string | null;

  if (!file || !bandId || !kind) {
    return response.validationError("Missing required fields: file, bandId, kind");
  }

  if (kind !== "sheet_music" && kind !== "audio") {
    return response.validationError("kind must be 'sheet_music' or 'audio'");
  }

  // Gate audio uploads to Band+ tier
  if (kind === "audio") {
    await requireFeature(ctx.userId, "allowAudioUploads");
  }

  // Gate MusicXML uploads to Band+ tier (check file extension)
  if (kind === "sheet_music" && file.name.match(/\.(musicxml|mxl|xml)$/i)) {
    await requireFeature(ctx.userId, "allowMusicXml");
  }

  const member = await prisma.member.findFirst({
    where: { userId: ctx.userId, bandId, isActive: true },
  });
  if (!member) {
    return response.forbidden("You are not a member of this band");
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadService.uploadFile(
      member.id,
      bandId,
      kind,
      file.name,
      file.type,
      buffer
    );
    return response.created(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return response.validationError(message);
  }
});
