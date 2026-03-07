jest.mock("@/lib/prisma", () => require("@/lib/__mocks__/prisma"));

import { prisma } from "@/lib/prisma";
import {
  createPart,
  listParts,
  updatePart,
  deletePart,
} from "../part.service";
import { NotFoundError, InvalidStateError } from "@/lib/api/errors";

const db = prisma as any;

beforeEach(() => jest.clearAllMocks());

describe("createPart", () => {
  it("creates a part for an arrangement", async () => {
    const mock = { id: "part-1", instrumentName: "Guitar", arrangementId: "arr-1" };
    db.part.create.mockResolvedValue(mock);

    const result = await createPart("arr-1", {
      instrumentName: "Guitar",
      displayOrder: 0,
      isRequired: true,
    });

    expect(result).toEqual(mock);
    expect(db.part.create).toHaveBeenCalledWith({
      data: {
        arrangementId: "arr-1",
        instrumentName: "Guitar",
        partName: undefined,
        transposition: undefined,
        displayOrder: 0,
        isRequired: true,
      },
    });
  });
});

describe("listParts", () => {
  it("returns parts with sheet music and assignments", async () => {
    const parts = [{ id: "part-1", instrumentName: "Guitar" }];
    db.part.findMany.mockResolvedValue(parts);

    const result = await listParts("arr-1");
    expect(result).toEqual(parts);
    expect(db.part.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { arrangementId: "arr-1" },
        orderBy: { displayOrder: "asc" },
      })
    );
  });
});

describe("updatePart", () => {
  it("updates part fields", async () => {
    const updated = { id: "part-1", instrumentName: "Bass" };
    db.part.update.mockResolvedValue(updated);

    const result = await updatePart("part-1", { instrumentName: "Bass" });
    expect(result.instrumentName).toBe("Bass");
  });
});

describe("deletePart", () => {
  it("deletes a part with no assets or assignments", async () => {
    db.part.findUnique.mockResolvedValue({
      id: "part-1",
      _count: { sheetMusicAssets: 0, assignments: 0 },
    });
    db.part.delete.mockResolvedValue({ id: "part-1" });

    const result = await deletePart("part-1");
    expect(result.id).toBe("part-1");
  });

  it("throws NotFoundError for missing part", async () => {
    db.part.findUnique.mockResolvedValue(null);
    await expect(deletePart("bad-id")).rejects.toThrow(NotFoundError);
  });

  it("throws InvalidStateError when part has assets", async () => {
    db.part.findUnique.mockResolvedValue({
      id: "part-1",
      _count: { sheetMusicAssets: 2, assignments: 0 },
    });

    await expect(deletePart("part-1")).rejects.toThrow(InvalidStateError);
  });

  it("throws InvalidStateError when part has assignments", async () => {
    db.part.findUnique.mockResolvedValue({
      id: "part-1",
      _count: { sheetMusicAssets: 0, assignments: 1 },
    });

    await expect(deletePart("part-1")).rejects.toThrow(InvalidStateError);
  });
});
