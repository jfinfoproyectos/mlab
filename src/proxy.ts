import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest, NextResponse } from "next/server";

export type Role = "admin" | "publisher" | "auditor";

/**
 * Centralized route protection rules.
 * Key: Path prefix
 * Value: Array of allowed roles
 */
export const routePermissions: Record<string, Role[]> = {
  "/dashboard": ["admin", "publisher", "auditor"],
};

/**
 * PROXY (formerly Middleware)
 * Runs on every request defined in the matcher.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Handle root redirect for logged-in users
  if (pathname === "/") {
    try {
      const session = await auth.api.getSession({
        headers: request.headers,
      });
      if (session) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    } catch (error) {
      console.error("Middleware getSession error:", error);
    }
  }

  // 2. Handle protection
  const matchedPath = Object.keys(routePermissions).find((path) =>
    pathname.startsWith(path)
  );

  if (matchedPath) {
    try {
      const session = await auth.api.getSession({
        headers: request.headers,
      });

      if (!session) {
        return NextResponse.redirect(new URL("/sign-in", request.url));
      }
    } catch (error) {
      console.error("Middleware getSession error:", error);
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }
  }

  return NextResponse.next();
}

/**
 * UTILITIES for Pages and Actions
 */

export async function getSession() {
  try {
    return await auth.api.getSession({
      headers: await headers(),
    });
  } catch (error) {
    console.error("Failed to get session in getSession utility:", error);
    return null;
  }
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    redirect("/sign-in");
  }
  return session;
}

export async function protectRoute(allowedRoles: Role[]) {
  const session = await getSession();

  if (!session) {
    redirect("/sign-in");
  }

  const userRole = session.user.role as Role;

  if (!allowedRoles.includes(userRole)) {
    redirect("/");
  }

  return session;
}

export async function isAdmin() {
  const session = await getSession();
  return session?.user.role === "admin";
}

export async function isPublisher() {
  const session = await getSession();
  return session?.user.role === "publisher";
}

export async function isAuditor() {
  const session = await getSession();
  return session?.user.role === "auditor";
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*", 
  ],
};
