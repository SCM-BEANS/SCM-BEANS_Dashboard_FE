import type { AppRole } from '@/routes/routes';
import {
  PATH_ADMIN,
  PATH_DASHBOARD,
  PATH_MODERATOR,
  PATH_TECHNICIAN,
} from '@/routes/path';

const APP_ROLE_PRIORITY: readonly AppRole[] = [
  'admin',
  'moderator',
  'technician',
  'customer',
];

const ROLE_ALIASES: Record<string, AppRole> = {
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  STAFF: 'moderator',
  TECHNICIAN: 'technician',
  OWNER: 'customer',
  CUSTOMER: 'customer',
};

function readRoleClaims(accessToken: string): string[] {
  try {
    const payloadSegment = accessToken.split('.')[1];
    if (!payloadSegment) return [];

    const base64 = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const binaryPayload = atob(padded);
    const bytes = Uint8Array.from(binaryPayload, (character) => character.charCodeAt(0));
    const payload: unknown = JSON.parse(new TextDecoder().decode(bytes));

    if (!payload || typeof payload !== 'object' || !('roles' in payload)) return [];
    const roles = (payload as { roles?: unknown }).roles;
    return Array.isArray(roles)
      ? roles.filter((role): role is string => typeof role === 'string')
      : [];
  } catch {
    return [];
  }
}

export function getAppRolesFromAccessToken(accessToken: string): AppRole[] {
  const roles = new Set<AppRole>();

  for (const claim of readRoleClaims(accessToken)) {
    const normalized = claim.trim().toUpperCase().replace(/^ROLE_/, '');
    const appRole = ROLE_ALIASES[normalized];
    if (appRole) roles.add(appRole);
  }

  return APP_ROLE_PRIORITY.filter((role) => roles.has(role));
}

export function getRoleHomePath(role: AppRole): string {
  switch (role) {
    case 'admin':
      return PATH_ADMIN.root;
    case 'moderator':
      return PATH_MODERATOR.root;
    case 'technician':
      return PATH_TECHNICIAN.root;
    case 'customer':
      return PATH_DASHBOARD.root;
  }
}

export function getPrimaryRoleHomePath(accessToken: string): string | null {
  const role = getAppRolesFromAccessToken(accessToken)[0];
  return role ? getRoleHomePath(role) : null;
}

export function getRequiredRoleForPath(pathname: string): AppRole | null {
  const protectedRoots: readonly [string, AppRole][] = [
    [PATH_ADMIN.root, 'admin'],
    [PATH_MODERATOR.root, 'moderator'],
    [PATH_TECHNICIAN.root, 'technician'],
    [PATH_DASHBOARD.root, 'customer'],
  ];

  return protectedRoots.find(([root]) => pathname === root || pathname.startsWith(`${root}/`))?.[1] ?? null;
}
