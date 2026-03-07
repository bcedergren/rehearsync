import { createSongSchema, updateSongSchema } from "../song";

describe("createSongSchema", () => {
  it("accepts valid song data", () => {
    const result = createSongSchema.parse({
      title: "Highway Star",
      artist: "Deep Purple",
      defaultBpm: 170,
    });
    expect(result.title).toBe("Highway Star");
    expect(result.defaultBpm).toBe(170);
  });

  it("requires title", () => {
    expect(() => createSongSchema.parse({})).toThrow();
  });

  it("rejects empty title", () => {
    expect(() => createSongSchema.parse({ title: "" })).toThrow();
  });

  it("rejects BPM below 20", () => {
    expect(() =>
      createSongSchema.parse({ title: "Song", defaultBpm: 10 })
    ).toThrow();
  });

  it("rejects BPM above 400", () => {
    expect(() =>
      createSongSchema.parse({ title: "Song", defaultBpm: 500 })
    ).toThrow();
  });

  it("allows optional fields to be omitted", () => {
    const result = createSongSchema.parse({ title: "Song" });
    expect(result.artist).toBeUndefined();
    expect(result.notes).toBeUndefined();
    expect(result.defaultBpm).toBeUndefined();
  });
});

describe("updateSongSchema", () => {
  it("accepts partial updates", () => {
    expect(updateSongSchema.parse({ title: "New" })).toEqual({ title: "New" });
    expect(updateSongSchema.parse({})).toEqual({});
  });

  it("allows null for nullable fields", () => {
    const result = updateSongSchema.parse({ artist: null, defaultBpm: null });
    expect(result.artist).toBeNull();
    expect(result.defaultBpm).toBeNull();
  });
});
