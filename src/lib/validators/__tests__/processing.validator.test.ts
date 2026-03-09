import {
  startProcessingSchema,
  processingJobTypes,
} from "../processing";

describe("processingJobTypes", () => {
  it("contains expected job types", () => {
    expect(processingJobTypes).toContain("stem_separation");
    expect(processingJobTypes).toContain("transcription");
    expect(processingJobTypes).toContain("beat_detection");
    expect(processingJobTypes).toHaveLength(3);
  });
});

describe("startProcessingSchema", () => {
  const validUuid = "550e8400-e29b-41d4-a716-446655440000";

  it("accepts valid stem_separation input", () => {
    const result = startProcessingSchema.parse({
      audioAssetId: validUuid,
      jobType: "stem_separation",
    });
    expect(result.jobType).toBe("stem_separation");
    expect(result.audioAssetId).toBe(validUuid);
  });

  it("accepts valid transcription input", () => {
    const result = startProcessingSchema.parse({
      audioAssetId: validUuid,
      jobType: "transcription",
    });
    expect(result.jobType).toBe("transcription");
  });

  it("accepts valid beat_detection input", () => {
    const result = startProcessingSchema.parse({
      audioAssetId: validUuid,
      jobType: "beat_detection",
    });
    expect(result.jobType).toBe("beat_detection");
  });

  it("rejects non-UUID audioAssetId", () => {
    expect(() =>
      startProcessingSchema.parse({
        audioAssetId: "not-a-uuid",
        jobType: "stem_separation",
      })
    ).toThrow();
  });

  it("rejects invalid jobType", () => {
    expect(() =>
      startProcessingSchema.parse({
        audioAssetId: validUuid,
        jobType: "mastering",
      })
    ).toThrow();
  });

  it("rejects missing audioAssetId", () => {
    expect(() =>
      startProcessingSchema.parse({
        jobType: "stem_separation",
      })
    ).toThrow();
  });

  it("rejects missing jobType", () => {
    expect(() =>
      startProcessingSchema.parse({
        audioAssetId: validUuid,
      })
    ).toThrow();
  });

  it("rejects empty object", () => {
    expect(() => startProcessingSchema.parse({})).toThrow();
  });
});
