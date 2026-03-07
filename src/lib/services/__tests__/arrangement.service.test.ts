jest.mock("@/lib/prisma", () => require("@/lib/__mocks__/prisma"));

import { prisma } from "@/lib/prisma";
import {
  createArrangement,
  getArrangement,
  listArrangements,
  updateArrangement,
  publishArrangement,
  archiveArrangement,
  getReadiness,
} from "../arrangement.service";
import { NotFoundError, InvalidStateError } from "@/lib/api/errors";

const db = prisma as any;

beforeEach(() => jest.clearAllMocks());

describe("createArrangement", () => {
  it("creates an arrangement for a song", async () => {
    const mock = { id: "arr-1", name: "Main", songId: "song-1" };
    db.arrangement.create.mockResolvedValue(mock);

    const result = await createArrangement("song-1", "member-1", {
      name: "Main",
      versionLabel: "v1",
    });

    expect(result).toEqual(mock);
    expect(db.arrangement.create).toHaveBeenCalledWith({
      data: {
        songId: "song-1",
        name: "Main",
        versionLabel: "v1",
        createdByMemberId: "member-1",
      },
    });
  });
});

describe("getArrangement", () => {
  it("returns arrangement with full includes", async () => {
    const mock = { id: "arr-1", name: "Main", parts: [], song: {} };
    db.arrangement.findUnique.mockResolvedValue(mock);

    const result = await getArrangement("arr-1");
    expect(result).toEqual(mock);
  });

  it("throws NotFoundError for missing arrangement", async () => {
    db.arrangement.findUnique.mockResolvedValue(null);
    await expect(getArrangement("bad-id")).rejects.toThrow(NotFoundError);
  });
});

describe("listArrangements", () => {
  it("returns arrangements for a song ordered by creation", async () => {
    const list = [{ id: "arr-1" }, { id: "arr-2" }];
    db.arrangement.findMany.mockResolvedValue(list);

    const result = await listArrangements("song-1");
    expect(result).toEqual(list);
    expect(db.arrangement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { songId: "song-1" },
        orderBy: { createdAt: "desc" },
      })
    );
  });
});

describe("updateArrangement", () => {
  it("updates a draft, unlocked arrangement", async () => {
    db.arrangement.findUnique.mockResolvedValue({
      id: "arr-1",
      isLocked: false,
      status: "draft",
    });
    db.arrangement.update.mockResolvedValue({ id: "arr-1", name: "Updated" });

    const result = await updateArrangement("arr-1", { name: "Updated" });
    expect(result.name).toBe("Updated");
  });

  it("throws NotFoundError for missing arrangement", async () => {
    db.arrangement.findUnique.mockResolvedValue(null);
    await expect(
      updateArrangement("bad-id", { name: "X" })
    ).rejects.toThrow(NotFoundError);
  });

  it("throws InvalidStateError for locked arrangement", async () => {
    db.arrangement.findUnique.mockResolvedValue({
      id: "arr-1",
      isLocked: true,
      status: "draft",
    });
    await expect(
      updateArrangement("arr-1", { name: "X" })
    ).rejects.toThrow(InvalidStateError);
  });

  it("throws InvalidStateError for non-draft arrangement", async () => {
    db.arrangement.findUnique.mockResolvedValue({
      id: "arr-1",
      isLocked: false,
      status: "published",
    });
    await expect(
      updateArrangement("arr-1", { name: "X" })
    ).rejects.toThrow(InvalidStateError);
  });
});

describe("publishArrangement", () => {
  it("publishes a draft arrangement", async () => {
    db.arrangement.findUnique.mockResolvedValue({
      id: "arr-1",
      status: "draft",
      parts: [],
      sheetMusicAssets: [],
      audioAssets: [],
    });
    db.arrangement.update.mockResolvedValue({
      id: "arr-1",
      status: "published",
    });

    const result = await publishArrangement("arr-1");
    expect(result.status).toBe("published");
  });

  it("throws NotFoundError for missing arrangement", async () => {
    db.arrangement.findUnique.mockResolvedValue(null);
    await expect(publishArrangement("bad-id")).rejects.toThrow(NotFoundError);
  });

  it("throws InvalidStateError for already published arrangement", async () => {
    db.arrangement.findUnique.mockResolvedValue({
      id: "arr-1",
      status: "published",
    });
    await expect(publishArrangement("arr-1")).rejects.toThrow(
      InvalidStateError
    );
  });
});

describe("archiveArrangement", () => {
  it("archives an arrangement", async () => {
    db.arrangement.update.mockResolvedValue({
      id: "arr-1",
      status: "archived",
    });

    const result = await archiveArrangement("arr-1");
    expect(result.status).toBe("archived");
  });
});

describe("getReadiness", () => {
  it("returns readiness checks for a published arrangement with all assets", async () => {
    db.arrangement.findUnique.mockResolvedValue({
      id: "arr-1",
      status: "published",
      parts: [{ id: "part-1" }],
      sheetMusicAssets: [{ partId: "part-1" }],
      audioAssets: [{ assetRole: "full_mix" }],
      syncMaps: [{ id: "sm-1" }],
    });

    const result = await getReadiness("arr-1");
    expect(result.isReady).toBe(true);
    expect(result.checks.published).toBe(true);
    expect(result.checks.requiredPartsAssigned).toBe(true);
    expect(result.checks.activeChartsPresent).toBe(true);
    expect(result.checks.activeBackingTrackPresent).toBe(true);
    expect(result.checks.activeSyncMapPresent).toBe(true);
  });

  it("returns not ready when arrangement is draft", async () => {
    db.arrangement.findUnique.mockResolvedValue({
      id: "arr-1",
      status: "draft",
      parts: [],
      sheetMusicAssets: [],
      audioAssets: [],
      syncMaps: [],
    });

    const result = await getReadiness("arr-1");
    expect(result.isReady).toBe(false);
    expect(result.checks.published).toBe(false);
  });

  it("returns not ready when required parts lack charts", async () => {
    db.arrangement.findUnique.mockResolvedValue({
      id: "arr-1",
      status: "published",
      parts: [{ id: "part-1" }, { id: "part-2" }],
      sheetMusicAssets: [{ partId: "part-1" }],
      audioAssets: [{ assetRole: "guide" }],
      syncMaps: [],
    });

    const result = await getReadiness("arr-1");
    expect(result.isReady).toBe(false);
    expect(result.checks.requiredPartsAssigned).toBe(false);
  });

  it("throws NotFoundError for missing arrangement", async () => {
    db.arrangement.findUnique.mockResolvedValue(null);
    await expect(getReadiness("bad-id")).rejects.toThrow(NotFoundError);
  });
});
