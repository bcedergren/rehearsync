import { withAuth } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import * as processingService from "@/lib/services/processing.service";

export const GET = withAuth(async (_req, _ctx, params) => {
  const job = await processingService.getJobStatus(params.jobId);
  return response.ok(job);
});
