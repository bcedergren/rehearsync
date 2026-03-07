import { withAuth } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import * as sessionService from "@/lib/services/session.service";

export const POST = withAuth(async (_req, _ctx, params) => {
  const session = await sessionService.endSession(params.sessionId);
  return response.ok(session);
});
