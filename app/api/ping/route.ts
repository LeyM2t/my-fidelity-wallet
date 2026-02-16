import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";

export async function GET() {
  await db.collection("_ping").doc("ok").set({ ts: Date.now() }, { merge: true });
  return NextResponse.json({ ok: true });
}
