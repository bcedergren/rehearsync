import { withAuth } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import * as processingService from "@/lib/services/processing.service";
import { replicate } from "@/lib/replicate";

/** Max time a prediction can stay in "starting" before we auto-cancel (ms) */
const STARTING_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

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
          // Cancel the stuck prediction and fail the job
          try {
            await replicate.predictions.cancel(job.externalId);
          } catch {
            // Best-effort cancel
          }
          await processingService.updateJobStatus(job.id, "failed", {
            errorMessage:
              "Model failed to start within 10 minutes. Please try again.",
          });
          return response.ok({
            ...job,
            status: "failed",
            errorMessage:
              "Model failed to start within 10 minutes. Please try again.",
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
