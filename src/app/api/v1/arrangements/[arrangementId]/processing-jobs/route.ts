import { withAuth } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import { prisma } from "@/lib/prisma";

export const GET = withAuth(async (req, _ctx, params) => {
  const includeFailed = req.nextUrl.searchParams.get("includeFailed") === "true";

  const jobs = await prisma.processingJob.findMany({
    where: {
      arrangementId: params.arrangementId,
      status: { in: includeFailed ? ["pending", "running", "failed"] : ["pending", "running"] },
    },
    select: {
      id: true,
      jobType: true,
      status: true,
      errorMessage: true,
      startedAt: true,
      completedAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return response.ok(jobs);
});
