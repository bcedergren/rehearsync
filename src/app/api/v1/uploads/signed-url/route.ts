import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/subscriptions/guards";
import { createSignedUploadUrl } from "@/lib/supabase-storage";
import { v4 as uuidv4 } from "uuid";

const ALLOWED_SHEET_MUSIC_TYPES = [
  "application/vnd.recordare.musicxml+xml",
  "application/xml",
  "text/xml",
  "application/pdf",
];

const ALLOWED_AUDIO_TYPES = [
  "audio/wav",
  "audio/x-wav",
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
];

export const POST = withAuth(async (req: NextRequest, ctx) => {
  const body = await req.json();
  const { bandId, kind, fileName, mimeType, fileSize } = body;

  if (!bandId || !kind || !fileName || !mimeType) {
    return response.validationError("Missing required fields: bandId, kind, fileName, mimeType");
  }

  if (kind !== "sheet_music" && kind !== "audio") {
    return response.validationError("kind must be 'sheet_music' or 'audio'");
  }

  // Validate file type
  const allowedTypes = kind === "sheet_music" ? ALLOWED_SHEET_MUSIC_TYPES : ALLOWED_AUDIO_TYPES;
  if (!allowedTypes.includes(mimeType)) {
    return response.validationError(`Unsupported file type: ${mimeType}`);
  }

  // Validate file size
  const maxSize = kind === "sheet_music" ? 50 * 1024 * 1024 : 500 * 1024 * 1024;
  if (fileSize && fileSize > maxSize) {
    return response.validationError(`File too large. Maximum size: ${maxSize / 1024 / 1024}MB`);
  }

  // Gate features by tier
  if (kind === "audio") {
    await requireFeature(ctx.userId, "allowAudioUploads");
  }
  if (kind === "sheet_music" && fileName.match(/\.(musicxml|mxl|xml)$/i)) {
    await requireFeature(ctx.userId, "allowMusicXml");
  }

  // Check band membership
  const member = await prisma.member.findFirst({
    where: { userId: ctx.userId, bandId, isActive: true },
  });
  if (!member) {
    return response.forbidden("You are not a member of this band");
  }

  // Generate object key and signed URL
  const fileId = uuidv4();
  const ext = fileName.split(".").pop() || "bin";
  const objectKey = `bands/${bandId}/${kind}/${fileId}.${ext}`;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "rehearsync-assets";

  const { signedUrl, token } = await createSignedUploadUrl(bucket, objectKey);

  // Pre-create the storage object record
  const storageObject = await prisma.storageObject.create({
    data: {
      bucket,
      objectKey,
      originalFileName: fileName,
      mimeType,
      sizeBytes: BigInt(fileSize || 0),
      uploadedByMemberId: member.id,
    },
  });

  return response.ok({
    signedUrl,
    token,
    objectKey,
    storageObjectId: storageObject.id,
  });
});
