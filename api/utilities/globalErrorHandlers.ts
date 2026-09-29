import type { ValidationDetail } from "../middlewares/validate.middleware.js";

// errors.ts
export class AppError extends Error {

  public success : boolean = false;

  constructor(message: string, public statusCode = 500) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class AuthError extends AppError {
  constructor(message: string, statusCode: number) {
    super(message, statusCode)
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found") { super(message, 404); }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict") { super(message, 409); }
}

/** Thrown to your ONE central error handler, which turns it into a 400 (see README snippet). */
export class ValidationError extends Error {
  readonly statusCode = 400;
  constructor(public readonly errors: ValidationDetail[]) {
    super("Validation failed");
    this.name = "ValidationError";
  }
}
