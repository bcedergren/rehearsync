jest.mock("@/lib/prisma", () => require("@/lib/__mocks__/prisma"));

import { prisma } from "@/lib/prisma";
import {
  createJob,
  updateJobStatus,
  getJobStatus,
  listJobsForArrangement,
  findJobByExternalId,
} from "../processing.service";
import { NotFoundError } from "@/lib/api/errors";

const db = prisma as any;

beforeEach(() => jest.clearAllMocks());

describe("createJob", () => {
  it("creates a pending processing job", async () => {
    const mock = {
      id: "job-1",
      arrangementId: "arr-1",
      audioAssetId: "aa-1",
      jobType: "stem_separation",
      status: "pending",
      provider: "replicate",
    };
    db.processingJob.create.mockResolvedValue(mock);

    const result = await createJob("arr-1", "aa-1", "stem_separation");

    expect(result.status).toBe("pending");
    expect(db.processingJob.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        arrangementId: "arr-1",
        audioAssetId: "aa-1",
        jobType: "stem_separation",
        status: "pending",
        provider: "replicate",
      }),
    });
  });

  it("accepts optional inputPayload and parentJobId", async () => {
    db.processingJob.create.mockResolvedValue({ id: "job-2" });

    await createJob(
      "arr-1",
      "aa-1",
      "transcription",
      { model: "basic-pitch" },
      "parent-1"
    );

    expect(db.processingJob.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        inputPayload: { model: "basic-pitch" },
        parentJobId: "parent-1",
      }),
    });
  });
});

describe("updateJobStatus", () => {
  it("updates status to running with startedAt", async () => {
    db.processingJob.update.mockResolvedValue({ id: "job-1", status: "running" });

    await updateJobStatus("job-1", "running", { externalId: "pred-123" });

    expect(db.processingJob.update).toHaveBeenCalledWith({
      where: { id: "job-1" },
      data: expect.objectContaining({
        status: "running",
        externalId: "pred-123",
        startedAt: expect.any(Date),
      }),
    });
  });

  it("updates status to completed with completedAt", async () => {
    db.processingJob.update.mockResolvedValue({ id: "job-1", status: "completed" });

    await updateJobStatus("job-1", "completed", {
      outputPayload: { stems: ["vocals", "drums"] },
    });

    expect(db.processingJob.update).toHaveBeenCalledWith({
      where: { id: "job-1" },
      data: expect.objectContaining({
        status: "completed",
        outputPayload: { stems: ["vocals", "drums"] },
        completedAt: expect.any(Date),
      }),
    });
  });

  it("updates status to failed with errorMessage and completedAt", async () => {
    db.processingJob.update.mockResolvedValue({ id: "job-1", status: "failed" });

    await updateJobStatus("job-1", "failed", {
      errorMessage: "Model timed out",
    });

    expect(db.processingJob.update).toHaveBeenCalledWith({
      where: { id: "job-1" },
      data: expect.objectContaining({
        status: "failed",
        errorMessage: "Model timed out",
        completedAt: expect.any(Date),
      }),
    });
  });

  it("updates status without optional fields", async () => {
    db.processingJob.update.mockResolvedValue({ id: "job-1", status: "pending" });

    await updateJobStatus("job-1", "pending");

    expect(db.processingJob.update).toHaveBeenCalledWith({
      where: { id: "job-1" },
      data: { status: "pending" },
    });
  });
});

describe("getJobStatus", () => {
  it("returns job with child jobs", async () => {
    const mock = {
      id: "job-1",
      status: "completed",
      childJobs: [{ id: "child-1", jobType: "transcription", status: "running" }],
    };
    db.processingJob.findUnique.mockResolvedValue(mock);

    const result = await getJobStatus("job-1");
    expect(result.childJobs).toHaveLength(1);
  });

  it("throws NotFoundError for missing job", async () => {
    db.processingJob.findUnique.mockResolvedValue(null);
    await expect(getJobStatus("bad-id")).rejects.toThrow(NotFoundError);
  });
});

describe("listJobsForArrangement", () => {
  it("returns jobs ordered by createdAt desc", async () => {
    const jobs = [
      { id: "job-2", createdAt: new Date("2025-01-02") },
      { id: "job-1", createdAt: new Date("2025-01-01") },
    ];
    db.processingJob.findMany.mockResolvedValue(jobs);

    const result = await listJobsForArrangement("arr-1");
    expect(result).toHaveLength(2);
    expect(db.processingJob.findMany).toHaveBeenCalledWith({
      where: { arrangementId: "arr-1" },
      orderBy: { createdAt: "desc" },
      select: expect.objectContaining({
        id: true,
        jobType: true,
        status: true,
      }),
    });
  });
});

describe("findJobByExternalId", () => {
  it("returns job with arrangement and audio asset", async () => {
    const mock = {
      id: "job-1",
      externalId: "pred-123",
      arrangement: { id: "arr-1", songId: "song-1", song: { bandId: "band-1" } },
      audioAsset: { id: "aa-1" },
    };
    db.processingJob.findFirst.mockResolvedValue(mock);

    const result = await findJobByExternalId("pred-123");
    expect(result?.arrangement.song.bandId).toBe("band-1");
  });

  it("returns null when no job found", async () => {
    db.processingJob.findFirst.mockResolvedValue(null);

    const result = await findJobByExternalId("nonexistent");
    expect(result).toBeNull();
  });
});
