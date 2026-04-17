import { NextResponse } from "next/server";
import { clearClientSessionCookie } from "@/lib/clientSession";

export async function POST() {
  try {
    await clearClientSessionCookie();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("client sessionLogout error", error);

    return NextResponse.json(
      { error: "Logout failed" },
      { status: 500 }
    );
  }
}