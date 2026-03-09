import { prisma, type Prisma } from "@/lib/prisma";
import { NotFoundError } from "@/lib/api/errors";
import type { ProcessingJobType } from "@/lib/validators/processing";

export async function createJob(
  arrangementId: string,
  audioAssetId: string,
  jobType: ProcessingJobType,
  inputPayload?: Record<string, unknown>,
  parentJobId?: string
) {
  return prisma.processingJob.create({
    data: {
      arrangementId,
      audioAssetId,
      jobType,
      status: "pending",
      provider: "replicate",
      inputPayload: (inputPayload ?? undefined) as Prisma.InputJsonValue | undefined,
      parentJobId: parentJobId ?? undefined,
    },
  });
}

export async function updateJobStatus(
  jobId: string,
  status: string,
  updates?: {
    externalId?: string;
    outputPayload?: Record<string, unknown>;
    errorMessage?: string;
  }
) {
  return prisma.processingJob.update({
    where: { id: jobId },
    data: {
      status,
      ...(updates?.externalId && { externalId: updates.externalId }),
      ...(updates?.outputPayload && {
        outputPayload: updates.outputPayload as Prisma.InputJsonValue,
      }),
      ...(updates?.errorMessage && { errorMessage: updates.errorMessage }),
      ...(status === "running" && { startedAt: new Date() }),
      ...(["completed", "failed"].includes(status) && {
        completedAt: new Date(),
      }),
    },
  });
}

export async function getJobStatus(jobId: string) {
  const job = await prisma.processingJob.findUnique({
    where: { id: jobId },
    include: {
      childJobs: {
        select: {
          id: true,
          jobType: true,
          status: true,
          errorMessage: true,
          completedAt: true,
        },
      },
    },
  });
  if (!job) throw new NotFoundError("ProcessingJob", jobId);
  return job;
}

export async function listJobsForArrangement(arrangementId: string) {
  return prisma.processingJob.findMany({
    where: { arrangementId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      jobType: true,
      status: true,
      provider: true,
      errorMessage: true,
      startedAt: true,
      completedAt: true,
      createdAt: true,
    },
  });
}

export async function findJobByExternalId(externalId: string) {
  return prisma.processingJob.findFirst({
    where: { externalId },
    include: {
      arrangement: {
        select: {
          id: true,
          songId: true,
          song: { select: { bandId: true } },
        },
      },
      audioAsset: {
        select: {
          id: true,
          arrangementId: true,
          storageObject: { select: { bucket: true, objectKey: true } },
        },
      },
    },
  });
}
