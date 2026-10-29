import type { NextApiRequest, NextApiResponse } from "next";
import {
  getBackendApiSelection,
  preferLocalBackendApis,
} from "@/lib/server/backend-api-selection";

export const config = {
  api: { bodyParser: false },
};

const MAX_REQUEST_BYTES = 10 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 15_000;

const requestHeadersToSkip = new Set([
  "host",
  "connection",
  "content-length",
  "transfer-encoding",
  "accept-encoding",
]);

const responseHeadersToSkip = new Set([
  "connection",
  "content-length",
  "content-encoding",
  "transfer-encoding",
  "set-cookie",
]);

function getPath(req: NextApiRequest): string[] | null {
  const segments = req.query.path;
  if (!Array.isArray(segments) || segments.length === 0) return null;
  if (
    segments.some(
      (segment) =>
        !segment ||
        segment === "." ||
        segment === ".." ||
        segment.includes("/") ||
        segment.includes("\\"),
    )
  ) {
    return null;
  }
  return segments;
}

async function readBody(req: NextApiRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > MAX_REQUEST_BYTES) throw new Error("Request body too large");
    chunks.push(buffer);
  }

  return Buffer.concat(chunks);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const segments = getPath(req);
  if (!segments) {
    res.status(400).json({ error: "Invalid API path" });
    return;
  }

  let selection: Awaited<ReturnType<typeof getBackendApiSelection>>;
  try {
    selection = await getBackendApiSelection();
  } catch {
    res.status(500).json({ error: "Invalid IDaaS API configuration" });
    return;
  }

  const target = new URL(
    `${selection.idaasBaseUrl}/${segments.map(encodeURIComponent).join("/")}`,
  );
  target.search = new URL(req.url || "/", "http://localhost").search;

  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (requestHeadersToSkip.has(name) || value === undefined) continue;
    headers.set(name, Array.isArray(value) ? value.join(", ") : value);
  }

  const method = req.method || "GET";
  let body: Buffer | undefined;
  if (method !== "GET" && method !== "HEAD") {
    try {
      body = await readBody(req);
    } catch {
      res.status(413).json({ error: "Request body too large" });
      return;
    }
  }

  try {
    const upstream = await fetch(target, {
      method,
      headers,
      body: body ? new Uint8Array(body) : undefined,
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    let responseBody = Buffer.from(await upstream.arrayBuffer());
    let genericErrorBody = false;
    const isAuthTokenResponse =
      method === "POST" &&
      segments[0] === "auth" &&
      ((segments[1] === "login" &&
        (segments.length === 2 ||
          (segments.length === 3 && segments[2] === "mfa"))) ||
        (segments[1] === "refresh" && segments.length === 2));

    if (isAuthTokenResponse) {
      try {
        const payload: unknown = JSON.parse(responseBody.toString("utf8"));
        if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
          throw new Error("Invalid authentication response");
        }
        const { refresh_token: _refreshToken, ...publicPayload } = payload as Record<
          string,
          unknown
        >;
        responseBody = Buffer.from(JSON.stringify(publicPayload));
      } catch {
        if (upstream.ok) {
          res.setHeader("Cache-Control", "no-store");
          res.status(502).json({ error: "Invalid IDaaS authentication response" });
          return;
        }
        responseBody = Buffer.from(JSON.stringify({ error: "IDaaS authentication failed" }));
        genericErrorBody = true;
      }
    }

    res.status(upstream.status);
    upstream.headers.forEach((value, name) => {
      if (!responseHeadersToSkip.has(name)) res.setHeader(name, value);
    });
    if (genericErrorBody) res.setHeader("Content-Type", "application/json");
    const cookies = upstream.headers.getSetCookie();
    if (cookies.length) res.setHeader("Set-Cookie", cookies);
    res.setHeader("Cache-Control", "no-store");
    res.end(responseBody);
  } catch {
    if (selection.mode === "remote") preferLocalBackendApis();
    res.status(502).json({ error: "IDaaS API is unavailable" });
  }
}
