import {
  PATH_ADMIN,
  PATH_CUSTOMER,
  PATH_HOME,
  PATH_MODERATOR,
  PATH_TECHNICIAN,
} from "@/routes/path";

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

export function hasOwnerRole(accessToken: string): boolean {
  return readRoles(accessToken).some(
    (role) => role.trim().toUpperCase().replace(/^ROLE_/, "") === "OWNER",
  );
}

export function hasTechnicianRole(accessToken: string): boolean {
  return readRoles(accessToken).some(
    (role) => role.trim().toUpperCase().replace(/^ROLE_/, "") === "TECHNICIAN",
  );
}

export function canAccessCustomerArea(accessToken: string): boolean {
  return hasOwnerRole(accessToken) && !hasTechnicianRole(accessToken);
}

export function canAccessTechnicianArea(accessToken: string): boolean {
  return hasTechnicianRole(accessToken) && !hasOwnerRole(accessToken);
}

export function getPostLoginPath(accessToken: string): string {
  if (hasAdminRole(accessToken)) return PATH_ADMIN.ROOT;
  if (hasModeratorRole(accessToken)) return PATH_MODERATOR.ROOT;
  const isOwner = hasOwnerRole(accessToken);
  const isTechnician = hasTechnicianRole(accessToken);
  if (isOwner && isTechnician) return PATH_HOME.ROOT;
  if (isOwner) return PATH_CUSTOMER.ROOT;
  if (isTechnician) return PATH_TECHNICIAN.ROOT;
  return PATH_HOME.ROOT;
}
