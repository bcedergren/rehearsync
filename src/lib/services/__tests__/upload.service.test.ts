jest.mock("@/lib/prisma", () => require("@/lib/__mocks__/prisma"));
jest.mock("@/lib/local-storage", () => ({
  saveFile: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("uuid", () => ({
  v4: () => "test-uuid-1234",
}));

import { prisma } from "@/lib/prisma";
import { saveFile } from "@/lib/local-storage";
import { uploadFile } from "../upload.service";

const db = prisma as any;

beforeEach(() => jest.clearAllMocks());

describe("uploadFile", () => {
  it("saves a valid sheet music file and creates storage object", async () => {
    const mockStorageObj = { id: "so-1", objectKey: "bands/band-1/sheet_music/test-uuid-1234.pdf" };
    db.storageObject.create.mockResolvedValue(mockStorageObj);

    const data = Buffer.from("fake-pdf-content");
    const result = await uploadFile(
      "member-1",
      "band-1",
      "sheet_music",
      "score.pdf",
      "application/pdf",
      data
    );

    expect(result.storageObjectId).toBe("so-1");
    expect(result.objectKey).toBe("bands/band-1/sheet_music/test-uuid-1234.pdf");
    expect(saveFile).toHaveBeenCalledWith(
      "bands/band-1/sheet_music/test-uuid-1234.pdf",
      data
    );
    expect(db.storageObject.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        bucket: "local",
        mimeType: "application/pdf",
        sizeBytes: BigInt(data.length),
        uploadedByMemberId: "member-1",
      }),
    });
  });

  it("saves a valid audio file", async () => {
    db.storageObject.create.mockResolvedValue({ id: "so-2" });
    const data = Buffer.from("fake-audio");

    await uploadFile(
      "member-1",
      "band-1",
      "audio",
      "track.mp3",
      "audio/mpeg",
      data
    );

    expect(saveFile).toHaveBeenCalledWith(
      "bands/band-1/audio/test-uuid-1234.mp3",
      data
    );
  });

  it("rejects unsupported sheet music MIME types", async () => {
    const data = Buffer.from("fake");
    await expect(
      uploadFile("m-1", "b-1", "sheet_music", "file.exe", "application/exe", data)
    ).rejects.toThrow("Unsupported file type");
  });

  it("rejects unsupported audio MIME types", async () => {
    const data = Buffer.from("fake");
    await expect(
      uploadFile("m-1", "b-1", "audio", "file.txt", "text/plain", data)
    ).rejects.toThrow("Unsupported file type");
  });

  it("rejects files that exceed size limits for sheet music", async () => {
    const bigData = Buffer.alloc(51 * 1024 * 1024); // 51MB
    await expect(
      uploadFile("m-1", "b-1", "sheet_music", "big.pdf", "application/pdf", bigData)
    ).rejects.toThrow("File too large");
  });

  it("rejects files that exceed size limits for audio", async () => {
    const bigData = Buffer.alloc(501 * 1024 * 1024); // 501MB
    await expect(
      uploadFile("m-1", "b-1", "audio", "big.wav", "audio/wav", bigData)
    ).rejects.toThrow("File too large");
  });
});
