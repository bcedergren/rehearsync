import { prisma } from "@/lib/prisma";
import { apiResponse, apiError } from "@/lib/api/response";
import { BadRequestError } from "@/lib/api/errors";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token } = body;

    if (!token) {
      throw new BadRequestError("Verification token is required");
    }

    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      throw new BadRequestError("Invalid or expired verification token");
    }

    if (verificationToken.expires < new Date()) {
      await prisma.verificationToken.delete({ where: { token } });
      throw new BadRequestError("Verification token has expired");
    }

    const user = await prisma.user.findUnique({
      where: { email: verificationToken.identifier },
    });

    if (!user) {
      throw new BadRequestError("User not found");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });

    await prisma.verificationToken.delete({ where: { token } });

    return apiResponse({ success: true, message: "Email verified successfully" });
  } catch (error) {
    return apiError(error);
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const email = url.searchParams.get("email");

    if (!email) {
      throw new BadRequestError("Email is required");
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { emailVerified: true },
    });

    if (!user) {
      throw new BadRequestError("User not found");
    }

    if (user.emailVerified) {
      throw new BadRequestError("Email already verified");
    }

    const token = crypto.randomUUID();
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.verificationToken.deleteMany({
      where: { identifier: email },
    });

    await prisma.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
      },
    });

    await sendVerificationEmail(email, token);

    return apiResponse({ success: true, message: "Verification email sent" });
  } catch (error) {
    return apiError(error);
  }
}
