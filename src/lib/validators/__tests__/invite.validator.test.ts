import {
  createInviteLinkSchema,
  inviteLinkTypes,
} from "../invite";

describe("inviteLinkTypes", () => {
  it("contains expected types", () => {
    expect(inviteLinkTypes).toContain("band_invite");
    expect(inviteLinkTypes).toContain("session_join");
    expect(inviteLinkTypes).toHaveLength(2);
  });
});

describe("createInviteLinkSchema", () => {
  it("accepts empty object (all fields optional)", () => {
    const result = createInviteLinkSchema.parse({});
    expect(result.expiresInHours).toBeUndefined();
    expect(result.maxUses).toBeUndefined();
  });

  it("accepts valid expiresInHours", () => {
    const result = createInviteLinkSchema.parse({ expiresInHours: 24 });
    expect(result.expiresInHours).toBe(24);
  });

  it("accepts valid maxUses", () => {
    const result = createInviteLinkSchema.parse({ maxUses: 10 });
    expect(result.maxUses).toBe(10);
  });

  it("rejects expiresInHours less than 1", () => {
    expect(() =>
      createInviteLinkSchema.parse({ expiresInHours: 0 })
    ).toThrow();
  });

  it("rejects expiresInHours greater than 168", () => {
    expect(() =>
      createInviteLinkSchema.parse({ expiresInHours: 200 })
    ).toThrow();
  });

  it("rejects maxUses less than 1", () => {
    expect(() =>
      createInviteLinkSchema.parse({ maxUses: 0 })
    ).toThrow();
  });

  it("rejects maxUses greater than 100", () => {
    expect(() =>
      createInviteLinkSchema.parse({ maxUses: 101 })
    ).toThrow();
  });

  it("rejects non-integer expiresInHours", () => {
    expect(() =>
      createInviteLinkSchema.parse({ expiresInHours: 1.5 })
    ).toThrow();
  });
});
