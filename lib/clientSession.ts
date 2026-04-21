import "@/lib/firebaseAdmin";
import { cookies } from "next/headers";
import { getAuth } from "firebase-admin/auth";
import { db } from "@/lib/firebaseAdmin";

export const CLIENT_SESSION_COOKIE = "clientSession";

const EXPIRES_IN_MS = 5 * 24 * 60 * 60 * 1000;

type AppUserRole = "client" | "merchant";

function isProd() {
  return process.env.NODE_ENV === "production";
}

async function getUserRole(uid: string): Promise<AppUserRole | null> {
  const snap = await db.collection("users").doc(uid).get();

  if (!snap.exists) return null;

  const data = snap.data() as { role?: AppUserRole } | undefined;
  const role = data?.role;

  if (role !== "client" && role !== "merchant") {
    return null;
  }

  return role;
}

export async function createClientSessionCookie(idToken: string) {
  const auth = getAuth();
  return auth.createSessionCookie(idToken, { expiresIn: EXPIRES_IN_MS });
}

export async function setClientSessionCookie(sessionCookie: string) {
  const cookieStore = await cookies();

  cookieStore.set(CLIENT_SESSION_COOKIE, sessionCookie, {
    httpOnly: true,
    secure: isProd(),
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(EXPIRES_IN_MS / 1000),
  });
}

export async function clearClientSessionCookie() {
  const cookieStore = await cookies();

  cookieStore.set(CLIENT_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: isProd(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export async function getClientSessionCookie() {
  const cookieStore = await cookies();
  return cookieStore.get(CLIENT_SESSION_COOKIE)?.value ?? null;
}

export async function verifyClientSessionCookie(
  checkRevoked = true
): Promise<string | null> {
  const sessionCookie = await getClientSessionCookie();
  if (!sessionCookie) return null;

  try {
    const auth = getAuth();
    const decoded = await auth.verifySessionCookie(sessionCookie, checkRevoked);
    const uid = decoded.uid;

    const role = await getUserRole(uid);
    if (role !== "client") {
      return null;
    }

    return uid;
  } catch {
    return null;
  }
}

export async function requireClientUid(): Promise<string> {
  const uid = await verifyClientSessionCookie(true);

  if (!uid) {
    throw new Error("UNAUTHORIZED_CLIENT");
  }

  return uid;
}