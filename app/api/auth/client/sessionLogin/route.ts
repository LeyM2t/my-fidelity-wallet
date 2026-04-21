// app/api/auth/client/sessionLogin/route.ts

import "@/lib/firebaseAdmin";
import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { db } from "@/lib/firebaseAdmin";
import {
  createClientSessionCookie,
  setClientSessionCookie,
} from "@/lib/clientSession";

type Body = {
  idToken?: string;
};

type AppUserRole = "client" | "merchant";

class HttpError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function normalizeRoles(value: unknown): AppUserRole[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (role): role is AppUserRole => role === "client" || role === "merchant"
  );
}

async function ensureUserRole(
  uid: string,
  email: string | null,
  expectedRole: AppUserRole
) {
  const now = new Date();
  const userRef = db.collection("users").doc(uid);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    await userRef.set({
      uid,
      email,
      roles: [expectedRole],
      createdAt: now,
      updatedAt: now,
    });
    return;
  }

  const data = userSnap.data() as
    | {
        roles?: unknown;
        role?: AppUserRole;
      }
    | undefined;

  const rolesFromArray = normalizeRoles(data?.roles);
  const legacyRole =
    data?.role === "client" || data?.role === "merchant" ? data.role : null;

  const nextRoles = Array.from(
    new Set<AppUserRole>([
      ...rolesFromArray,
      ...(legacyRole ? [legacyRole] : []),
      expectedRole,
    ])
  );

  await userRef.set(
    {
      uid,
      email,
      roles: nextRoles,
      updatedAt: now,
    },
    { merge: true }
  );
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const idToken = body?.idToken?.trim();

    if (!idToken) {
      return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
    }

    const auth = getAuth();
    const decoded = await auth.verifyIdToken(idToken);
    const uid = decoded.uid;
    const email = decoded.email ?? null;

    await ensureUserRole(uid, email, "client");

    const sessionCookie = await createClientSessionCookie(idToken);
    await setClientSessionCookie(sessionCookie);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("client sessionLogin error", error);

    if (error instanceof HttpError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}