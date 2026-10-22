import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_COOKIE_PATH = '/api/v1/auth';
const EXPIRED_COOKIE_DATE = 'Thu, 01 Jan 1970 00:00:00 GMT';

export function POST(request: NextRequest): Response {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host') || request.nextUrl.host;
  const protocol = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.slice(0, -1);
  if (origin && origin !== `${protocol}://${host}`) {
    return NextResponse.json({ message: 'Forbidden.' }, { status: 403 });
  }

  const cookiePath = process.env.IDAAS_REFRESH_COOKIE_PATH || DEFAULT_COOKIE_PATH;
  if (!/^\/[^\x00-\x20\x7f;,]*$/.test(cookiePath)) {
    return NextResponse.json({ message: 'Invalid refresh cookie path.' }, { status: 500 });
  }

  const headers = new Headers({ 'Cache-Control': 'no-store' });
  for (const path of new Set([cookiePath, '/'])) {
    headers.append(
      'Set-Cookie',
      `refresh_token=; Path=${path}; Max-Age=0; Expires=${EXPIRED_COOKIE_DATE}; HttpOnly; Secure; SameSite=Strict`
    );
  }

  return new Response(null, { status: 204, headers });
}
