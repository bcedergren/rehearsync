import { NextRequest } from "next/server";
import { withBandRole } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import * as bandService from "@/lib/services/band.service";

export const PATCH = withBandRole("leader", "admin")(async (req: NextRequest, _ctx, params) => {
  const memberId = params.memberId as string;

  const body = await req.json();
  const { displayName, role, defaultInstrument } = body;

  if (!displayName && !role && defaultInstrument === undefined) {
    return response.validationError("No fields to update");
  }

  const member = await bandService.updateMember(memberId, {
    ...(displayName ? { displayName } : {}),
    ...(role ? { role } : {}),
    ...(defaultInstrument !== undefined ? { defaultInstrument: defaultInstrument || null } : {}),
  });

  return response.ok(member);
});
