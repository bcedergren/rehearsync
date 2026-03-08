import { prisma } from "@/lib/prisma";
import { uploadBuffer } from "@/lib/supabase-storage";
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

const MAX_SHEET_MUSIC_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_AUDIO_SIZE = 500 * 1024 * 1024; // 500MB

export async function uploadFile(
  memberId: string,
  bandId: string,
  kind: "sheet_music" | "audio",
  fileName: string,
  mimeType: string,
  data: Buffer
) {
  const allowedTypes =
    kind === "sheet_music" ? ALLOWED_SHEET_MUSIC_TYPES : ALLOWED_AUDIO_TYPES;
  const maxSize = kind === "sheet_music" ? MAX_SHEET_MUSIC_SIZE : MAX_AUDIO_SIZE;

  if (!allowedTypes.includes(mimeType)) {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }
  if (data.length > maxSize) {
    throw new Error(
      `File too large. Maximum size: ${maxSize / 1024 / 1024}MB`
    );
  }

  const fileId = uuidv4();
  const ext = fileName.split(".").pop() || "bin";
  const objectKey = `bands/${bandId}/${kind}/${fileId}.${ext}`;

  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "rehearsync-assets";
  await uploadBuffer(bucket, objectKey, data, mimeType);

  const storageObject = await prisma.storageObject.create({
    data: {
      bucket,
      objectKey,
      originalFileName: fileName,
      mimeType,
      sizeBytes: BigInt(data.length),
      uploadedByMemberId: memberId,
    },
  });

  return { storageObjectId: storageObject.id, objectKey };
}
