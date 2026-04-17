import "@/lib/firebaseAdmin";
import { cookies } from "next/headers";
import { getAuth } from "firebase-admin/auth";

export const CLIENT_SESSION_COOKIE = "clientSession";

const EXPIRES_IN_MS = 5 * 24 * 60 * 60 * 1000;

function isProd() {
  return process.env.NODE_ENV === "production";
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
    return decoded.uid;
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