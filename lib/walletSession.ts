// lib/walletSession.ts
import { cookies } from "next/headers";
import crypto from "crypto";
import type { NextResponse } from "next/server";

const COOKIE_NAME = "walletId";

export type WalletSession = {
  walletId: string;
  isNew: boolean;
};

// Lecture seule (ne crée rien) -> utile pour endpoints sensibles (delete/consume)
export async function getWalletIdFromRequest(): Promise<string | null> {
  const cookieStore = await Promise.resolve(cookies());
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}

export async function getOrCreateWalletId(): Promise<WalletSession> {
  // Compat sync/async (selon Next / Turbopack)
  const cookieStore = await Promise.resolve(cookies());

  const existing = cookieStore.get(COOKIE_NAME)?.value;
  if (existing) {
    return { walletId: existing, isNew: false };
  }

  const walletId = crypto.randomUUID();
  return { walletId, isNew: true };
}

export function attachWalletIdCookie(res: NextResponse, walletId: string) {
  res.cookies.set(COOKIE_NAME, walletId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 an
  });
}