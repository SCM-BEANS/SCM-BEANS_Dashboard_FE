import { useQuery } from "@tanstack/react-query";
import { repairCasesApi } from "@/apis/repair-cases.api";
import { repairCostReviewsApi } from "@/apis/repair-cost-reviews.api";
import { RepairCaseIdSchema, type RepairCaseTimelineEvent } from "@/schema/machines.schema";
import { parseEmergencyAuthorizationEvents } from "./emergency-authorizations";

export function useRepairCaseCostDispute(caseId: string) {
  const timeline = useQuery({
    queryKey: ["dolores", "repair-cases", caseId, "timeline", "all"],
    enabled: RepairCaseIdSchema.safeParse(caseId).success,
    retry: false,
    queryFn: async ({ signal }) => {
      const events: RepairCaseTimelineEvent[] = [];
      for (let page = 0; page < 20; page++) {
        const result = await repairCasesApi.getTimeline(caseId, page, 50, signal);
        events.push(...result.content);
        if (result.last) return events;
      }
      throw new Error("Không thể tải toàn bộ lịch sử sửa chữa.");
    },
  });
  const latest = [...(timeline.data ?? [])].sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))
    .map(event => event.details?.match(/(?:^|;)repairCostReviewId=([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:;|$)/i)?.[1]).find(Boolean);
  const review = useQuery({ queryKey: ["dolores", "repair-cost-reviews", latest], queryFn: ({ signal }) => repairCostReviewsApi.getById(latest!, signal), enabled: Boolean(latest), retry: false });
  return { isDisputed: review.data?.status === "DISPUTED", review: review.data, authorizations: parseEmergencyAuthorizationEvents(timeline.data ?? []), isLoading: timeline.isLoading || review.isLoading, isError: timeline.isError || review.isError };
}
