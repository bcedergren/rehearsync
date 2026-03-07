jest.mock("@/lib/prisma", () => require("@/lib/__mocks__/prisma"));

import { prisma } from "@/lib/prisma";
import {
  createBand,
  getBand,
  updateBand,
  listBandsForUser,
  listMembers,
  addMember,
  updateMemberRole,
  deactivateMember,
} from "../band.service";
import { NotFoundError, ValidationError } from "@/lib/api/errors";

const db = prisma as any;

beforeEach(() => jest.clearAllMocks());

describe("createBand", () => {
  it("creates a band and adds the creator as leader", async () => {
    const mockBand = { id: "band-1", name: "The Rockers" };
    const txMock = {
      band: { create: jest.fn().mockResolvedValue(mockBand) },
      member: { create: jest.fn().mockResolvedValue({}) },
    };
    db.$transaction.mockImplementation((cb: any) => cb(txMock));

    const result = await createBand("user-1", "test@test.com", {
      name: "The Rockers",
    });

    expect(result).toEqual(mockBand);
    expect(txMock.band.create).toHaveBeenCalledWith({
      data: { name: "The Rockers" },
    });
    expect(txMock.member.create).toHaveBeenCalledWith({
      data: {
        bandId: "band-1",
        userId: "user-1",
        email: "test@test.com",
        displayName: "The Rockers",
        role: "leader",
      },
    });
  });
});

describe("getBand", () => {
  it("returns a band with active members", async () => {
    const mockBand = {
      id: "band-1",
      name: "The Rockers",
      members: [{ id: "m-1", displayName: "John" }],
    };
    db.band.findUnique.mockResolvedValue(mockBand);

    const result = await getBand("band-1");
    expect(result).toEqual(mockBand);
    expect(db.band.findUnique).toHaveBeenCalledWith({
      where: { id: "band-1" },
      include: { members: { where: { isActive: true } } },
    });
  });

  it("throws NotFoundError when band does not exist", async () => {
    db.band.findUnique.mockResolvedValue(null);
    await expect(getBand("bad-id")).rejects.toThrow(NotFoundError);
  });
});

describe("updateBand", () => {
  it("updates band name", async () => {
    const updated = { id: "band-1", name: "New Name" };
    db.band.update.mockResolvedValue(updated);

    const result = await updateBand("band-1", { name: "New Name" });
    expect(result).toEqual(updated);
    expect(db.band.update).toHaveBeenCalledWith({
      where: { id: "band-1" },
      data: { name: "New Name" },
    });
  });
});

describe("listBandsForUser", () => {
  it("returns bands the user is an active member of", async () => {
    const bands = [{ id: "band-1", name: "The Rockers" }];
    db.band.findMany.mockResolvedValue(bands);

    const result = await listBandsForUser("user-1");
    expect(result).toEqual(bands);
    expect(db.band.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { members: { some: { userId: "user-1", isActive: true } } },
      })
    );
  });
});

describe("listMembers", () => {
  it("returns active members of a band", async () => {
    const members = [{ id: "m-1", displayName: "John" }];
    db.member.findMany.mockResolvedValue(members);

    const result = await listMembers("band-1");
    expect(result).toEqual(members);
    expect(db.member.findMany).toHaveBeenCalledWith({
      where: { bandId: "band-1", isActive: true },
      orderBy: { displayName: "asc" },
    });
  });
});

describe("addMember", () => {
  it("creates a new member when no existing member found", async () => {
    db.member.findUnique.mockResolvedValue(null);
    const mockUser = { id: "user-2", email: "new@test.com" };
    db.user.findUnique.mockResolvedValue(mockUser);
    const mockMember = { id: "m-2", displayName: "Jane" };
    db.member.create.mockResolvedValue(mockMember);

    const result = await addMember("band-1", {
      email: "new@test.com",
      displayName: "Jane",
      role: "musician",
    });

    expect(result).toEqual(mockMember);
    expect(db.member.create).toHaveBeenCalled();
  });

  it("reactivates an inactive member", async () => {
    const existing = { id: "m-2", isActive: false };
    db.member.findUnique.mockResolvedValue(existing);
    const updated = { ...existing, isActive: true };
    db.member.update.mockResolvedValue(updated);

    const result = await addMember("band-1", {
      email: "old@test.com",
      displayName: "Jane",
      role: "musician",
    });

    expect(result.isActive).toBe(true);
    expect(db.member.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "m-2" } })
    );
  });

  it("throws ValidationError for duplicate active member", async () => {
    db.member.findUnique.mockResolvedValue({ id: "m-2", isActive: true });

    await expect(
      addMember("band-1", {
        email: "dup@test.com",
        displayName: "Dup",
        role: "musician",
      })
    ).rejects.toThrow(ValidationError);
  });

  it("creates a new user if one doesn't exist", async () => {
    db.member.findUnique.mockResolvedValue(null);
    db.user.findUnique.mockResolvedValue(null);
    const newUser = { id: "user-new", email: "brand@new.com" };
    db.user.create.mockResolvedValue(newUser);
    db.member.create.mockResolvedValue({ id: "m-new" });

    await addMember("band-1", {
      email: "brand@new.com",
      displayName: "Brand New",
      role: "musician",
    });

    expect(db.user.create).toHaveBeenCalledWith({
      data: { email: "brand@new.com", name: "Brand New" },
    });
  });
});

describe("updateMemberRole", () => {
  it("updates a member's role", async () => {
    db.member.update.mockResolvedValue({ id: "m-1", role: "admin" });
    const result = await updateMemberRole("m-1", "admin");
    expect(result.role).toBe("admin");
  });
});

describe("deactivateMember", () => {
  it("sets isActive to false", async () => {
    db.member.update.mockResolvedValue({ id: "m-1", isActive: false });
    const result = await deactivateMember("m-1");
    expect(result.isActive).toBe(false);
  });
});
