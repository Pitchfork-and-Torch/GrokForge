import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  apexUrlForWwwPath,
  requestHostname,
  shouldRedirectWww,
} from "@/lib/site-identity";

/**
 * Next.js 16 Proxy: 308 www.grokforge.app → https://grokforge.app
 * except Auth.js callbacks (X still lists the www redirect URI).
 */
export function proxy(request: NextRequest) {
  const host = requestHostname(
    request.headers.get("x-forwarded-host") || request.headers.get("host")
  );
  const { pathname, search } = request.nextUrl;
  if (shouldRedirectWww(host, pathname)) {
    return NextResponse.redirect(apexUrlForWwwPath(pathname, search), 308);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
