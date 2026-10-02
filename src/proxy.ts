import { NextResponse } from "next/server";

// Frontend-only prototype: dashboard routes are available without login or role checks.
export function proxy() {
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
