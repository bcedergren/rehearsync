import {
  transportPlaySchema,
  transportPauseSchema,
  transportStopSchema,
  transportSeekSchema,
  transportJumpSectionSchema,
} from "../transport";

describe("transportPlaySchema", () => {
  it("defaults positionMs to 0", () => {
    const result = transportPlaySchema.parse({});
    expect(result.positionMs).toBe(0);
  });

  it("accepts explicit positionMs", () => {
    const result = transportPlaySchema.parse({ positionMs: 5000 });
    expect(result.positionMs).toBe(5000);
  });

  it("rejects negative positionMs", () => {
    expect(() => transportPlaySchema.parse({ positionMs: -1 })).toThrow();
  });
});

describe("transportPauseSchema", () => {
  it("requires positionMs", () => {
    expect(() => transportPauseSchema.parse({})).toThrow();
  });

  it("accepts valid positionMs", () => {
    expect(transportPauseSchema.parse({ positionMs: 3000 }).positionMs).toBe(3000);
  });
});

describe("transportStopSchema", () => {
  it("defaults positionMs to 0", () => {
    expect(transportStopSchema.parse({}).positionMs).toBe(0);
  });
});

describe("transportSeekSchema", () => {
  it("requires positionMs, optional bar and section", () => {
    const result = transportSeekSchema.parse({ positionMs: 10000 });
    expect(result.positionMs).toBe(10000);
    expect(result.currentBar).toBeUndefined();
  });

  it("accepts optional currentBar and sectionMarkerId", () => {
    const result = transportSeekSchema.parse({
      positionMs: 10000,
      currentBar: 5,
      sectionMarkerId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.currentBar).toBe(5);
    expect(result.sectionMarkerId).toBeDefined();
  });

  it("rejects non-UUID sectionMarkerId", () => {
    expect(() =>
      transportSeekSchema.parse({
        positionMs: 1000,
        sectionMarkerId: "not-a-uuid",
      })
    ).toThrow();
  });
});

describe("transportJumpSectionSchema", () => {
  it("requires sectionMarkerId as UUID", () => {
    const result = transportJumpSectionSchema.parse({
      sectionMarkerId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.sectionMarkerId).toBeDefined();
  });

  it("rejects missing sectionMarkerId", () => {
    expect(() => transportJumpSectionSchema.parse({})).toThrow();
  });
});
