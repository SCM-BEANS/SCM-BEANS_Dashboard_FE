import { NextRequest, NextResponse } from "next/server";

/** Decode JWT payload (no signature verification — just for routing).
 *  Verification happens on the API server side. */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    // Base64url → Base64 → JSON
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Extract role from JWT — handles common claim key variants */
function getRoleFromPayload(payload: Record<string, unknown>): string | null {
  // ASP.NET Core Identity uses the long ClaimTypes URI form
  const roleKey =
    "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";

  const raw =
    payload["role"] ??
    payload["roles"] ??
    payload["Role"] ??
    payload[roleKey] ??
    null;

  if (!raw) return null;
  if (Array.isArray(raw)) return (raw[0] as string) ?? null;
  return String(raw);
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── Protected: /admin/** — Admin only ─────────────────────────────────────
  // TEMPORARILY DISABLED for frontend-only development
  // if (pathname.startsWith("/admin")) {
  //   const token = req.cookies.get("token")?.value;

  //   if (!token) {
  //     // Not logged in → redirect to login with return URL
  //     const loginUrl = req.nextUrl.clone();
  //     loginUrl.pathname = "/login";
  //     loginUrl.searchParams.set("redirect", pathname);
  //     return NextResponse.redirect(loginUrl);
  //   }

  //   const payload = decodeJwtPayload(token);
  //   const role = payload ? getRoleFromPayload(payload) : null;

  //   if (role?.toLowerCase() !== "admin") {
  //     // Logged in but not admin → redirect to dashboard with error param
  //     const dashUrl = req.nextUrl.clone();
  //     dashUrl.pathname = "/dashboard";
  //     dashUrl.searchParams.set("error", "unauthorized");
  //     return NextResponse.redirect(dashUrl);
  //   }
  // }

  return NextResponse.next();
}

export const config = {
  // Run proxy on these paths only (excludes _next, api, static files)
  matcher: [
    "/admin/:path*",
  ],
};
