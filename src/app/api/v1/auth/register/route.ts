import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import * as response from "@/lib/api/response";

const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return response.validationError("Invalid input", {
        issues: parsed.error.issues,
      });
    }

    const { name, email, password } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return response.conflict("A user with this email already exists");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { name, email, passwordHash },
      select: { id: true, name: true, email: true },
    });

    return response.created(user);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Registration error:", message);
    return response.error("internal_error", "Registration failed", 500);
  }
}
