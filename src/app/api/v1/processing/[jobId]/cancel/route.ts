import { withAuth } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import * as processingService from "@/lib/services/processing.service";

export const POST = withAuth(async (_req, _ctx, params) => {
  const job = await processingService.getJobStatus(params.jobId);

  if (!["pending", "running"].includes(job.status)) {
    return response.validationError("Job is not in a cancellable state");
  }

  await processingService.updateJobStatus(job.id, "failed", {
    errorMessage: "Cancelled by user",
  });

  return response.ok({ jobId: job.id, status: "failed" });
});
