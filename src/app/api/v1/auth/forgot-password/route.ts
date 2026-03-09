import { NextRequest } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import * as response from "@/lib/api/response";
import { sendPasswordResetEmail } from "@/lib/email";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return response.validationError("Invalid email");
    }

    const { email } = parsed.data;

    // Always return success to prevent email enumeration
    const user = await prisma.user.findUnique({ where: { email } });

    if (user?.passwordHash) {
      // Delete any existing reset tokens for this user
      await prisma.verificationToken.deleteMany({
        where: { identifier: email },
      });

      const token = randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.verificationToken.create({
        data: { identifier: email, token, expires },
      });

      await sendPasswordResetEmail(email, token);
    }

    return response.ok({ sent: true });
  } catch (err: unknown) {
    console.error("Forgot password error:", err);
    return response.error("internal_error", "Something went wrong", 500);
  }
}
