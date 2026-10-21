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
