import Cookies from "js-cookie";
import { getAccessTokenSubject } from "@/lib/auth-role";

export function getAuthenticatedSubjectId() {
  const token = typeof document === "undefined" ? undefined : Cookies.get("access_token");
  return token ? getAccessTokenSubject(token) : null;
}

export function authScopedQuerySubject(role: string) {
  return `${role}:${getAuthenticatedSubjectId() ?? "anonymous"}`;
}
