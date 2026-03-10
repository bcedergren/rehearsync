import { prisma } from "@/lib/prisma";
import { CreateSongInput, UpdateSongInput } from "@/lib/validators/song";
import { NotFoundError } from "@/lib/api/errors";

export async function createSong(
  bandId: string,
  memberId: string,
  data: CreateSongInput
) {
  return prisma.song.create({
    data: {
      bandId,
      title: data.title,
      artist: data.artist,
      notes: data.notes,
      songKey: data.songKey,
      timeSignature: data.timeSignature,
      defaultBpm: data.defaultBpm,
      createdByMemberId: memberId,
    },
  });
}

export async function getSong(songId: string) {
  const song = await prisma.song.findUnique({
    where: { id: songId },
    include: {
      arrangements: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          versionLabel: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });
  if (!song) throw new NotFoundError("Song", songId);
  return song;
}

export async function listSongs(
  bandId: string,
  search?: string,
  limit = 50,
  cursor?: string
) {
  return prisma.song.findMany({
    where: {
      bandId,
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" } },
              { artist: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    take: limit,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { arrangements: true } },
    },
  });
}

export async function updateSong(songId: string, data: UpdateSongInput) {
  return prisma.song.update({ where: { id: songId }, data });
}

export async function deleteSong(songId: string) {
  return prisma.song.delete({ where: { id: songId } });
}
