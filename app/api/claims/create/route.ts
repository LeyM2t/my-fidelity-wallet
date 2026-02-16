import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { db } from "@/lib/firebaseAdmin";

type Body = {
  storeId: string;
};

function makeToken() {
  return randomBytes(16).toString("hex"); // 32 chars
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const storeId = (body?.storeId || "").trim();

    if (!storeId) {
      return NextResponse.json({ error: "Missing storeId" }, { status: 400 });
    }

    const token = makeToken();
    const now = new Date();

    await db.collection("claims").doc(token).set({
      token,
      storeId,
      createdAt: now,
    });

    return NextResponse.json({ token });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
