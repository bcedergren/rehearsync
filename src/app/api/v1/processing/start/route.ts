import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import { requireFeature } from "@/lib/subscriptions/guards";
import { startProcessingSchema } from "@/lib/validators/processing";
import * as processingService from "@/lib/services/processing.service";
import { prisma } from "@/lib/prisma";
import { createSignedDownloadUrl } from "@/lib/supabase-storage";
import {
  createStemSeparationPrediction,
  createTranscriptionPrediction,
  createBeatDetectionPrediction,
} from "@/lib/replicate";

export const POST = withAuth(async (req: NextRequest, ctx) => {
  await requireFeature(ctx.userId, "allowAiProcessing");

  const body = await req.json();
  const parsed = startProcessingSchema.safeParse(body);
  if (!parsed.success) {
    return response.validationError("Invalid input", {
      issues: parsed.error.issues,
    });
  }

  const { audioAssetId, jobType } = parsed.data;

  // Validate the audio asset exists and get its storage info
  const audioAsset = await prisma.audioAsset.findUnique({
    where: { id: audioAssetId },
    include: {
      storageObject: { select: { bucket: true, objectKey: true } },
      arrangement: { select: { id: true } },
    },
  });

  if (!audioAsset) {
    return response.notFound("Audio asset not found");
  }

  // For stem separation, require a full_mix asset
  if (jobType === "stem_separation" && audioAsset.assetRole !== "full_mix") {
    return response.validationError(
      "Stem separation requires a full mix audio asset"
    );
  }

  // Check for existing running job of same type for this asset
  const existingJob = await prisma.processingJob.findFirst({
    where: {
      audioAssetId,
      jobType,
      status: { in: ["pending", "running"] },
    },
  });

  if (existingJob) {
    return response.ok({ jobId: existingJob.id, status: existingJob.status });
  }

  // Create the processing job
  const job = await processingService.createJob(
    audioAsset.arrangementId,
    audioAssetId,
    jobType
  );

  // Get a signed URL for Replicate to access the audio
  const audioUrl = await createSignedDownloadUrl(
    audioAsset.storageObject.bucket,
    audioAsset.storageObject.objectKey,
    7200 // 2 hours — plenty of time for processing
  );

  try {
    let prediction;
    switch (jobType) {
      case "stem_separation":
        prediction = await createStemSeparationPrediction(audioUrl);
        break;
      case "transcription":
        prediction = await createTranscriptionPrediction(audioUrl);
        break;
      case "beat_detection":
        prediction = await createBeatDetectionPrediction(audioUrl);
        break;
    }

    await processingService.updateJobStatus(job.id, "running", {
      externalId: prediction.id,
    });

    return response.created({ jobId: job.id, status: "running" });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to start processing";
    await processingService.updateJobStatus(job.id, "failed", {
      errorMessage: message,
    });
    return response.error("processing_error", message, 500);
  }
});
