import { withAuth } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import * as transportService from "@/lib/services/transport.service";

export const GET = withAuth(async (_req, _ctx, params) => {
  const transport = await transportService.getTransportState(params.sessionId);
  return response.ok(transport);
});
