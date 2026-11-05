import type { NextApiRequest, NextApiResponse } from "next";
import { getBackendApiSelection } from "@/lib/server/backend-api-selection";

type AccountKey = "ADMIN" | "MODERATOR" | "TECHNICIAN" | "OWNER_PRIMARY" | "OWNER_SECONDARY";

const EMAIL_ENV_BY_ACCOUNT: Record<AccountKey, string> = {
  ADMIN: "DEV_QUICK_LOGIN_ADMIN_EMAIL",
  MODERATOR: "DEV_QUICK_LOGIN_MODERATOR_EMAIL",
  TECHNICIAN: "DEV_QUICK_LOGIN_TECHNICIAN_EMAIL",
  OWNER_PRIMARY: "DEV_QUICK_LOGIN_OWNER_PRIMARY_EMAIL",
  OWNER_SECONDARY: "DEV_QUICK_LOGIN_OWNER_SECONDARY_EMAIL",
};

function isAccountKey(value: unknown): value is AccountKey {
  return typeof value === "string" && Object.hasOwn(EMAIL_ENV_BY_ACCOUNT, value);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (process.env.NODE_ENV !== "development") return res.status(404).json({ message: "Not found" });
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method not allowed" });
  }

  const account = req.body && typeof req.body === "object" ? req.body.account : undefined;
  if (!isAccountKey(account)) return res.status(400).json({ message: "Unknown quick-login account" });

  const email = process.env[EMAIL_ENV_BY_ACCOUNT[account]];
  const password = process.env.DEV_QUICK_LOGIN_PASSWORD;
  if (!email || !password) return res.status(503).json({ message: "Quick-login credentials are not configured in .env.local" });

  try {
    const selection = await getBackendApiSelection();
    const upstream = await fetch(`${selection.idaasBaseUrl.replace(/\/+$/, "")}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    let body = await upstream.text();
    const contentType = upstream.headers.get("content-type");
    if (contentType) res.setHeader("Content-Type", contentType);
    const cookies = upstream.headers.getSetCookie();
    if (cookies.length) res.setHeader("Set-Cookie", cookies);

    let genericErrorBody = false;
    try {
      const payload: unknown = JSON.parse(body);
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        throw new Error("Invalid authentication response");
      }
      const { refresh_token: _refreshToken, ...publicPayload } = payload as Record<string, unknown>;
      body = JSON.stringify(publicPayload);
    } catch {
      if (upstream.ok) {
        res.setHeader("Cache-Control", "no-store");
        return res.status(502).json({ error: "Invalid IDaaS authentication response" });
      }
      body = JSON.stringify({ error: "Quick login failed" });
      genericErrorBody = true;
    }

    if (genericErrorBody) res.setHeader("Content-Type", "application/json");
    return res.status(upstream.status).send(body);
  } catch {
    return res.status(502).json({ message: "Could not reach the configured IDAAS API" });
  }
}
