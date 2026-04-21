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