import type { Response } from "express";
import { ZodError } from "zod";

export function sendError(res: Response, error: unknown) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: "Validation failed",
      details: error.flatten()
    });
  }

  if (error instanceof AppError) {
    return res.status(error.status).json({ error: error.message });
  }

  if (isDatabaseUniqueError(error)) {
    return res.status(409).json({ error: "A record with this value already exists" });
  }

  console.error(error);
  return res.status(500).json({ error: "Internal server error" });
}

export class AppError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

function isDatabaseUniqueError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}
