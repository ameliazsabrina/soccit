export class SessionConfigError extends Error {
  constructor() {
    super("SESSION_JWT_SECRET is required for session auth");
    this.name = "SessionConfigError";
  }
}

/** Signed session message malformed, stale, or signature invalid. */
export class InvalidSessionRequestError extends Error {
  constructor(message = "Invalid session request") {
    super(message);
    this.name = "InvalidSessionRequestError";
  }
}

/** Bearer token missing, malformed, expired, or wallet mismatch. */
export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}
