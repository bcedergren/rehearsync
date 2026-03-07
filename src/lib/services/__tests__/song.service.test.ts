jest.mock("@/lib/prisma", () => require("@/lib/__mocks__/prisma"));

import { prisma } from "@/lib/prisma";
import {
  createSong,
  getSong,
  listSongs,
  updateSong,
  deleteSong,
} from "../song.service";
import { NotFoundError } from "@/lib/api/errors";

const db = prisma as any;

beforeEach(() => jest.clearAllMocks());

describe("createSong", () => {
  it("creates a song with band and member references", async () => {
    const mockSong = { id: "song-1", title: "Highway Star", bandId: "band-1" };
    db.song.create.mockResolvedValue(mockSong);

    const result = await createSong("band-1", "member-1", {
      title: "Highway Star",
      artist: "Deep Purple",
      defaultBpm: 170,
    });

    expect(result).toEqual(mockSong);
    expect(db.song.create).toHaveBeenCalledWith({
      data: {
        bandId: "band-1",
        title: "Highway Star",
        artist: "Deep Purple",
        notes: undefined,
        defaultBpm: 170,
        createdByMemberId: "member-1",
      },
    });
  });
});

describe("getSong", () => {
  it("returns song with arrangements", async () => {
    const mockSong = {
      id: "song-1",
      title: "Highway Star",
      arrangements: [{ id: "arr-1", name: "Main" }],
    };
    db.song.findUnique.mockResolvedValue(mockSong);

    const result = await getSong("song-1");
    expect(result).toEqual(mockSong);
    expect(db.song.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "song-1" },
        include: expect.objectContaining({ arrangements: expect.any(Object) }),
      })
    );
  });

  it("throws NotFoundError for missing song", async () => {
    db.song.findUnique.mockResolvedValue(null);
    await expect(getSong("bad-id")).rejects.toThrow(NotFoundError);
  });
});

describe("listSongs", () => {
  it("returns songs for a band", async () => {
    const songs = [{ id: "song-1", title: "Song 1" }];
    db.song.findMany.mockResolvedValue(songs);

    const result = await listSongs("band-1");
    expect(result).toEqual(songs);
    expect(db.song.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ bandId: "band-1" }),
      })
    );
  });

  it("supports search filtering", async () => {
    db.song.findMany.mockResolvedValue([]);

    await listSongs("band-1", "highway");
    expect(db.song.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          bandId: "band-1",
          OR: expect.arrayContaining([
            { title: { contains: "highway", mode: "insensitive" } },
          ]),
        }),
      })
    );
  });

  it("supports cursor-based pagination", async () => {
    db.song.findMany.mockResolvedValue([]);

    await listSongs("band-1", undefined, 10, "cursor-id");
    expect(db.song.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
        skip: 1,
        cursor: { id: "cursor-id" },
      })
    );
  });
});

describe("updateSong", () => {
  it("updates song fields", async () => {
    const updated = { id: "song-1", title: "New Title" };
    db.song.update.mockResolvedValue(updated);

    const result = await updateSong("song-1", { title: "New Title" });
    expect(result).toEqual(updated);
  });
});

describe("deleteSong", () => {
  it("deletes a song", async () => {
    db.song.delete.mockResolvedValue({ id: "song-1" });

    const result = await deleteSong("song-1");
    expect(result.id).toBe("song-1");
  });
});
