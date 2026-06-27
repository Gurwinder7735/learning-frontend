import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedPaths = ["/clients", "/documents", "/meetings", "/legal", "/finance", "/knowledge", "/users", "/brd"];
const publicSharePaths = ["/proposals/share", "/brd/share"];
const authPaths = ["/login", "/register"];

export function middleware(request: NextRequest) {
  const token = request.cookies.get("access_token")?.value;
  const { pathname } = request.nextUrl;

  const isProtected = protectedPaths.some((path) => pathname.startsWith(path));
  const isPublicShare = publicSharePaths.some((path) => pathname.startsWith(path));
  const isAuth = authPaths.some((path) => pathname.startsWith(path));

  if (isPublicShare) {
    return NextResponse.next();
  }

  if (isProtected && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuth && token) {
    return NextResponse.redirect(new URL("/clients", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)"],
};
