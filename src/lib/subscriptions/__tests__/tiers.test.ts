import { getTierLimits, isValidTier, TIER_LIMITS } from "../tiers";

describe("getTierLimits", () => {
  it("returns free tier limits by default", () => {
    const limits = getTierLimits("free");
    expect(limits.maxBands).toBe(1);
    expect(limits.maxSongsPerBand).toBe(1);
    expect(limits.allowPracticeTools).toBe(false);
  });

  it("returns band tier limits", () => {
    const limits = getTierLimits("band");
    expect(limits.maxSongsPerBand).toBe(Infinity);
    expect(limits.allowMusicXml).toBe(true);
    expect(limits.allowPracticeTools).toBe(true);
  });

  it("returns agent tier limits", () => {
    const limits = getTierLimits("agent");
    expect(limits.maxBands).toBe(Infinity);
    expect(limits.allowSessions).toBe(true);
    expect(limits.allowPracticeTools).toBe(true);
  });

  it("falls back to free for unknown tier", () => {
    const limits = getTierLimits("unknown");
    expect(limits).toEqual(TIER_LIMITS.free);
  });
});

describe("isValidTier", () => {
  it("accepts valid tiers", () => {
    expect(isValidTier("free")).toBe(true);
    expect(isValidTier("band")).toBe(true);
    expect(isValidTier("agent")).toBe(true);
  });

  it("rejects invalid tiers", () => {
    expect(isValidTier("premium")).toBe(false);
    expect(isValidTier("")).toBe(false);
  });
});

describe("TIER_LIMITS", () => {
  it("free tier disallows paid features", () => {
    const free = TIER_LIMITS.free;
    expect(free.allowMusicXml).toBe(false);
    expect(free.allowMultipleArrangements).toBe(false);
    expect(free.allowSessions).toBe(false);
    expect(free.allowTransportControls).toBe(false);
    expect(free.allowSyncMaps).toBe(false);
    expect(free.allowPracticeTools).toBe(false);
    expect(free.maxAudioUploads).toBe(1);
  });

  it("band tier unlocks practice tools but not sessions", () => {
    const band = TIER_LIMITS.band;
    expect(band.allowPracticeTools).toBe(true);
    expect(band.allowMusicXml).toBe(true);
    expect(band.allowMultipleArrangements).toBe(true);
    expect(band.allowSessions).toBe(false);
    expect(band.allowTransportControls).toBe(false);
    expect(band.allowSyncMaps).toBe(true);
  });

  it("agent tier unlocks all features", () => {
    const agent = TIER_LIMITS.agent;
    expect(agent.allowPracticeTools).toBe(true);
    expect(agent.allowSessions).toBe(true);
    expect(agent.allowTransportControls).toBe(true);
    expect(agent.allowSyncMaps).toBe(true);
    expect(agent.maxBands).toBe(Infinity);
    expect(agent.maxMembersPerBand).toBe(Infinity);
  });
});
