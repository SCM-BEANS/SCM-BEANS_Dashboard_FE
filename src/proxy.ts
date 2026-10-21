import { NextResponse, type NextRequest } from "next/server";
import { PATH_AUTH } from '@/routes/path';
import {
  getAppRolesFromAccessToken,
  getPrimaryRoleHomePath,
  getRequiredRoleForPath,
} from '@/lib/auth/roles';

function redirectTo(request: NextRequest, path: string): NextResponse {
  return NextResponse.redirect(new URL(path, request.url));
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const accessToken = request.cookies.get('access_token')?.value;
  const appRoles = accessToken ? getAppRolesFromAccessToken(accessToken) : [];
  const roleHome = accessToken ? getPrimaryRoleHomePath(accessToken) : null;

  // This keeps users in the matching frontend area; API authorization remains the backend's responsibility.

  if (pathname === PATH_AUTH.login) {
    return roleHome ? redirectTo(request, roleHome) : NextResponse.next();
  }

  const requiredRole = getRequiredRoleForPath(pathname);
  if (!requiredRole) return NextResponse.next();
  if (!accessToken) return redirectTo(request, PATH_AUTH.login);

  if (appRoles.includes(requiredRole)) return NextResponse.next();
  if (roleHome) return redirectTo(request, roleHome);

  const loginUrl = new URL(PATH_AUTH.login, request.url);
  loginUrl.searchParams.set('error', 'role_unavailable');
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    '/login',
    '/admin/:path*',
    '/moderator/:path*',
    '/technician/:path*',
    '/dashboard/:path*',
  ],
};
