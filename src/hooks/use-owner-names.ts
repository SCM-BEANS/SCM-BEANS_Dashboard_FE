import { useQuery } from "@tanstack/react-query";
import { profilesApi } from "@/apis/profiles.api";

export function useOwnerNames(ownerIds: readonly (string | null | undefined)[]) {
  const uniqueOwnerIds = [...new Set(ownerIds.filter((ownerId): ownerId is string => Boolean(ownerId)))].sort();

  return useQuery({
    queryKey: ["dolores", "profiles", "owner-names", uniqueOwnerIds],
    queryFn: async ({ signal }) => Object.fromEntries(await Promise.all(uniqueOwnerIds.map(async (ownerId) => {
      try {
        const profile = await profilesApi.getById(ownerId, signal);
        return [ownerId, profile.fullName || profile.email] as const;
      } catch (error) {
        if (signal.aborted) throw error;
        return [ownerId, ""] as const;
      }
    }))),
    enabled: uniqueOwnerIds.length > 0,
  });
}
