import { createArrangementSchema, updateArrangementSchema } from "../arrangement";

describe("createArrangementSchema", () => {
  it("accepts valid data with default versionLabel", () => {
    const result = createArrangementSchema.parse({ name: "Main Arrangement" });
    expect(result.name).toBe("Main Arrangement");
    expect(result.versionLabel).toBe("v1");
  });

  it("accepts explicit versionLabel", () => {
    const result = createArrangementSchema.parse({
      name: "Alt",
      versionLabel: "v2",
    });
    expect(result.versionLabel).toBe("v2");
  });

  it("rejects empty name", () => {
    expect(() => createArrangementSchema.parse({ name: "" })).toThrow();
  });

  it("rejects name over 200 chars", () => {
    expect(() =>
      createArrangementSchema.parse({ name: "x".repeat(201) })
    ).toThrow();
  });
});

describe("updateArrangementSchema", () => {
  it("accepts partial updates", () => {
    expect(updateArrangementSchema.parse({})).toEqual({});
    expect(updateArrangementSchema.parse({ name: "New" })).toEqual({
      name: "New",
    });
  });
});
