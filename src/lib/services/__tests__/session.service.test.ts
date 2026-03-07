jest.mock("@/lib/prisma", () => require("@/lib/__mocks__/prisma"));

import { prisma } from "@/lib/prisma";
import {
  createSession,
  getSession,
  joinSession,
  leaveSession,
  setSessionReady,
  endSession,
  getMusicianView,
} from "../session.service";
import { NotFoundError, InvalidStateError } from "@/lib/api/errors";

const db = prisma as any;

beforeEach(() => jest.clearAllMocks());

describe("createSession", () => {
  it("creates a session and initial transport state in a transaction", async () => {
    const mockSession = { id: "sess-1" };
    const txMock = {
      rehearsalSession: { create: jest.fn().mockResolvedValue(mockSession) },
      transportState: { create: jest.fn().mockResolvedValue({}) },
    };
    db.$transaction.mockImplementation((cb: any) => cb(txMock));

    const result = await createSession("band-1", "member-1", {
      arrangementId: "arr-1",
    });

    expect(result).toEqual(mockSession);
    expect(txMock.transportState.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sessionId: "sess-1",
        status: "stopped",
        positionMs: 0,
      }),
    });
  });
});

describe("getSession", () => {
  it("returns session with full includes", async () => {
    const mock = { id: "sess-1", participants: [] };
    db.rehearsalSession.findUnique.mockResolvedValue(mock);

    const result = await getSession("sess-1");
    expect(result).toEqual(mock);
  });

  it("throws NotFoundError for missing session", async () => {
    db.rehearsalSession.findUnique.mockResolvedValue(null);
    await expect(getSession("bad")).rejects.toThrow(NotFoundError);
  });
});

describe("joinSession", () => {
  it("creates a participant entry for a live session", async () => {
    db.rehearsalSession.findUnique.mockResolvedValue({
      id: "sess-1",
      state: "ready",
      arrangementId: "arr-1",
      arrangement: {},
    });
    db.arrangementMemberAssignment.findUnique.mockResolvedValue({
      partId: "part-1",
    });
    const mockParticipant = { id: "sp-1", memberId: "m-1" };
    db.sessionParticipant.upsert.mockResolvedValue(mockParticipant);

    const result = await joinSession("sess-1", "m-1", {
      deviceType: "ipad",
    });

    expect(result).toEqual(mockParticipant);
  });

  it("throws NotFoundError for missing session", async () => {
    db.rehearsalSession.findUnique.mockResolvedValue(null);
    await expect(
      joinSession("bad", "m-1", { deviceType: "unknown" })
    ).rejects.toThrow(NotFoundError);
  });

  it("throws InvalidStateError for ended session", async () => {
    db.rehearsalSession.findUnique.mockResolvedValue({
      id: "sess-1",
      state: "ended",
    });
    await expect(
      joinSession("sess-1", "m-1", { deviceType: "unknown" })
    ).rejects.toThrow(InvalidStateError);
  });
});

describe("leaveSession", () => {
  it("sets participant connection to disconnected", async () => {
    db.sessionParticipant.update.mockResolvedValue({
      connectionState: "disconnected",
    });

    const result = await leaveSession("sess-1", "m-1");
    expect(result.connectionState).toBe("disconnected");
  });
});

describe("setSessionReady", () => {
  it("transitions draft session to ready", async () => {
    db.rehearsalSession.findUnique.mockResolvedValue({
      id: "sess-1",
      state: "draft",
    });
    db.rehearsalSession.update.mockResolvedValue({
      id: "sess-1",
      state: "ready",
    });

    const result = await setSessionReady("sess-1");
    expect(result.state).toBe("ready");
  });

  it("throws NotFoundError for missing session", async () => {
    db.rehearsalSession.findUnique.mockResolvedValue(null);
    await expect(setSessionReady("bad")).rejects.toThrow(NotFoundError);
  });

  it("throws InvalidStateError when session is not draft", async () => {
    db.rehearsalSession.findUnique.mockResolvedValue({
      id: "sess-1",
      state: "live",
    });
    await expect(setSessionReady("sess-1")).rejects.toThrow(InvalidStateError);
  });
});

describe("endSession", () => {
  it("ends a session with timestamp", async () => {
    db.rehearsalSession.update.mockResolvedValue({
      id: "sess-1",
      state: "ended",
      endedAt: expect.any(Date),
    });

    const result = await endSession("sess-1");
    expect(result.state).toBe("ended");
  });
});

describe("getMusicianView", () => {
  it("returns full musician view data", async () => {
    db.rehearsalSession.findUnique.mockResolvedValue({
      id: "sess-1",
      state: "live",
      arrangementId: "arr-1",
      transportState: { status: "playing", positionMs: 1000 },
    });
    db.arrangementMemberAssignment.findUnique.mockResolvedValue({
      partId: "part-1",
      part: { instrumentName: "Guitar", partName: "Lead" },
    });
    db.sheetMusicAsset.findFirst.mockResolvedValue({ id: "sma-1" });
    db.audioAsset.findMany.mockResolvedValue([{ id: "aa-1" }]);
    db.syncMap.findFirst.mockResolvedValue(null);
    db.sectionMarker.findMany.mockResolvedValue([
      { id: "sm-1", name: "Intro" },
    ]);

    const result = await getMusicianView("sess-1", "m-1");

    expect(result.session.id).toBe("sess-1");
    expect(result.transport.status).toBe("playing");
    expect(result.assignment).toEqual({
      partId: "part-1",
      instrumentName: "Guitar",
      partName: "Lead",
    });
    expect(result.sheetMusic).toBeDefined();
    expect(result.audio).toHaveLength(1);
    expect(result.sections).toHaveLength(1);
  });

  it("returns null assignment when member has no assignment", async () => {
    db.rehearsalSession.findUnique.mockResolvedValue({
      id: "sess-1",
      state: "live",
      arrangementId: "arr-1",
      transportState: { status: "stopped" },
    });
    db.arrangementMemberAssignment.findUnique.mockResolvedValue(null);
    db.audioAsset.findMany.mockResolvedValue([]);
    db.syncMap.findFirst.mockResolvedValue(null);
    db.sectionMarker.findMany.mockResolvedValue([]);

    const result = await getMusicianView("sess-1", "m-2");
    expect(result.assignment).toBeNull();
    expect(result.sheetMusic).toBeNull();
  });

  it("throws NotFoundError for missing session", async () => {
    db.rehearsalSession.findUnique.mockResolvedValue(null);
    await expect(getMusicianView("bad", "m-1")).rejects.toThrow(NotFoundError);
  });
});
