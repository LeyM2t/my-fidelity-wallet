import "@/lib/firebaseAdmin";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuth } from "firebase-admin/auth";
import { db } from "@/lib/firebaseAdmin";

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
      role: expectedRole,
      createdAt: now,
      updatedAt: now,
    });
    return;
  }

  const data = userSnap.data() as
    | {
        role?: AppUserRole;
      }
    | undefined;

  if (data?.role !== expectedRole) {
    throw new HttpError("ROLE_MISMATCH", 403);
  }

  await userRef.update({
    email,
    updatedAt: now,
  });
}

async function ensureMerchantProfile(uid: string, email: string | null) {
  const now = new Date();
  const ref = db.collection("merchants").doc(uid);
  const snap = await ref.get();

  if (!snap.exists) {
    await ref.set({
      uid,
      email,
      createdAt: now,
      updatedAt: now,
    });
    return;
  }

  await ref.update({
    email,
    updatedAt: now,
  });
}

export async function POST(req: Request) {
  try {
    const { idToken } = (await req.json()) as Body;

    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
    }

    const auth = getAuth();
    const decoded = await auth.verifyIdToken(idToken);
    const uid = decoded.uid;
    const email = decoded.email ?? null;

    await ensureUserRole(uid, email, "merchant");
    await ensureMerchantProfile(uid, email);

    const expiresDays = Number(
      process.env.FIREBASE_SESSION_EXPIRES_DAYS || "5"
    );
    const expiresIn = expiresDays * 24 * 60 * 60 * 1000;

    const sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn,
    });

    const cookieStore = await cookies();
    cookieStore.set("merchantSession", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(expiresIn / 1000),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("merchant sessionLogin error", error);

    if (error instanceof HttpError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    return NextResponse.json({ error: "Auth failed" }, { status: 401 });
  }
}