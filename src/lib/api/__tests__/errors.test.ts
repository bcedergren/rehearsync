import {
  AppError,
  NotFoundError,
  ForbiddenError,
  UnauthorizedError,
  ValidationError,
  InvalidStateError,
} from "../errors";

describe("AppError", () => {
  it("creates error with code, message, and statusCode", () => {
    const err = new AppError("test", "Test message", 418);
    expect(err.code).toBe("test");
    expect(err.message).toBe("Test message");
    expect(err.statusCode).toBe(418);
    expect(err.name).toBe("AppError");
    expect(err).toBeInstanceOf(Error);
  });

  it("defaults statusCode to 400", () => {
    const err = new AppError("test", "msg");
    expect(err.statusCode).toBe(400);
  });

  it("supports optional details", () => {
    const err = new AppError("test", "msg", 400, { field: "value" });
    expect(err.details).toEqual({ field: "value" });
  });
});

describe("NotFoundError", () => {
  it("creates 404 error with resource name", () => {
    const err = new NotFoundError("Band", "123");
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe("not_found");
    expect(err.message).toContain("Band");
    expect(err.message).toContain("123");
  });

  it("works without id", () => {
    const err = new NotFoundError("Band");
    expect(err.message).toBe("Band not found");
  });
});

describe("ForbiddenError", () => {
  it("creates 403 error with default message", () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe("forbidden");
  });

  it("accepts custom message", () => {
    const err = new ForbiddenError("No access");
    expect(err.message).toBe("No access");
  });
});

describe("UnauthorizedError", () => {
  it("creates 401 error", () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe("unauthorized");
  });
});

describe("ValidationError", () => {
  it("creates 400 error with details", () => {
    const err = new ValidationError("Bad input", { field: "name" });
    expect(err.statusCode).toBe(400);
    expect(err.details).toEqual({ field: "name" });
  });
});

describe("InvalidStateError", () => {
  it("creates 409 error", () => {
    const err = new InvalidStateError("Already published");
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe("invalid_state");
  });
});
