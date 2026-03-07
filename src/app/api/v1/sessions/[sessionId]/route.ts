import { withAuth } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import * as sessionService from "@/lib/services/session.service";

export const GET = withAuth(async (_req, _ctx, params) => {
  const session = await sessionService.getSession(params.sessionId);
  return response.ok(session);
});
