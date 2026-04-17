import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ✅ Exclure la page de login sinon boucle
  if (pathname.startsWith("/merchant/login")) return NextResponse.next();

  // (optionnel) laisser passer les routes auth
  if (pathname.startsWith("/api/auth/")) return NextResponse.next();

  const isProtected =
    pathname === "/scan" ||
    pathname.startsWith("/scan/") ||
    pathname === "/merchant" ||
    pathname.startsWith("/merchant/");

  if (!isProtected) return NextResponse.next();

  const session = req.cookies.get("merchantSession")?.value;
  if (session) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/merchant/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/scan/:path*", "/merchant/:path*"],
};