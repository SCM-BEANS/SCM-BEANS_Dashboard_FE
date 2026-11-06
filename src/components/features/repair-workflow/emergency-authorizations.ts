import type { RepairCaseTimelineEvent } from "@/schema/machines.schema";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseEmergencyAuthorizationEvents(events: RepairCaseTimelineEvent[]) {
  return events.flatMap(event => {
    if (event.eventType !== "EMERGENCY_WORK_AUTHORIZED" || !event.details) return [];
    const match = /^authorizationId=([^;]+);scope=([\s\S]+);disputedReviewId=([^;]+)$/.exec(event.details);
    if (!match || !uuid.test(match[1]) || !match[2].trim() || !uuid.test(match[3]) || Number.isNaN(Date.parse(event.occurredAt))) return [];
    return [{ authorizationId: match[1], workScope: match[2], disputedReviewId: match[3], authorizedAt: event.occurredAt, actorRole: event.actorRole, reason: event.reason ?? "" }];
  }).sort((a, b) => Date.parse(b.authorizedAt) - Date.parse(a.authorizedAt));
}
