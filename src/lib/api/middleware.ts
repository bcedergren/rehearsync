import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as response from "./response";

export interface AuthContext {
  userId: string;
  email: string;
}

export interface BandContext extends AuthContext {
  memberId: string;
  bandId: string;
  role: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouteParams = Record<string, any>;

type AuthHandler = (
  req: NextRequest,
  ctx: AuthContext,
  params: RouteParams
) => Promise<NextResponse>;

type BandHandler = (
  req: NextRequest,
  ctx: BandContext,
  params: RouteParams
) => Promise<NextResponse>;

export function withAuth(handler: AuthHandler) {
  return async (
    req: NextRequest,
    { params }: { params: Promise<RouteParams> }
  ) => {
    try {
      const session = await auth();
      if (!session?.user?.id || !session?.user?.email) {
        return response.unauthorized();
      }

      const resolvedParams = await params;
      return await handler(
        req,
        { userId: session.user.id, email: session.user.email },
        resolvedParams
      );
    } catch (err) {
      return handleError(err);
    }
  };
}

export function withBandRole(
  ...requiredRoles: string[]
) {
  return (handler: BandHandler) => {
    return withAuth(async (req, authCtx, params) => {
      const bandId = params.bandId;
      if (!bandId) {
        return response.error("validation_error", "bandId is required", 400);
      }

      const member = await prisma.member.findFirst({
        where: {
          bandId,
          userId: authCtx.userId,
          isActive: true,
        },
      });

      if (!member) {
        return response.forbidden("You are not a member of this band");
      }

      if (
        requiredRoles.length > 0 &&
        !requiredRoles.includes(member.role)
      ) {
        return response.forbidden(
          `This action requires one of: ${requiredRoles.join(", ")}`
        );
      }

      return await handler(req, {
        ...authCtx,
        memberId: member.id,
        bandId: member.bandId,
        role: member.role,
      }, params);
    });
  };
}

function handleError(err: unknown): NextResponse {
  if (err instanceof Error && "code" in err && "statusCode" in err) {
    const appErr = err as Error & {
      code: string;
      statusCode: number;
      details?: Record<string, unknown>;
    };
    return response.error(
      appErr.code,
      appErr.message,
      appErr.statusCode,
      appErr.details
    );
  }
  console.error("Unhandled error:", err);
  return response.error("internal_error", "An unexpected error occurred", 500);
}
