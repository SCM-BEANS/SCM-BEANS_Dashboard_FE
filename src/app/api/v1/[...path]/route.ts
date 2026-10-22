import { NextRequest, NextResponse } from 'next/server';
import { getIdaasApiBaseUrl } from '@/lib/axios/idaasTarget';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ path: string[] }> };

async function proxyIdaas(request: NextRequest, context: RouteContext): Promise<Response> {
  const { path } = await context.params;
  const baseUrl = await getIdaasApiBaseUrl();
  const target = `${baseUrl}/${path.map(encodeURIComponent).join('/')}${request.nextUrl.search}`;

  const headers = new Headers(request.headers);
  for (const name of ['host', 'connection', 'content-length', 'transfer-encoding']) {
    headers.delete(name);
  }

  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD'
        ? undefined
        : await request.arrayBuffer(),
      redirect: 'manual',
      cache: 'no-store',
    });

    const responseHeaders = new Headers(upstream.headers);
    for (const name of ['connection', 'content-length', 'content-encoding', 'transfer-encoding']) {
      responseHeaders.delete(name);
    }

    if (request.method === 'POST' && path.length === 2 && path[0] === 'auth' && path[1] === 'login') {
      responseHeaders.set('Cache-Control', 'no-store');
      let payload: unknown;
      try {
        payload = await upstream.clone().json();
      } catch {
        if (upstream.ok) {
          return NextResponse.json({ message: 'IDaaS login response is invalid.' }, { status: 502 });
        }
        return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
      }

      if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
        if (upstream.ok) {
          return NextResponse.json({ message: 'IDaaS login response is invalid.' }, { status: 502 });
        }
      } else if (Object.prototype.hasOwnProperty.call(payload, 'refresh_token')) {
        delete (payload as Record<string, unknown>).refresh_token;
        return new Response(JSON.stringify(payload), { status: upstream.status, headers: responseHeaders });
      } else if (upstream.ok) {
        return new Response(JSON.stringify(payload), { status: upstream.status, headers: responseHeaders });
      }
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return NextResponse.json({ message: 'IDaaS API is unavailable.' }, { status: 502 });
  }
}

export { proxyIdaas as GET, proxyIdaas as POST, proxyIdaas as PUT,
  proxyIdaas as PATCH, proxyIdaas as DELETE, proxyIdaas as HEAD };
