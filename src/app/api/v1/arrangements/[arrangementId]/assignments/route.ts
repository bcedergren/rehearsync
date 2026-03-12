import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import { assignmentSchema } from "@/lib/validators/session";
import * as assignmentService from "@/lib/services/assignment.service";
import { checkFreeTierLock } from "@/lib/subscriptions/guards";

export const GET = withAuth(async (_req, _ctx, params) => {
  const assignments = await assignmentService.listAssignments(params.arrangementId);
  return response.ok(assignments);
});

export const POST = withAuth(async (req: NextRequest, ctx, params) => {
  await checkFreeTierLock(ctx.userId, { arrangementId: params.arrangementId });
  const body = await req.json();
  const parsed = assignmentSchema.safeParse(body);
  if (!parsed.success) {
    return response.validationError("Invalid input", {
      issues: parsed.error.issues,
    });
  }

  const assignment = await assignmentService.createOrUpdateAssignment(
    params.arrangementId,
    parsed.data
  );
  return response.ok(assignment);
});
