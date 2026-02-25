import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { extractSubdomain } from "@/lib/subdomain";

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost:3000";

const isPublicRoute = createRouteMatcher([
  "/landing(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/logout-success(.*)",
  "/unauthorized(.*)",
  "/api/keepalive(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  const host = request.headers.get("host") ?? "";
  const subdomain = extractSubdomain(host, ROOT_DOMAIN);

  // No subdomain (root domain) — allow public routes, let Clerk handle auth for the rest
  if (!subdomain) {
    if (!isPublicRoute(request)) {
      await auth.protect();
    }
    return;
  }

  // On a subdomain — allow public routes through (sign-in page must be accessible)
  if (isPublicRoute(request)) {
    return;
  }

  // Protected route on a subdomain — require auth and validate org_url
  const session = await auth.protect();
  const orgUrl = session.sessionClaims?.org_url;

  if (!orgUrl || orgUrl !== subdomain) {
    const unauthorizedUrl = new URL("/unauthorized", request.url);
    return NextResponse.redirect(unauthorizedUrl);
  }
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
