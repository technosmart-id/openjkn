import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Proxy to protect authenticated routes
 * Redirects unauthenticated users to login page
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = ["/login", "/signup"];
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // API routes that should always be accessible
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/api/sync") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/api/ai")
  ) {
    return NextResponse.next();
  }

  // Static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check for session cookie (Better Auth uses "__Secure-better-auth.session_token" in production)
  const sessionToken =
    request.cookies.get("__Secure-better-auth.session_token") ||
    request.cookies.get("better-auth.session_token");

  // Check if this is an API route
  const isApiRoute = pathname.startsWith("/api");

  // Debug logging
  console.log(
    "[Proxy] Path:",
    pathname,
    "Has session:",
    !!sessionToken,
    "Is public:",
    isPublicRoute,
    "Is API:",
    isApiRoute
  );

  // If user is not authenticated and trying to access protected route
  if (!(sessionToken || isPublicRoute)) {
    // For API routes, return 401 Unauthorized instead of redirecting
    if (isApiRoute) {
      console.log("[Proxy] API route blocked - returning 401");
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication required" },
        { status: 401 }
      );
    }
    console.log("[Proxy] Redirecting to login");
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // If user is authenticated and trying to access public route (login/signup)
  if (sessionToken && isPublicRoute) {
    console.log("[Proxy] Redirecting to dashboard");
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

/**
 * Matcher configuration for proxy
 * Exclude auth routes, static files, and API routes
 */
export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (Next.js static files)
     * - _next/image (Next.js image optimization)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
