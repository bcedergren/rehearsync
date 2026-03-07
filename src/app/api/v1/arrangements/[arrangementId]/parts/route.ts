import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import { createPartSchema } from "@/lib/validators/part";
import * as partService from "@/lib/services/part.service";

export const GET = withAuth(async (_req, _ctx, params) => {
  const parts = await partService.listParts(params.arrangementId);
  return response.ok(parts);
});

export const POST = withAuth(async (req: NextRequest, _ctx, params) => {
  const body = await req.json();
  const parsed = createPartSchema.safeParse(body);
  if (!parsed.success) {
    return response.validationError("Invalid input", {
      issues: parsed.error.issues,
    });
  }

  const part = await partService.createPart(params.arrangementId, parsed.data);
  return response.created(part);
});
