import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const JWT_SECRET = process.env.AUTH_SECRET || "fallback-secret-minimum-32-characters-very-secure!";
const secretKey = new TextEncoder().encode(JWT_SECRET);
export const ADMIN_COOKIE_NAME = "admin_auth_token";
const TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface AdminSessionPayload {
  adminId: string;
  email: string;
  name?: string | null;
}

/**
 * Creates and signs a secure JWT for an admin user.
 */
export async function signAdminToken(payload: AdminSessionPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey);
}

/**
 * Verifies a JWT token string.
 */
export async function verifyAdminToken(token: string): Promise<AdminSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    if (!payload.adminId || !payload.email) {
      return null;
    }
    return {
      adminId: payload.adminId as string,
      email: payload.email as string,
      name: (payload.name as string) || null,
    };
  } catch {
    return null;
  }
}

/**
 * Gets the current logged-in admin session from incoming cookies (Server Components / Route Handlers).
 */
export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifyAdminToken(token);
  } catch {
    return null;
  }
}

/**
 * Verifies admin session from a NextRequest (usable in middleware).
 */
export async function verifyRequestAdmin(request: NextRequest): Promise<AdminSessionPayload | null> {
  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return null;
  return await verifyAdminToken(token);
}

/**
 * Sets the admin session HTTP-only cookie.
 */
export function setAdminAuthCookie(token: string) {
  const cookieStore = cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TOKEN_MAX_AGE_SECONDS,
  });
}

/**
 * Clears the admin session cookie on logout.
 */
export function clearAdminAuthCookie() {
  const cookieStore = cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
}
