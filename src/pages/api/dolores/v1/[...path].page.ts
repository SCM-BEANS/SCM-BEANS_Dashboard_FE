import type { NextApiRequest, NextApiResponse } from "next";
import {
  getBackendApiSelection,
  preferLocalBackendApis,
} from "@/lib/server/backend-api-selection";

export const config = {
  api: { bodyParser: false },
};

const REQUEST_TIMEOUT_MS = 15_000;
const MAX_REQUEST_BYTES = 10 * 1024 * 1024;

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

function buildTarget(
  baseUrl: string,
  segments: string[],
  requestUrl: string | undefined,
): URL {
  const target = new URL(
    `${baseUrl}/api/v1/${segments.map(encodeURIComponent).join("/")}`,
  );
  target.search = new URL(requestUrl || "/", "http://localhost").search;
  return target;
}

function buildRequestHeaders(req: NextApiRequest): Headers {
  const headers = new Headers();
  const connectionTokens = (req.headers.connection || "")
    .split(",")
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);

  for (const [name, value] of Object.entries(req.headers)) {
    const normalizedName = name.toLowerCase();
    if (
      requestHeadersToSkip.has(normalizedName) ||
      connectionTokens.includes(normalizedName) ||
      value === undefined
    ) {
      continue;
    }

    headers.set(
      normalizedName,
      Array.isArray(value)
        ? normalizedName === "cookie"
          ? value.join("; ")
          : value.join(", ")
        : value,
    );
  }

  return headers;
}

async function fetchUpstream(
  target: URL,
  method: string,
  headers: Headers,
  body: Buffer | undefined,
): Promise<Response> {
  return fetch(target, {
    method,
    headers,
    body: body ? new Uint8Array(body) : undefined,
    redirect: "manual",
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const segments = getPath(req);
  if (!segments) {
    res.status(400).json({ error: "Invalid API path" });
    return;
  }

  let selection: Awaited<ReturnType<typeof getBackendApiSelection>>;
  try {
    selection = await getBackendApiSelection();
  } catch {
    res.status(500).json({ error: "Invalid Dolores API configuration" });
    return;
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

  const headers = buildRequestHeaders(req);
  let upstream: Response;

  try {
    upstream = await fetchUpstream(
      buildTarget(selection.doloresBaseUrl, segments, req.url),
      method,
      headers,
      body,
    );
  } catch {
    if (selection.mode !== "remote") {
      res.status(502).json({ error: "Dolores API is unavailable" });
      return;
    }

    // A GET or HEAD can safely retry locally if the remote server went down
    // between its health check and the API request. Do not replay mutations.
    const localSelection = preferLocalBackendApis();

    if (method !== "GET" && method !== "HEAD") {
      res.status(502).json({ error: "Remote Dolores API is unavailable" });
      return;
    }

    try {
      upstream = await fetchUpstream(
        buildTarget(localSelection.doloresBaseUrl, segments, req.url),
        method,
        headers,
        body,
      );
    } catch {
      res.status(502).json({ error: "Dolores API is unavailable" });
      return;
    }
  }

  const responseBody = Buffer.from(await upstream.arrayBuffer());
  res.status(upstream.status);
  upstream.headers.forEach((value, name) => {
    if (!responseHeadersToSkip.has(name.toLowerCase())) {
      res.setHeader(name, value);
    }
  });
  const cookies = upstream.headers.getSetCookie();
  if (cookies.length) res.setHeader("Set-Cookie", cookies);
  res.setHeader("Cache-Control", "no-store");
  res.end(responseBody);
}
