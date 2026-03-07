jest.mock("@/lib/prisma", () => require("@/lib/__mocks__/prisma"));

import { prisma } from "@/lib/prisma";
import {
  createAudioAsset,
  listAudioAssets,
  activateAudioAsset,
  retireAudioAsset,
} from "../audio.service";
import { NotFoundError } from "@/lib/api/errors";

const db = prisma as any;

beforeEach(() => jest.clearAllMocks());

describe("createAudioAsset", () => {
  it("creates with auto-incremented version", async () => {
    db.audioAsset.aggregate.mockResolvedValue({ _max: { versionNum: 1 } });
    const mock = { id: "aa-1", versionNum: 2 };
    db.audioAsset.create.mockResolvedValue(mock);

    const result = await createAudioAsset("arr-1", {
      storageObjectId: "so-1",
      assetRole: "full_mix",
    });

    expect(result.versionNum).toBe(2);
    expect(db.audioAsset.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        arrangementId: "arr-1",
        assetRole: "full_mix",
        versionNum: 2,
      }),
    });
  });

  it("starts at version 1 when no prior versions exist", async () => {
    db.audioAsset.aggregate.mockResolvedValue({ _max: { versionNum: null } });
    db.audioAsset.create.mockResolvedValue({ id: "aa-1", versionNum: 1 });

    await createAudioAsset("arr-1", {
      storageObjectId: "so-1",
      assetRole: "stem",
      stemName: "Drums",
    });

    expect(db.audioAsset.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ versionNum: 1, stemName: "Drums" }),
    });
  });
});

describe("listAudioAssets", () => {
  it("returns assets with storage info", async () => {
    const assets = [{ id: "aa-1" }];
    db.audioAsset.findMany.mockResolvedValue(assets);

    const result = await listAudioAssets("arr-1");
    expect(result).toEqual(assets);
  });
});

describe("activateAudioAsset", () => {
  it("deactivates others and activates the target", async () => {
    const asset = {
      id: "aa-1",
      arrangementId: "arr-1",
      assetRole: "full_mix",
      stemName: null,
    };
    db.audioAsset.findUnique
      .mockResolvedValueOnce(asset)
      .mockResolvedValueOnce({ ...asset, isActive: true, status: "active" });
    db.$transaction.mockResolvedValue([]);

    const result = await activateAudioAsset("aa-1");
    expect(result.isActive).toBe(true);
  });

  it("throws NotFoundError for missing asset", async () => {
    db.audioAsset.findUnique.mockResolvedValue(null);
    await expect(activateAudioAsset("bad")).rejects.toThrow(NotFoundError);
  });
});

describe("retireAudioAsset", () => {
  it("sets asset to inactive/retired", async () => {
    db.audioAsset.update.mockResolvedValue({
      id: "aa-1",
      isActive: false,
      status: "retired",
    });

    const result = await retireAudioAsset("aa-1");
    expect(result.isActive).toBe(false);
  });
});
