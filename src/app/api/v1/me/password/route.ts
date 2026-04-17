import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiResponse, apiError } from "@/lib/api/response";
import { BadRequestError, UnauthorizedError } from "@/lib/api/errors";
import bcrypt from "bcryptjs";

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new UnauthorizedError();
    }

    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      throw new BadRequestError("Current password and new password are required");
    }

    if (newPassword.length < 8) {
      throw new BadRequestError("New password must be at least 8 characters");
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true },
    });

    if (!user?.passwordHash) {
      throw new BadRequestError("Cannot change password for OAuth accounts");
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new BadRequestError("Current password is incorrect");
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: session.user.id },
      data: { passwordHash: newPasswordHash },
    });

    return apiResponse({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
