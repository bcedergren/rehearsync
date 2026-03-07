jest.mock("@/lib/prisma", () => require("@/lib/__mocks__/prisma"));

import { prisma } from "@/lib/prisma";
import {
  createSectionMarker,
  listSectionMarkers,
  updateSectionMarker,
  deleteSectionMarker,
} from "../section.service";

const db = prisma as any;

beforeEach(() => jest.clearAllMocks());

describe("createSectionMarker", () => {
  it("creates a section marker for an arrangement", async () => {
    const mock = { id: "sm-1", name: "Intro", startBar: 1 };
    db.sectionMarker.create.mockResolvedValue(mock);

    const result = await createSectionMarker("arr-1", {
      name: "Intro",
      startBar: 1,
      sortOrder: 0,
    });

    expect(result).toEqual(mock);
    expect(db.sectionMarker.create).toHaveBeenCalledWith({
      data: {
        arrangementId: "arr-1",
        name: "Intro",
        startBar: 1,
        endBar: undefined,
        sortOrder: 0,
      },
    });
  });
});

describe("listSectionMarkers", () => {
  it("returns markers ordered by sortOrder", async () => {
    const markers = [
      { id: "sm-1", name: "Intro", sortOrder: 0 },
      { id: "sm-2", name: "Verse", sortOrder: 1 },
    ];
    db.sectionMarker.findMany.mockResolvedValue(markers);

    const result = await listSectionMarkers("arr-1");
    expect(result).toEqual(markers);
    expect(db.sectionMarker.findMany).toHaveBeenCalledWith({
      where: { arrangementId: "arr-1" },
      orderBy: { sortOrder: "asc" },
    });
  });
});

describe("updateSectionMarker", () => {
  it("updates marker fields", async () => {
    const updated = { id: "sm-1", name: "Outro" };
    db.sectionMarker.update.mockResolvedValue(updated);

    const result = await updateSectionMarker("sm-1", { name: "Outro" });
    expect(result.name).toBe("Outro");
  });
});

describe("deleteSectionMarker", () => {
  it("deletes a marker", async () => {
    db.sectionMarker.delete.mockResolvedValue({ id: "sm-1" });
    const result = await deleteSectionMarker("sm-1");
    expect(result.id).toBe("sm-1");
  });
});
