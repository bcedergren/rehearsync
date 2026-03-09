import { withAuth } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import { prisma } from "@/lib/prisma";

export const GET = withAuth(async (_req, _ctx, params) => {
  const jobs = await prisma.processingJob.findMany({
    where: {
      arrangementId: params.arrangementId,
      status: { in: ["pending", "running"] },
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
