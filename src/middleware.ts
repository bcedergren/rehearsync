export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: [
    "/((?!api/v1/health|api/v1/auth|_next/static|_next/image|favicon.ico|login|register).*)",
  ],
};
