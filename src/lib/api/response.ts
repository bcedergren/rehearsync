import { NextResponse } from "next/server";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function created<T>(data: T) {
  return ok(data, 201);
}

export function error(
  code: string,
  message: string,
  status = 400,
  details?: Record<string, unknown>
) {
  return NextResponse.json(
    { error: { code, message, details } },
    { status }
  );
}

export function notFound(message = "Resource not found") {
  return error("not_found", message, 404);
}

export function forbidden(message = "Forbidden") {
  return error("forbidden", message, 403);
}

export function unauthorized(message = "Unauthorized") {
  return error("unauthorized", message, 401);
}

export function validationError(
  message: string,
  details?: Record<string, unknown>
) {
  return error("validation_error", message, 400, details);
}

export function conflict(message: string) {
  return error("asset_conflict", message, 409);
}
