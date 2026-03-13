jest.mock("@/lib/prisma", () => {
  const mock = require("@/lib/__mocks__/prisma");
  // guards.ts uses findUniqueOrThrow which isn't in the default mock
  mock.prisma.user.findUniqueOrThrow = jest.fn();
  return mock;
});

import { prisma } from "@/lib/prisma";
import { requireFeature, TierLimitError } from "../guards";

const db = prisma as any;

beforeEach(() => jest.clearAllMocks());

describe("requireFeature", () => {
  it("allows practice tools for band tier", async () => {
    db.user.findUniqueOrThrow.mockResolvedValue({ tier: "band" });
    await expect(requireFeature("u1", "allowPracticeTools")).resolves.toBeUndefined();
  });

  it("allows practice tools for agent tier", async () => {
    db.user.findUniqueOrThrow.mockResolvedValue({ tier: "agent" });
    await expect(requireFeature("u1", "allowPracticeTools")).resolves.toBeUndefined();
  });

  it("blocks practice tools for free tier", async () => {
    db.user.findUniqueOrThrow.mockResolvedValue({ tier: "free" });
    await expect(requireFeature("u1", "allowPracticeTools")).rejects.toThrow(TierLimitError);
  });

  it("blocks practice tools with correct required tier", async () => {
    db.user.findUniqueOrThrow.mockResolvedValue({ tier: "free" });
    try {
      await requireFeature("u1", "allowPracticeTools");
      fail("Expected TierLimitError");
    } catch (err) {
      expect(err).toBeInstanceOf(TierLimitError);
      expect((err as TierLimitError).requiredTier).toBe("band");
    }
  });

  it("allows sessions only for agent tier", async () => {
    db.user.findUniqueOrThrow.mockResolvedValue({ tier: "band" });
    await expect(requireFeature("u1", "allowSessions")).rejects.toThrow(TierLimitError);
  });

  it("allows music xml for band tier", async () => {
    db.user.findUniqueOrThrow.mockResolvedValue({ tier: "band" });
    await expect(requireFeature("u1", "allowMusicXml")).resolves.toBeUndefined();
  });

  it("blocks music xml for free tier", async () => {
    db.user.findUniqueOrThrow.mockResolvedValue({ tier: "free" });
    await expect(requireFeature("u1", "allowMusicXml")).rejects.toThrow(TierLimitError);
  });
});
