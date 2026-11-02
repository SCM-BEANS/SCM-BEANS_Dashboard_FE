import Cookies from "js-cookie";
import { getAccessTokenSubject } from "@/lib/auth-role";

export type RepairWorkflowRole = "admin" | "moderator" | "technician" | "owner";

export function querySubjectId(): string | null {
  const token = typeof document === "undefined" ? undefined : Cookies.get("access_token");
  return token ? getAccessTokenSubject(token) : null;
}

export function querySubject(role: RepairWorkflowRole): string {
  return `${role}:${querySubjectId() ?? "anonymous"}`;
}
