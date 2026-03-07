import {
  prepareUploadSchema,
  createSheetMusicAssetSchema,
  createAudioAssetSchema,
  activateAssetSchema,
} from "../upload";

describe("prepareUploadSchema", () => {
  it("accepts valid upload params", () => {
    const result = prepareUploadSchema.parse({
      bandId: "550e8400-e29b-41d4-a716-446655440000",
      fileName: "score.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024,
      kind: "sheet_music",
    });
    expect(result.kind).toBe("sheet_music");
  });

  it("rejects non-UUID bandId", () => {
    expect(() =>
      prepareUploadSchema.parse({
        bandId: "bad",
        fileName: "f.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1,
        kind: "sheet_music",
      })
    ).toThrow();
  });

  it("rejects negative sizeBytes", () => {
    expect(() =>
      prepareUploadSchema.parse({
        bandId: "550e8400-e29b-41d4-a716-446655440000",
        fileName: "f.pdf",
        mimeType: "application/pdf",
        sizeBytes: -1,
        kind: "sheet_music",
      })
    ).toThrow();
  });

  it("rejects invalid kind", () => {
    expect(() =>
      prepareUploadSchema.parse({
        bandId: "550e8400-e29b-41d4-a716-446655440000",
        fileName: "f.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1,
        kind: "video",
      })
    ).toThrow();
  });
});

describe("createSheetMusicAssetSchema", () => {
  it("accepts valid data", () => {
    const result = createSheetMusicAssetSchema.parse({
      partId: "550e8400-e29b-41d4-a716-446655440000",
      storageObjectId: "660e8400-e29b-41d4-a716-446655440000",
      fileType: "musicxml",
    });
    expect(result.fileType).toBe("musicxml");
  });

  it("accepts pdf fileType", () => {
    const result = createSheetMusicAssetSchema.parse({
      partId: "550e8400-e29b-41d4-a716-446655440000",
      storageObjectId: "660e8400-e29b-41d4-a716-446655440000",
      fileType: "pdf",
    });
    expect(result.fileType).toBe("pdf");
  });

  it("rejects invalid fileType", () => {
    expect(() =>
      createSheetMusicAssetSchema.parse({
        partId: "550e8400-e29b-41d4-a716-446655440000",
        storageObjectId: "660e8400-e29b-41d4-a716-446655440000",
        fileType: "docx",
      })
    ).toThrow();
  });
});

describe("createAudioAssetSchema", () => {
  it("accepts valid data", () => {
    const result = createAudioAssetSchema.parse({
      storageObjectId: "550e8400-e29b-41d4-a716-446655440000",
      assetRole: "full_mix",
    });
    expect(result.assetRole).toBe("full_mix");
  });

  it("accepts all valid asset roles", () => {
    for (const role of ["full_mix", "stem", "click", "guide"]) {
      const result = createAudioAssetSchema.parse({
        storageObjectId: "550e8400-e29b-41d4-a716-446655440000",
        assetRole: role,
      });
      expect(result.assetRole).toBe(role);
    }
  });

  it("rejects invalid assetRole", () => {
    expect(() =>
      createAudioAssetSchema.parse({
        storageObjectId: "550e8400-e29b-41d4-a716-446655440000",
        assetRole: "karaoke",
      })
    ).toThrow();
  });
});

describe("activateAssetSchema", () => {
  it("defaults to immediate", () => {
    const result = activateAssetSchema.parse({});
    expect(result.effectiveMode).toBe("immediate");
  });

  it("accepts all valid modes", () => {
    for (const mode of ["immediate", "next_stop", "next_section"]) {
      expect(
        activateAssetSchema.parse({ effectiveMode: mode }).effectiveMode
      ).toBe(mode);
    }
  });
});
