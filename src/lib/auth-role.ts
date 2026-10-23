import { PATH_ADMIN, PATH_HOME } from "@/routes/path";

function readRoles(accessToken: string): string[] {
  try {
    const segment = accessToken.split(".")[1];
    if (!segment) return [];
    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const bytes = Uint8Array.from(atob(padded), (character) =>
      character.charCodeAt(0),
    );
    const payload: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!payload || typeof payload !== "object" || !("roles" in payload)) return [];
    const roles = payload.roles;
    return Array.isArray(roles)
      ? roles.filter((role): role is string => typeof role === "string")
      : [];
  } catch {
    return [];
  }
}

export function hasAdminRole(accessToken: string): boolean {
  return readRoles(accessToken).some(
    (role) => role.trim().toUpperCase().replace(/^ROLE_/, "") === "ADMIN",
  );
}

export function getPostLoginPath(accessToken: string): string {
  return hasAdminRole(accessToken) ? PATH_ADMIN.ROOT : PATH_HOME.ROOT;
}
