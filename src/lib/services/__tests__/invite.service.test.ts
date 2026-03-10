jest.mock("@/lib/prisma", () => require("@/lib/__mocks__/prisma"));

import { prisma } from "@/lib/prisma";
import {
  createBandInviteLink,
  createSessionJoinLink,
  resolveInviteLink,
  redeemBandInvite,
  revokeInviteLink,
  listInviteLinks,
} from "../invite.service";
import { NotFoundError, ValidationError } from "@/lib/api/errors";

const db = prisma as any;

beforeEach(() => jest.clearAllMocks());

describe("createBandInviteLink", () => {
  it("creates a band invite link with a code", async () => {
    const mock = { id: "link-1", code: "abc123", type: "band_invite" };
    db.inviteLink.create.mockResolvedValue(mock);

    const result = await createBandInviteLink("band-1", "member-1");

    expect(result.type).toBe("band_invite");
    expect(db.inviteLink.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        bandId: "band-1",
        type: "band_invite",
        createdByMemberId: "member-1",
      }),
    });
  });

  it("sets expiration when expiresInHours provided", async () => {
    db.inviteLink.create.mockResolvedValue({ id: "link-1" });

    await createBandInviteLink("band-1", "member-1", { expiresInHours: 24 });

    expect(db.inviteLink.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        expiresAt: expect.any(Date),
      }),
    });
  });

  it("sets maxUses when provided", async () => {
    db.inviteLink.create.mockResolvedValue({ id: "link-1" });

    await createBandInviteLink("band-1", "member-1", { maxUses: 10 });

    expect(db.inviteLink.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        maxUses: 10,
      }),
    });
  });
});

describe("createSessionJoinLink", () => {
  it("returns existing active link if one exists", async () => {
    const existing = { id: "link-1", code: "existing", sessionId: "sess-1" };
    db.inviteLink.findFirst.mockResolvedValue(existing);

    const result = await createSessionJoinLink("band-1", "sess-1", "member-1");

    expect(result).toBe(existing);
    expect(db.inviteLink.create).not.toHaveBeenCalled();
  });

  it("creates a new link if none exists", async () => {
    db.inviteLink.findFirst.mockResolvedValue(null);
    const mock = { id: "link-2", code: "newcode", sessionId: "sess-1" };
    db.inviteLink.create.mockResolvedValue(mock);

    const result = await createSessionJoinLink("band-1", "sess-1", "member-1");

    expect(result.sessionId).toBe("sess-1");
    expect(db.inviteLink.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sessionId: "sess-1",
        type: "session_join",
      }),
    });
  });
});

describe("resolveInviteLink", () => {
  it("returns valid link", async () => {
    const link = {
      id: "link-1",
      code: "abc",
      isRevoked: false,
      expiresAt: null,
      maxUses: null,
      useCount: 0,
      type: "band_invite",
      band: { id: "band-1", name: "My Band" },
      session: null,
    };
    db.inviteLink.findUnique.mockResolvedValue(link);

    const result = await resolveInviteLink("abc");
    expect(result.code).toBe("abc");
  });

  it("throws NotFoundError for missing code", async () => {
    db.inviteLink.findUnique.mockResolvedValue(null);
    await expect(resolveInviteLink("bad")).rejects.toThrow(NotFoundError);
  });

  it("throws ValidationError for revoked link", async () => {
    db.inviteLink.findUnique.mockResolvedValue({
      id: "link-1",
      isRevoked: true,
      band: { id: "b-1", name: "X" },
      session: null,
    });
    await expect(resolveInviteLink("revoked")).rejects.toThrow(ValidationError);
  });

  it("throws ValidationError for expired link", async () => {
    db.inviteLink.findUnique.mockResolvedValue({
      id: "link-1",
      isRevoked: false,
      expiresAt: new Date("2020-01-01"),
      maxUses: null,
      useCount: 0,
      band: { id: "b-1", name: "X" },
      session: null,
    });
    await expect(resolveInviteLink("expired")).rejects.toThrow(ValidationError);
  });

  it("throws ValidationError when max uses reached", async () => {
    db.inviteLink.findUnique.mockResolvedValue({
      id: "link-1",
      isRevoked: false,
      expiresAt: null,
      maxUses: 5,
      useCount: 5,
      band: { id: "b-1", name: "X" },
      session: null,
    });
    await expect(resolveInviteLink("full")).rejects.toThrow(ValidationError);
  });
});

