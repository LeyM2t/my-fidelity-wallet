// lib/merchantAuth.ts

import "@/lib/firebaseAdmin";
import { cookies } from "next/headers";
import { getAuth } from "firebase-admin/auth";
import { db } from "@/lib/firebaseAdmin";

type AppUserRole = "client" | "merchant";

function normalizeRoles(value: unknown): AppUserRole[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (role): role is AppUserRole => role === "client" || role === "merchant"
  );
}

async function getUserRoles(uid: string): Promise<AppUserRole[]> {
  const snap = await db.collection("users").doc(uid).get();

  if (!snap.exists) return [];

  const data = snap.data() as
    | {
        roles?: unknown;
        role?: AppUserRole;
      }
    | undefined;

  const rolesFromArray = normalizeRoles(data?.roles);
  const legacyRole =
    data?.role === "client" || data?.role === "merchant" ? data.role : null;

  return Array.from(
    new Set<AppUserRole>([
      ...rolesFromArray,
      ...(legacyRole ? [legacyRole] : []),
    ])
  );
}

export async function requireMerchantUid(): Promise<string | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get("merchantSession")?.value;

  if (!session) return null;

  try {
    const decoded = await getAuth().verifySessionCookie(session, true);
    const uid = decoded.uid;

    const roles = await getUserRoles(uid);
    if (!roles.includes("merchant")) {
      return null;
    }

    return uid;
  } catch {
    return null;
  }
}