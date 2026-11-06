import { z } from "zod";

export const OfflineViolationReviewIdSchema = z.string().uuid();

// The backend returns LocalDateTime, not Instant. Validate the calendar value
// without assigning the browser timezone or silently appending a UTC offset.
const localDateTimeSchema = z.string().regex(
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?$/,
).refine((value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/.exec(value);
  if (!match) return false;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText] = match;
  const year = Number(yearText), month = Number(monthText), day = Number(dayText);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthDays = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return month >= 1 && month <= 12 && day >= 1 && day <= monthDays[month - 1]
    && Number(hourText) < 24 && Number(minuteText) < 60 && Number(secondText) < 60;
}, "Invalid local calendar date-time.");

export const OfflineViolationReviewStatusSchema = z.enum([
  "OBSERVING", "REVIEW_REQUIRED", "REVIEWED", "CLEARED",
]);
const decisionSchema = z.enum(["NO_ACTION", "FOLLOW_UP"]);

export const OfflineViolationReviewSchema = z.object({
  id: OfflineViolationReviewIdSchema,
  ownerId: z.string().uuid(),
  contractId: z.string().uuid(),
  machineId: z.string().uuid(),
  policyVersionId: z.string().uuid(),
  policyVersion: z.number().int().positive(),
  offlineLimitMinutes: z.number().int().positive(),
  status: OfflineViolationReviewStatusSchema,
  source: z.string().min(1),
  detectedAt: localDateTimeSchema,
  lastObservedAt: localDateTimeSchema,
  observedOfflineSince: localDateTimeSchema,
  observedOfflineUntil: localDateTimeSchema.nullable(),
  reviewRequiredAt: localDateTimeSchema.nullable(),
  decision: decisionSchema.nullable(),
  reviewerId: z.string().nullable(),
  reviewerRole: z.enum(["ADMIN", "MODERATOR"]).nullable(),
  decisionReason: z.string().nullable(),
  evidenceReferences: z.string().nullable(),
  decidedAt: localDateTimeSchema.nullable(),
});

export const OfflineViolationReviewListSchema = z.array(OfflineViolationReviewSchema);
export const OfflineViolationReviewContextSchema = z.object({
  ownerId: z.string().uuid().optional(),
  contractId: z.string().uuid().optional(),
  machineId: z.string().uuid().optional(),
}).strict();

export const OfflineViolationReviewListParamsSchema = OfflineViolationReviewContextSchema.extend({
  status: OfflineViolationReviewStatusSchema.optional(),
  page: z.number().int().min(0).max(2_147_483_647).default(0),
  size: z.number().int().min(1).max(100).default(50),
}).strict();

export const OfflineViolationReviewDecisionRequestSchema = z.object({
  decision: decisionSchema,
  reason: z.string().trim().min(1).max(2000),
  evidenceReferences: z.string().trim().min(1).max(2000).startsWith("private://"),
}).strict();

export type OfflineViolationReview = z.infer<typeof OfflineViolationReviewSchema>;
export type OfflineViolationReviewContext = z.infer<typeof OfflineViolationReviewContextSchema>;
export type OfflineViolationReviewListParams = z.input<typeof OfflineViolationReviewListParamsSchema>;
export type OfflineViolationReviewDecisionRequest = z.input<typeof OfflineViolationReviewDecisionRequestSchema>;
