import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import * as response from "@/lib/api/response";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return response.validationError("Invalid input", {
        issues: parsed.error.issues,
      });
    }

    const { token, password } = parsed.data;

    const record = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!record) {
      return response.error("invalid_token", "Invalid or expired reset link", 400);
    }

    if (record.expires < new Date()) {
      await prisma.verificationToken.delete({ where: { token } });
      return response.error("expired_token", "This reset link has expired", 400);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { email: record.identifier },
      data: { passwordHash },
    });

    // Clean up the used token
    await prisma.verificationToken.delete({ where: { token } });

    return response.ok({ reset: true });
  } catch (err: unknown) {
    console.error("Reset password error:", err);
    return response.error("internal_error", "Something went wrong", 500);
  }
}
