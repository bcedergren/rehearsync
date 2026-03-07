jest.mock("@/lib/prisma", () => require("@/lib/__mocks__/prisma"));

import { prisma } from "@/lib/prisma";
import {
  createOrUpdateAssignment,
  listAssignments,
  deleteAssignment,
} from "../assignment.service";

const db = prisma as any;

beforeEach(() => jest.clearAllMocks());

describe("createOrUpdateAssignment", () => {
  it("upserts an assignment with member and part includes", async () => {
    const mock = {
      id: "asgn-1",
      member: { id: "m-1", displayName: "John" },
      part: { id: "part-1", instrumentName: "Guitar", partName: null },
    };
    db.arrangementMemberAssignment.upsert.mockResolvedValue(mock);

    const result = await createOrUpdateAssignment("arr-1", {
      memberId: "m-1",
      partId: "part-1",
      isDefault: true,
    });

    expect(result).toEqual(mock);
    expect(db.arrangementMemberAssignment.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          arrangementId_memberId: { arrangementId: "arr-1", memberId: "m-1" },
        },
      })
    );
  });
});

describe("listAssignments", () => {
  it("returns assignments with member and part info", async () => {
    const assignments = [{ id: "asgn-1" }];
    db.arrangementMemberAssignment.findMany.mockResolvedValue(assignments);

    const result = await listAssignments("arr-1");
    expect(result).toEqual(assignments);
  });
});

describe("deleteAssignment", () => {
  it("deletes an assignment by id", async () => {
    db.arrangementMemberAssignment.delete.mockResolvedValue({ id: "asgn-1" });

    const result = await deleteAssignment("asgn-1");
    expect(result.id).toBe("asgn-1");
  });
});
