import { createPartSchema, updatePartSchema } from "../part";

describe("createPartSchema", () => {
  it("accepts valid part data with defaults", () => {
    const result = createPartSchema.parse({ instrumentName: "Guitar" });
    expect(result.instrumentName).toBe("Guitar");
    expect(result.displayOrder).toBe(0);
    expect(result.isRequired).toBe(true);
  });

  it("accepts explicit optional fields", () => {
    const result = createPartSchema.parse({
      instrumentName: "Trumpet",
      partName: "1st",
      transposition: "Bb",
      displayOrder: 3,
      isRequired: false,
    });
    expect(result.partName).toBe("1st");
    expect(result.transposition).toBe("Bb");
    expect(result.isRequired).toBe(false);
  });

  it("rejects empty instrument name", () => {
    expect(() => createPartSchema.parse({ instrumentName: "" })).toThrow();
  });

  it("rejects negative displayOrder", () => {
    expect(() =>
      createPartSchema.parse({ instrumentName: "X", displayOrder: -1 })
    ).toThrow();
  });
});

describe("updatePartSchema", () => {
  it("accepts empty update", () => {
    expect(updatePartSchema.parse({})).toEqual({});
  });

  it("allows null for nullable fields", () => {
    const result = updatePartSchema.parse({ partName: null, transposition: null });
    expect(result.partName).toBeNull();
    expect(result.transposition).toBeNull();
  });
});
