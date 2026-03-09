import { withAuth } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import * as processingService from "@/lib/services/processing.service";
import { replicate } from "@/lib/replicate";

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

      if (prediction.status === "processing" && prediction.logs) {
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
      } else if (prediction.status === "starting") {
        progress = 0;
        progressLabel = "Model is starting up...";
      }
    } catch {
      // Non-critical — just skip progress info
    }
  }

  return response.ok({ ...job, progress, progressLabel });
});
