import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();

  cookieStore.set("merchantSession", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // ✅ local http OK
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return NextResponse.json({ ok: true });
}