import { NextResponse } from "next/server";
import { verifyClientSessionCookie } from "@/lib/clientSession";

export async function GET() {
  try {
    const uid = await verifyClientSessionCookie(true);

    if (!uid) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      uid,
    });
  } catch (error) {
    console.error("client me error", error);

    return NextResponse.json(
      { authenticated: false, error: "server error" },
      { status: 500 }
    );
  }
}