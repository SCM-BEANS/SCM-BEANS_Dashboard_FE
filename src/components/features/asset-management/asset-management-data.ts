import { profilesApi } from "@/apis/profiles.api";
import type { ProfilePage } from "@/schema/profiles.schema";

export type ManagedProfileRole = "OWNER" | "TECHNICIAN";

export async function loadProfilePage(
  role: ManagedProfileRole,
  page: number,
  signal?: AbortSignal,
): Promise<ProfilePage> {
  return profilesApi.list({ role, page, size: 100 }, signal);
}

export function nextProfilePage(lastPage: ProfilePage): number | undefined {
  const next = lastPage.page + 1;
  return next < lastPage.totalPages ? next : undefined;
}
