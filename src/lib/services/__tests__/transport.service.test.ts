jest.mock("@/lib/prisma", () => require("@/lib/__mocks__/prisma"));

import { prisma } from "@/lib/prisma";
import {
  play,
  pause,
  stop,
  seek,
  jumpToSection,
  getTransportState,
} from "../transport.service";
import { NotFoundError, InvalidStateError } from "@/lib/api/errors";

const db = prisma as any;

beforeEach(() => jest.clearAllMocks());

function mockActiveSession(state = "ready") {
  db.rehearsalSession.findUnique.mockResolvedValue({
    id: "sess-1",
    state,
    startedAt: null,
    transportState: { status: "stopped" },
  });
}

describe("play", () => {
  it("sets transport to playing and transitions session to live", async () => {
    mockActiveSession("ready");
    const mockTransport = { status: "playing", positionMs: 0 };
    db.transportState.update.mockResolvedValue(mockTransport);
    db.rehearsalSession.update.mockResolvedValue({ state: "live" });
    db.transportEvent.create.mockResolvedValue({});

    const result = await play("sess-1", "m-1", 0);
    expect(result.status).toBe("playing");
    expect(db.rehearsalSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ state: "live" }),
      })
    );
  });

  it("does not transition to live if already live", async () => {
    mockActiveSession("live");
    db.transportState.update.mockResolvedValue({ status: "playing" });
    db.transportEvent.create.mockResolvedValue({});

    await play("sess-1", "m-1", 5000);
    expect(db.rehearsalSession.update).not.toHaveBeenCalled();
  });

  it("throws for ended session", async () => {
    db.rehearsalSession.findUnique.mockResolvedValue({
      id: "sess-1",
      state: "ended",
    });
    await expect(play("sess-1", "m-1", 0)).rejects.toThrow(InvalidStateError);
  });

  it("throws for missing session", async () => {
    db.rehearsalSession.findUnique.mockResolvedValue(null);
    await expect(play("bad", "m-1", 0)).rejects.toThrow(NotFoundError);
  });
});

describe("pause", () => {
  it("sets transport to paused and session to paused", async () => {
    mockActiveSession("live");
    db.transportState.update.mockResolvedValue({ status: "paused", positionMs: 3000 });
    db.rehearsalSession.update.mockResolvedValue({ state: "paused" });
    db.transportEvent.create.mockResolvedValue({});

    const result = await pause("sess-1", "m-1", 3000);
    expect(result.status).toBe("paused");
    expect(db.rehearsalSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { state: "paused" },
      })
    );
  });
});

describe("stop", () => {
  it("resets transport state", async () => {
    mockActiveSession("live");
    db.transportState.update.mockResolvedValue({
      status: "stopped",
      positionMs: 0,
      currentBar: null,
    });
    db.transportEvent.create.mockResolvedValue({});

    const result = await stop("sess-1", "m-1", 0);
    expect(result.status).toBe("stopped");
  });
});

describe("seek", () => {
  it("updates position and bar/section", async () => {
    mockActiveSession("live");
    db.transportState.update.mockResolvedValue({
      positionMs: 5000,
      currentBar: 10,
    });
    db.transportEvent.create.mockResolvedValue({});

    const result = await seek("sess-1", "m-1", 5000, 10, "sm-1");
    expect(result.positionMs).toBe(5000);
    expect(result.currentBar).toBe(10);
  });
});

describe("jumpToSection", () => {
  it("jumps to a section marker's start bar", async () => {
    mockActiveSession("live");
    db.sectionMarker.findUnique.mockResolvedValue({
      id: "sm-1",
      startBar: 25,
    });
    db.transportState.update.mockResolvedValue({ currentBar: 25 });
    db.transportEvent.create.mockResolvedValue({});

    const result = await jumpToSection("sess-1", "m-1", "sm-1");
    expect(result.currentBar).toBe(25);
  });

  it("throws NotFoundError for missing section marker", async () => {
    db.sectionMarker.findUnique.mockResolvedValue(null);
    await expect(
      jumpToSection("sess-1", "m-1", "bad-id")
    ).rejects.toThrow(NotFoundError);
  });
});

describe("getTransportState", () => {
  it("returns transport state with section", async () => {
    db.transportState.findUnique.mockResolvedValue({
      sessionId: "sess-1",
      status: "playing",
      currentSection: { name: "Chorus" },
    });

    const result = await getTransportState("sess-1");
    expect(result.status).toBe("playing");
  });

  it("throws NotFoundError for missing transport", async () => {
    db.transportState.findUnique.mockResolvedValue(null);
    await expect(getTransportState("bad")).rejects.toThrow(NotFoundError);
  });
});
