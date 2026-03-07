import {
  createBandSchema,
  updateBandSchema,
  inviteMemberSchema,
} from "../band";

describe("createBandSchema", () => {
  it("accepts valid band name", () => {
    expect(createBandSchema.parse({ name: "The Rockers" })).toEqual({
      name: "The Rockers",
    });
  });

  it("rejects empty name", () => {
    expect(() => createBandSchema.parse({ name: "" })).toThrow();
  });

  it("rejects name over 100 chars", () => {
    expect(() => createBandSchema.parse({ name: "x".repeat(101) })).toThrow();
  });

  it("rejects missing name", () => {
    expect(() => createBandSchema.parse({})).toThrow();
  });
});

describe("updateBandSchema", () => {
  it("accepts partial update", () => {
    expect(updateBandSchema.parse({})).toEqual({});
    expect(updateBandSchema.parse({ name: "New" })).toEqual({ name: "New" });
  });
});

describe("inviteMemberSchema", () => {
  it("accepts valid member data with defaults", () => {
    const result = inviteMemberSchema.parse({
      email: "test@test.com",
      displayName: "John",
    });
    expect(result.role).toBe("musician");
  });

  it("accepts explicit role", () => {
    const result = inviteMemberSchema.parse({
      email: "test@test.com",
      displayName: "John",
      role: "leader",
    });
    expect(result.role).toBe("leader");
  });

  it("rejects invalid email", () => {
    expect(() =>
      inviteMemberSchema.parse({ email: "not-email", displayName: "X" })
    ).toThrow();
  });

  it("rejects invalid role", () => {
    expect(() =>
      inviteMemberSchema.parse({
        email: "a@b.com",
        displayName: "X",
        role: "superadmin",
      })
    ).toThrow();
  });
});
