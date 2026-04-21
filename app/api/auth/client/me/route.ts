// app/api/auth/client/me/route.ts

import "@/lib/firebaseAdmin";
import { NextResponse } from "next/server";
import { verifyClientSessionCookie } from "@/lib/clientSession";
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

  if (!snap.exists) return ["client"];

  const data = snap.data() as
    | {
        roles?: unknown;
        role?: AppUserRole;
      }
    | undefined;

  const rolesFromArray = normalizeRoles(data?.roles);
  const legacyRole =
    data?.role === "client" || data?.role === "merchant" ? data.role : null;

  const roles = Array.from(
    new Set<AppUserRole>([
      ...rolesFromArray,
      ...(legacyRole ? [legacyRole] : []),
    ])
  );

  return roles.length > 0 ? roles : ["client"];
}

export async function GET() {
  try {
    const uid = await verifyClientSessionCookie(true);

    if (!uid) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const roles = await getUserRoles(uid);

    return NextResponse.json({
      authenticated: true,
      uid,
      roles,
    });
  } catch (error) {
    console.error("client me error", error);

    return NextResponse.json(
      { authenticated: false, error: "server error" },
      { status: 500 }
    );
  }
}