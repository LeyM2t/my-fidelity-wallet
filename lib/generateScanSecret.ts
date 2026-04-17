// lib/generateScanSecret.ts

import crypto from "crypto";

export function generateScanSecret(length = 32): string {
  return crypto.randomBytes(length).toString("hex");
}