jest.mock("@/lib/prisma", () => require("@/lib/__mocks__/prisma"));

import { prisma } from "@/lib/prisma";
import {
  createSheetMusicAsset,
  listSheetMusicAssets,
  activateSheetMusicAsset,
  retireSheetMusicAsset,
} from "../sheet-music.service";
import { NotFoundError } from "@/lib/api/errors";

const db = prisma as any;

beforeEach(() => jest.clearAllMocks());

describe("createSheetMusicAsset", () => {
  it("creates with auto-incremented version", async () => {
    db.sheetMusicAsset.aggregate.mockResolvedValue({ _max: { versionNum: 2 } });
    const mock = { id: "sma-1", versionNum: 3 };
    db.$transaction.mockResolvedValue([{ count: 0 }, mock]);

    const result = await createSheetMusicAsset("arr-1", {
      partId: "part-1",
      storageObjectId: "so-1",
      fileType: "musicxml",
    });

    expect(result.versionNum).toBe(3);
  });

  it("starts at version 1 when no prior versions exist", async () => {
    db.sheetMusicAsset.aggregate.mockResolvedValue({ _max: { versionNum: null } });
    const mock = { id: "sma-1", versionNum: 1 };
    db.$transaction.mockResolvedValue([{ count: 0 }, mock]);

    const result = await createSheetMusicAsset("arr-1", {
      partId: "part-1",
      storageObjectId: "so-1",
      fileType: "pdf",
    });

    expect(result.versionNum).toBe(1);
  });
});

describe("listSheetMusicAssets", () => {
  it("returns assets with part and storage info", async () => {
    const assets = [{ id: "sma-1" }];
    db.sheetMusicAsset.findMany.mockResolvedValue(assets);

    const result = await listSheetMusicAssets("arr-1");
    expect(result).toEqual(assets);
  });
});

describe("activateSheetMusicAsset", () => {
  it("deactivates others and activates the target", async () => {
    const asset = { id: "sma-1", partId: "part-1", fileType: "musicxml" };
    db.sheetMusicAsset.findUnique
      .mockResolvedValueOnce(asset)
      .mockResolvedValueOnce({ ...asset, isActive: true, status: "active" });
    db.$transaction.mockResolvedValue([]);

    const result = await activateSheetMusicAsset("sma-1");
    expect(result).not.toBeNull();
    expect(result!.isActive).toBe(true);
    expect(db.$transaction).toHaveBeenCalled();
  });

  it("throws NotFoundError for missing asset", async () => {
    db.sheetMusicAsset.findUnique.mockResolvedValue(null);
    await expect(activateSheetMusicAsset("bad")).rejects.toThrow(NotFoundError);
  });
});

describe("retireSheetMusicAsset", () => {
  it("sets asset to inactive/retired", async () => {
    db.sheetMusicAsset.update.mockResolvedValue({
      id: "sma-1",
      isActive: false,
      status: "retired",
    });

    const result = await retireSheetMusicAsset("sma-1");
    expect(result.isActive).toBe(false);
    expect(result.status).toBe("retired");
  });
});
