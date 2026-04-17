import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuth } from "firebase-admin/auth";
import { db } from "@/lib/firebaseAdmin";

type Body = { idToken?: string };

export async function POST(req: Request) {
  try {
    const { idToken } = (await req.json()) as Body;
    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
    }

    const decoded = await getAuth().verifyIdToken(idToken);
    const uid = decoded.uid;

    const expiresDays = Number(process.env.FIREBASE_SESSION_EXPIRES_DAYS || "5");
    const expiresIn = expiresDays * 24 * 60 * 60 * 1000;

    const sessionCookie = await getAuth().createSessionCookie(idToken, { expiresIn });

    const cookieStore = await cookies();
    cookieStore.set("merchantSession", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // ✅ local http OK
      sameSite: "lax",
      path: "/",
      maxAge: Math.floor(expiresIn / 1000),
    });

    // Crée le profil merchant si absent (minimal)
    const ref = db.collection("merchants").doc(uid);
    const snap = await ref.get();

    if (!snap.exists) {
      await ref.set({
        uid,
        email: decoded.email || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } else {
      await ref.update({ updatedAt: new Date() });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Auth failed" }, { status: 401 });
  }
}