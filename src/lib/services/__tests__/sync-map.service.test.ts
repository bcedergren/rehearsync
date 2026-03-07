jest.mock("@/lib/prisma", () => require("@/lib/__mocks__/prisma"));

import { prisma } from "@/lib/prisma";
import {
  createSyncMap,
  addSyncMapPoints,
  listSyncMaps,
  getSyncMapWithPoints,
  activateSyncMap,
  deleteSyncMapPoint,
} from "../sync-map.service";
import { NotFoundError } from "@/lib/api/errors";

const db = prisma as any;

beforeEach(() => jest.clearAllMocks());

describe("createSyncMap", () => {
  it("creates a sync map with auto-incremented version", async () => {
    db.audioAsset.findUnique.mockResolvedValue({
      id: "aa-1",
      arrangementId: "arr-1",
    });
    db.syncMap.aggregate.mockResolvedValue({ _max: { versionNum: 1 } });
    const mock = { id: "syncmap-1", versionNum: 2 };
    db.syncMap.create.mockResolvedValue(mock);

    const result = await createSyncMap("aa-1", "member-1", {
      sourceType: "manual",
    });

    expect(result.versionNum).toBe(2);
  });

  it("throws NotFoundError for missing audio asset", async () => {
    db.audioAsset.findUnique.mockResolvedValue(null);
    await expect(
      createSyncMap("bad-id", "member-1", { sourceType: "manual" })
    ).rejects.toThrow(NotFoundError);
  });
});

describe("addSyncMapPoints", () => {
  it("creates multiple points at once", async () => {
    db.syncMapPoint.createMany.mockResolvedValue({ count: 2 });

    const result = await addSyncMapPoints("syncmap-1", {
      points: [
        { timeMs: 0, barNumber: 1 },
        { timeMs: 2000, barNumber: 2 },
      ],
    });

    expect(result.count).toBe(2);
    expect(db.syncMapPoint.createMany).toHaveBeenCalledWith({
      data: [
        { syncMapId: "syncmap-1", timeMs: 0, barNumber: 1, beatNumber: undefined, tickOffset: undefined },
        { syncMapId: "syncmap-1", timeMs: 2000, barNumber: 2, beatNumber: undefined, tickOffset: undefined },
      ],
    });
  });
});

describe("listSyncMaps", () => {
  it("returns sync maps with point counts", async () => {
    const maps = [{ id: "syncmap-1", _count: { points: 10 } }];
    db.syncMap.findMany.mockResolvedValue(maps);

    const result = await listSyncMaps("aa-1");
    expect(result).toEqual(maps);
  });
});

describe("getSyncMapWithPoints", () => {
  it("returns sync map with ordered points", async () => {
    const mock = {
      id: "syncmap-1",
      points: [{ barNumber: 1 }, { barNumber: 2 }],
    };
    db.syncMap.findUnique.mockResolvedValue(mock);

    const result = await getSyncMapWithPoints("syncmap-1");
    expect(result.points).toHaveLength(2);
  });

  it("throws NotFoundError for missing sync map", async () => {
    db.syncMap.findUnique.mockResolvedValue(null);
    await expect(getSyncMapWithPoints("bad-id")).rejects.toThrow(NotFoundError);
  });
});

describe("activateSyncMap", () => {
  it("deactivates others and activates the target", async () => {
    const syncMap = { id: "syncmap-1", audioAssetId: "aa-1" };
    db.syncMap.findUnique
      .mockResolvedValueOnce(syncMap)
      .mockResolvedValueOnce({ ...syncMap, isActive: true });
    db.$transaction.mockResolvedValue([]);

    const result = await activateSyncMap("syncmap-1");
    expect(result.isActive).toBe(true);
  });

  it("throws NotFoundError for missing sync map", async () => {
    db.syncMap.findUnique.mockResolvedValue(null);
    await expect(activateSyncMap("bad-id")).rejects.toThrow(NotFoundError);
  });
});

describe("deleteSyncMapPoint", () => {
  it("deletes a point by id", async () => {
    db.syncMapPoint.delete.mockResolvedValue({ id: "pt-1" });
    const result = await deleteSyncMapPoint("pt-1");
    expect(result.id).toBe("pt-1");
  });
});