describe("redeemBandInvite", () => {
  const validLink = {
    id: "link-1",
    code: "abc",
    bandId: "band-1",
    type: "band_invite",
    defaultRole: "musician",
    isRevoked: false,
    expiresAt: null,
    maxUses: null,
    useCount: 0,
    band: { id: "band-1", name: "My Band" },
    session: null,
  };

  it("returns existing member if already in band", async () => {
    db.inviteLink.findUnique.mockResolvedValue(validLink);
    const member = { id: "m-1", bandId: "band-1", isActive: true };
    db.member.findFirst.mockResolvedValue(member);

    const result = await redeemBandInvite("abc", "user-1", "test@test.com", "Test");

    expect(result.alreadyMember).toBe(true);
    expect(db.member.create).not.toHaveBeenCalled();
  });

  it("creates new member when not in band", async () => {
    db.inviteLink.findUnique.mockResolvedValue(validLink);
    db.member.findFirst
      .mockResolvedValueOnce(null)  // not active member
      .mockResolvedValueOnce({ id: "leader-1", user: { tier: "band" } }) // leader lookup
      .mockResolvedValueOnce(null); // not inactive member
    db.member.count.mockResolvedValue(1); // current member count
    const newMember = { id: "m-2", bandId: "band-1", role: "musician" };
    db.member.create.mockResolvedValue(newMember);
    db.inviteLink.updateMany.mockResolvedValue({ count: 1 });

    const result = await redeemBandInvite("abc", "user-1", "test@test.com", "Test");

    expect(result.alreadyMember).toBe(false);
    expect(db.member.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        bandId: "band-1",
        userId: "user-1",
        role: "musician",
      }),
    });
  });

  it("reactivates inactive member", async () => {
    db.inviteLink.findUnique.mockResolvedValue(validLink);
    db.member.findFirst
      .mockResolvedValueOnce(null)  // not active
      .mockResolvedValueOnce({ id: "leader-1", user: { tier: "band" } }) // leader lookup
      .mockResolvedValueOnce({ id: "m-old", isActive: false }); // inactive exists
    db.member.count.mockResolvedValue(1); // current member count
    db.member.update.mockResolvedValue({ id: "m-old", isActive: true });
    db.inviteLink.updateMany.mockResolvedValue({ count: 1 });

    const result = await redeemBandInvite("abc", "user-1", "test@test.com", "Test");

    expect(result.alreadyMember).toBe(false);
    expect(db.member.update).toHaveBeenCalledWith({
      where: { id: "m-old" },
      data: expect.objectContaining({ isActive: true }),
    });
  });
});

describe("revokeInviteLink", () => {
  it("sets isRevoked to true", async () => {
    db.inviteLink.update.mockResolvedValue({ id: "link-1", isRevoked: true });

    const result = await revokeInviteLink("link-1");
    expect(result.isRevoked).toBe(true);
  });
});

describe("listInviteLinks", () => {
  it("returns active non-expired links", async () => {
    const links = [{ id: "link-1", code: "abc" }];
    db.inviteLink.findMany.mockResolvedValue(links);

    const result = await listInviteLinks("band-1");
    expect(result).toHaveLength(1);
    expect(db.inviteLink.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          bandId: "band-1",
          isRevoked: false,
        }),
      })
    );
  });

  it("filters by type when provided", async () => {
    db.inviteLink.findMany.mockResolvedValue([]);

    await listInviteLinks("band-1", "session_join");

    expect(db.inviteLink.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          type: "session_join",
        }),
      })
    );
  });
});
