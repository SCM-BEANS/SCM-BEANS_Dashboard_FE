import { PATH_ADMIN, PATH_HOME, PATH_MODERATOR } from "@/routes/path";

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

export function hasModeratorRole(accessToken: string): boolean {
  return readRoles(accessToken).some(
    (role) => role.trim().toUpperCase().replace(/^ROLE_/, "") === "MODERATOR",
  );
}

export function getPostLoginPath(accessToken: string): string {
  if (hasAdminRole(accessToken)) return PATH_ADMIN.ROOT;
  if (hasModeratorRole(accessToken)) return PATH_MODERATOR.ROOT;
  return PATH_HOME.ROOT;
}
