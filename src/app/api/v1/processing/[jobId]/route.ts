import { withAuth } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import * as processingService from "@/lib/services/processing.service";
import {
  replicate,
  createStemSeparationPrediction,
  createTranscriptionPrediction,
  createBeatDetectionPrediction,
} from "@/lib/replicate";
import { prisma } from "@/lib/prisma";
import { createSignedDownloadUrl } from "@/lib/supabase-storage";

/** Max time a prediction can stay in "starting" before we auto-retry (ms) */
const STARTING_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

/** Max number of automatic cold-start retries before giving up */
const MAX_COLD_START_RETRIES = 2;

/**
 * Cancel the stuck prediction and create a fresh one for the same job.
 * Returns the new prediction ID, or null if retries are exhausted.
 */
async function retryColdStart(
  job: Awaited<ReturnType<typeof processingService.getJobStatus>>
): Promise<string | null> {
  const payload = (job.inputPayload ?? {}) as Record<string, unknown>;
  const retryCount = (typeof payload._coldStartRetries === "number" ? payload._coldStartRetries : 0);

  if (retryCount >= MAX_COLD_START_RETRIES) return null;

  // Best-effort cancel the stuck prediction
  try {
    if (job.externalId) await replicate.predictions.cancel(job.externalId);
  } catch {
    // ignore
  }

  // Re-fetch the audio asset to build a fresh signed URL
  const audioAsset = job.audioAssetId
    ? await prisma.audioAsset.findUnique({
        where: { id: job.audioAssetId },
        include: {
          storageObject: { select: { bucket: true, objectKey: true } },
        },
      })
    : null;

  if (!audioAsset) return null;

  const audioUrl = await createSignedDownloadUrl(
    audioAsset.storageObject.bucket,
    audioAsset.storageObject.objectKey,
    7200
  );

  let prediction: { id: string };
  switch (job.jobType) {
    case "stem_separation":
      prediction = await createStemSeparationPrediction(audioUrl);
      break;
    case "transcription":
      prediction = await createTranscriptionPrediction(
        audioUrl,
        audioAsset.stemName ?? undefined
      );
      break;
    case "beat_detection":
      prediction = await createBeatDetectionPrediction(audioUrl);
      break;
    default:
      return null;
  }

  // Persist the new prediction ID and bump retry counter
  await prisma.processingJob.update({
    where: { id: job.id },
    data: {
      externalId: prediction.id,
      startedAt: new Date(),
      inputPayload: { ...payload, _coldStartRetries: retryCount + 1 },
    },
  });

  return prediction.id;
}

export const GET = withAuth(async (_req, _ctx, params) => {
  const job = await processingService.getJobStatus(params.jobId);

  // For running jobs with a Replicate prediction, fetch live progress
  let progress: number | null = null;
  let progressLabel: string | null = null;

  if (
    job.status === "running" &&
    job.provider === "replicate" &&
    job.externalId
  ) {
    try {
      const prediction = await replicate.predictions.get(job.externalId);

      if (prediction.status === "failed" || prediction.status === "canceled") {
        // Replicate prediction ended but webhook never arrived — sync the failure
        await processingService.updateJobStatus(job.id, "failed", {
          errorMessage:
            prediction.status === "canceled"
              ? "Processing was cancelled"
              : (prediction.error as string) || "Processing failed on Replicate",
        });
        return response.ok({
          ...job,
          status: "failed",
          errorMessage:
            prediction.status === "canceled"
              ? "Processing was cancelled"
              : (prediction.error as string) || "Processing failed on Replicate",
          progress: null,
          progressLabel: null,
        });
      }

      if (prediction.status === "processing") {
        if (prediction.logs) {
          // Demucs logs contain percentage lines like "  5%|..." or " 50%|..."
          const percentMatches = prediction.logs.match(/(\d+)%\|/g);
          if (percentMatches && percentMatches.length > 0) {
            const last = percentMatches[percentMatches.length - 1];
            const pct = parseInt(last.replace("%|", ""), 10);
            if (!isNaN(pct)) progress = pct;
          }
          // Extract the last meaningful log line as a label
          const lines = prediction.logs.trim().split("\n").filter(Boolean);
          if (lines.length > 0) {
            progressLabel = lines[lines.length - 1].trim().substring(0, 100);
          }
        }
        if (progress === null) {
          progressLabel = progressLabel || "Processing...";
        }
      } else if (prediction.status === "starting") {
        // Check if the prediction has been stuck in "starting" too long
        const createdAt = prediction.created_at
          ? new Date(prediction.created_at).getTime()
          : null;
        const elapsed = createdAt ? Date.now() - createdAt : 0;

        if (createdAt && elapsed > STARTING_TIMEOUT_MS) {
          // Try to automatically retry with a fresh prediction
          try {
            const newPredictionId = await retryColdStart(job);
            if (newPredictionId) {
              const payload = (job.inputPayload ?? {}) as Record<string, unknown>;
              const attempt = (typeof payload._coldStartRetries === "number" ? payload._coldStartRetries : 0) + 1;
              console.log(
                `[processing] Cold-start retry ${attempt}/${MAX_COLD_START_RETRIES} for job ${job.id}`
              );
              return response.ok({
                ...job,
                externalId: newPredictionId,
                status: "running",
                progress: null,
                progressLabel: "Model timed out — retrying automatically...",
              });
            }
          } catch (err) {
            console.error("[processing] Cold-start retry failed:", err);
          }

          // Retries exhausted or retry failed — give up
          try {
            await replicate.predictions.cancel(job.externalId);
          } catch {
            // Best-effort cancel
          }
          await processingService.updateJobStatus(job.id, "failed", {
            errorMessage:
              "Model failed to start after multiple attempts. Please try again later.",
          });
          return response.ok({
            ...job,
            status: "failed",
            errorMessage:
              "Model failed to start after multiple attempts. Please try again later.",
            progress: null,
            progressLabel: null,
          });
        }

        progressLabel = "Model is starting up...";
      }
    } catch {
      // Non-critical — just skip progress info
    }
  }

  return response.ok({ ...job, progress, progressLabel });
});
