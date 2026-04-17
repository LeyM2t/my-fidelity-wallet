import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { requireClientUid } from "@/lib/clientSession";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const cardId = typeof body?.cardId === "string" ? body.cardId.trim() : "";

    if (!cardId) {
      return NextResponse.json({ error: "cardId missing" }, { status: 400 });
    }

    const clientUid = await requireClientUid();

    const ref = db.collection("cards").doc(cardId);
    const snap = await ref.get();

    if (!snap.exists) {
      return NextResponse.json({ error: "card not found" }, { status: 404 });
    }

    const data = snap.data() as any;

    if ((data?.ownerId ?? "") !== clientUid) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    await ref.delete();

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const message = String(e?.message ?? e ?? "server error");

    if (message === "UNAUTHORIZED_CLIENT") {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}