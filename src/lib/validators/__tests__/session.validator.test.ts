import {
  createSessionSchema,
  joinSessionSchema,
  createSectionMarkerSchema,
  updateSectionMarkerSchema,
  createSyncMapSchema,
  addSyncMapPointsSchema,
  assignmentSchema,
} from "../session";

describe("createSessionSchema", () => {
  it("accepts valid UUID arrangementId", () => {
    const result = createSessionSchema.parse({
      arrangementId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.arrangementId).toBeDefined();
  });

  it("rejects non-UUID arrangementId", () => {
    expect(() =>
      createSessionSchema.parse({ arrangementId: "not-a-uuid" })
    ).toThrow();
  });
});

describe("joinSessionSchema", () => {
  it("provides default device type", () => {
    const result = joinSessionSchema.parse({});
    expect(result.deviceType).toBe("unknown");
  });

  it("accepts valid device types", () => {
    const types = ["ipad", "android_tablet", "laptop", "phone", "desktop"] as const;
    for (const t of types) {
      const result = joinSessionSchema.parse({ deviceType: t });
      expect(result.deviceType).toBe(t);
    }
  });

  it("rejects invalid device type", () => {
    expect(() =>
      joinSessionSchema.parse({ deviceType: "smartwatch" })
    ).toThrow();
  });
});

describe("createSectionMarkerSchema", () => {
  it("accepts valid section marker", () => {
    const result = createSectionMarkerSchema.parse({
      name: "Intro",
      startBar: 1,
    });
    expect(result.name).toBe("Intro");
    expect(result.sortOrder).toBe(0);
  });

  it("rejects startBar less than 1", () => {
    expect(() =>
      createSectionMarkerSchema.parse({ name: "X", startBar: 0 })
    ).toThrow();
  });
});

describe("updateSectionMarkerSchema", () => {
  it("accepts partial updates", () => {
    expect(updateSectionMarkerSchema.parse({ name: "Verse 2" })).toEqual({
      name: "Verse 2",
    });
  });

  it("allows null for endBar", () => {
    const result = updateSectionMarkerSchema.parse({ endBar: null });
    expect(result.endBar).toBeNull();
  });
});

describe("createSyncMapSchema", () => {
  it("defaults to manual source type", () => {
    const result = createSyncMapSchema.parse({});
    expect(result.sourceType).toBe("manual");
  });

  it("accepts valid source types", () => {
    for (const t of ["manual", "imported", "generated"]) {
      expect(createSyncMapSchema.parse({ sourceType: t }).sourceType).toBe(t);
    }
  });
});

describe("addSyncMapPointsSchema", () => {
  it("accepts valid points array", () => {
    const result = addSyncMapPointsSchema.parse({
      points: [
        { timeMs: 0, barNumber: 1 },
        { timeMs: 2000, barNumber: 2, beatNumber: 1, tickOffset: 0 },
      ],
    });
    expect(result.points).toHaveLength(2);
  });

  it("rejects empty points array", () => {
    expect(() => addSyncMapPointsSchema.parse({ points: [] })).toThrow();
  });

  it("rejects negative timeMs", () => {
    expect(() =>
      addSyncMapPointsSchema.parse({
        points: [{ timeMs: -1, barNumber: 1 }],
      })
    ).toThrow();
  });

  it("rejects barNumber less than 1", () => {
    expect(() =>
      addSyncMapPointsSchema.parse({
        points: [{ timeMs: 0, barNumber: 0 }],
      })
    ).toThrow();
  });
});

describe("assignmentSchema", () => {
  it("accepts valid UUIDs with default isDefault", () => {
    const result = assignmentSchema.parse({
      memberId: "550e8400-e29b-41d4-a716-446655440000",
      partId: "660e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.isDefault).toBe(true);
  });

  it("rejects non-UUID memberId", () => {
    expect(() =>
      assignmentSchema.parse({
        memberId: "not-uuid",
        partId: "660e8400-e29b-41d4-a716-446655440000",
      })
    ).toThrow();
  });
});
