import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { ADMIN_COOKIE_NAME } from "./lib/auth";

const JWT_SECRET = process.env.AUTH_SECRET || "fallback-secret-minimum-32-characters-very-secure!";
const secretKey = new TextEncoder().encode(JWT_SECRET);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isLoginPage = pathname === "/admin/login";
  const isAdminApi = pathname.startsWith("/api/admin");
  const isAuthLoginApi = pathname === "/api/admin/auth/login";
  const isAdminPage = pathname.startsWith("/admin");

  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  let isAuthenticated = false;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, secretKey);
      if (payload && payload.adminId) {
        isAuthenticated = true;
      }
    } catch {
      isAuthenticated = false;
    }
  }

  // Handle API admin protection
  if (isAdminApi && !isAuthLoginApi) {
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: "Unauthorized: Administrator access required." },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // Handle Admin pages protection
  if (isAdminPage) {
    if (isLoginPage) {
      if (isAuthenticated) {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
      return NextResponse.next();
    }

    if (!isAuthenticated) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
