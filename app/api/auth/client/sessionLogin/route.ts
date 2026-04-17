import "@/lib/firebaseAdmin";
import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import {
  createClientSessionCookie,
  setClientSessionCookie,
} from "@/lib/clientSession";

type Body = {
  idToken?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const idToken = body?.idToken?.trim();

    if (!idToken) {
      return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
    }

    const auth = getAuth();
    await auth.verifyIdToken(idToken);

    const sessionCookie = await createClientSessionCookie(idToken);
    await setClientSessionCookie(sessionCookie);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("client sessionLogin error", error);

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}