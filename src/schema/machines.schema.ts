import { z } from "zod";

export const MachineIdSchema = z.string().uuid();
const countSchema = z.number().int().nonnegative();
const dateTimeSchema = z.union([
  z.string().datetime({ offset: true }),
  z.string().datetime({ local: true }),
]);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const MachineStatusSchema = z.enum([
  "IN_WAREHOUSE",
  "PENDING_ACTIVATION",
  "DEPLOYED_CONTRACT_OWNER",
  "DEPLOYED_STORE_OWNER",
  "UNDER_MAINTENANCE",
  "REFURBISHING",
  "PENDING_QA",
  "AVAILABLE_FOR_RENT",
  "RETIRED",
]);

export const MachineTypeSchema = z.enum(["CONVENTIONAL", "SMART_IOT"]);
export const MachineTypeMappingRequestSchema = z.object({
  machineType: MachineTypeSchema,
  reason: z.string().trim().min(1).max(1000),
}).strict();
export type MachineTypeMappingRequest = z.infer<typeof MachineTypeMappingRequestSchema>;

export const MarkMachineReadyRequestSchema = z.object({
  reason: z.string().trim().min(1),
}).strict();

export const CreateMachineRequestSchema = z.object({
  serialNumber: z.string().trim().min(1),
  machineType: MachineTypeSchema,
  status: z.literal("IN_WAREHOUSE"),
  cupsServedSinceLastDescale: countSchema,
  region: z.string().trim().min(1).optional(),
});

export const CreateMachineResponseSchema = z.object({ id: MachineIdSchema }).passthrough();

export const UpdateMachineRequestSchema = z.object({
  serialNumber: z.string().trim().min(1),
  status: MachineStatusSchema,
  ownerId: z.string().uuid().optional(),
  deployedAt: dateTimeSchema.optional(),
  nextPreventiveMaintenanceAt: dateTimeSchema.optional(),
  cupsServedSinceLastDescale: countSchema.optional(),
  region: z.string().optional(),
  locationId: z.string().uuid().optional(),
}).strict();
export type UpdateMachineRequest = z.infer<typeof UpdateMachineRequestSchema>;

export const MachineInventoryItemSchema = z.object({
  id: MachineIdSchema,
  ownerId: z.string().uuid().nullish(),
  tenantId: z.string().uuid().nullish(),
  locationId: z.string().uuid().nullish(),
  machineType: MachineTypeSchema.nullish(),
  serialNumber: z.string().nullish(),
  status: MachineStatusSchema.nullish(),
  deployedAt: dateTimeSchema.nullish(),
  region: z.string().nullish(),
  ownerType: z.string().nullish(),
  contractStartDate: dateSchema.nullish(),
  contractEndDate: dateSchema.nullish(),
  monthlyRentalFee: z.number().nullish(),
}).passthrough();

export const MachineInventorySchema = z.array(MachineInventoryItemSchema);

export const RentalCandidateSchema = z.object({
  machineId: MachineIdSchema,
  displayName: z.string().trim().min(1),
}).strip();

export const RentalCandidatePageSchema = z.object({
  content: z.array(RentalCandidateSchema),
  page: z.number().int().nonnegative(),
  size: z.number().int().positive(),
  totalElements: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
}).passthrough();

export const MachineSchema = z.object({
  id: MachineIdSchema,
  ownerId: z.string().uuid().nullish(),
  tenantId: z.string().uuid().nullish(),
  serialNumber: z.string().nullish(),
  status: MachineStatusSchema.nullish(),
  deployedAt: dateTimeSchema.nullish(),
  nextPreventiveMaintenanceAt: dateTimeSchema.nullish(),
  cupsServedSinceLastDescale: countSchema.nullish(),
  region: z.string().nullish(),
  ownerType: z.string().nullish(),
  contractStartDate: dateSchema.nullish(),
  contractEndDate: dateSchema.nullish(),
  monthlyRentalFee: z.number().nullish(),
  locationId: z.string().uuid().nullish(),
  machineType: MachineTypeSchema.nullish(),
  machineTypeMappedAt: dateTimeSchema.nullish(),
  machineTypeMappedBy: z.string().nullish(),
  machineTypeMappingReason: z.string().nullish(),
  modelId: z.string().uuid().nullish(),
  modelMappedAt: dateTimeSchema.nullish(),
  modelMappedBy: z.string().nullish(),
  modelMappingReason: z.string().nullish(),
}).passthrough();

export const InventorySummarySchema = z.object({
  totalMachines: countSchema.nullish(),
  statusCounts: z.record(countSchema).nullish(),
}).passthrough();

export const MaintenanceScheduleSchema = z.object({
  nextPreventiveMaintenanceAt: dateTimeSchema.nullish(),
  cupsServedSinceLastDescale: countSchema.nullish(),
}).passthrough();

export const MaintenanceTicketSchema = z.object({
  id: z.string().uuid().nullish(),
  machineId: MachineIdSchema.nullish(),
  status: z.enum(["PENDING", "ASSIGNED", "IN_PROGRESS", "RESOLVED"]).nullish(),
  scheduledDueAt: dateTimeSchema.nullish(),
  maintenanceWindowDeadline: dateTimeSchema.nullish(),
  startedAt: dateTimeSchema.nullish(),
  acknowledgedAt: dateTimeSchema.nullish(),
  completedAt: dateTimeSchema.nullish(),
  assignedTo: z.string().nullish(),
  assignedTechnicianId: z.string().uuid().nullish(),
  source: z.string().nullish(),
  preventiveSubtype: z.string().nullish(),
  notes: z.string().nullish(),
  diagnosis: z.string().nullish(),
  resolutionResult: z.string().nullish(),
  actionableInstructions: z.string().nullish(),
}).strip();

export const MaintenanceTicketDetailsSchema = MaintenanceTicketSchema.extend({
  ownerId: z.string().uuid().nullish(),
  contractId: z.string().uuid().nullish(),
  terminationCaseId: z.string().uuid().nullish(),
  alertLevel: z.string().nullish(),
  createdFromAlertId: z.string().uuid().nullish(),
  policyVersionId: z.string().uuid().nullish(),
  maintenanceRequestId: z.string().uuid().nullish(),
  repairCaseId: z.string().uuid().nullish(),
  overdueReviewRequired: z.boolean().optional(),
  overdueReviewAt: dateTimeSchema.nullish(),
  overdueReviewReason: z.string().nullish(),
  overdueReviewedAt: dateTimeSchema.nullish(),
  overdueReviewedBy: z.string().uuid().nullish(),
  completionEvidenceReferences: z.string().nullish(),
  completedBy: z.string().nullish(),
  createdBy: z.string().nullish(),
  resolvedAt: dateTimeSchema.nullish(),
  partsCost: z.number().nullish(),
  partsReplaced: z.string().nullish(),
  resolutionDurationMinutes: z.number().int().nonnegative().nullish(),
  responsibility: z.string().nullish(),
  estimatedCost: z.number().nullish(),
  actualCost: z.number().nullish(),
  evidenceReference: z.string().nullish(),
  version: z.number().int().nonnegative().optional(),
}).passthrough();

export const MaintenanceTicketListSchema = z.array(MaintenanceTicketSchema);
export const MaintenanceTicketListParamsSchema = z.object({
  machineId: MachineIdSchema.optional(),
  ownerId: z.string().uuid().optional(),
  contractId: z.string().uuid().optional(),
  page: z.number().int().nonnegative().optional(),
  size: z.number().int().positive().max(100).optional(),
}).strict();
export type MaintenanceTicketListParams = z.infer<typeof MaintenanceTicketListParamsSchema>;

export const RepairIntakeRequestSchema = z.object({
  machineId: MachineIdSchema,
  idempotencyKey: z.string().min(1).max(128),
  issueDescription: z.string().max(4000),
  evidenceReference: z.string().max(512).optional(),
}).strict();

export const MaintenanceRequestSchema = z.object({
  id: z.string().uuid(),
  requestType: z.enum(["PREVENTIVE", "REPAIR"]),
  machineId: MachineIdSchema,
  issueDescription: z.string().nullish(),
  status: z.enum([
    "REQUESTED",
    "TRIAGED",
    "RESCHEDULE_REQUESTED",
    "CONFIRMED",
    "IN_PROGRESS",
    "COMPLETED",
    "CLOSED",
    "OVERDUE_REVIEW",
    "CANCELLED",
  ]),
}).strip();

export const MaintenanceRequestListSchema = z.array(MaintenanceRequestSchema);

export const MaintenanceRequestDetailsSchema = MaintenanceRequestSchema.extend({
  reportedAt: dateTimeSchema.nullish(),
  evidenceReference: z.string().nullish(),
  ownerId: z.string().uuid().nullish(),
  contractId: z.string().uuid().nullish(),
  policyVersionId: z.string().uuid().nullish(),
  scheduledDueAt: dateTimeSchema.nullish(),
  windowStart: dateSchema.nullish(),
  windowEnd: dateSchema.nullish(),
  requestedAppointmentAt: dateTimeSchema.nullish(),
  confirmedAppointmentAt: dateTimeSchema.nullish(),
  requestedBy: z.string().uuid().nullish(),
  confirmedBy: z.string().uuid().nullish(),
  confirmedByRole: z.string().nullish(),
  exceptionReason: z.string().nullish(),
  overdueReviewedAt: dateTimeSchema.nullish(),
  overdueReviewedBy: z.string().uuid().nullish(),
  overdueReviewedByRole: z.string().nullish(),
  overdueReviewReason: z.string().nullish(),
  maintenanceTicketId: z.string().uuid().nullish(),
  replacementAssignmentId: z.string().uuid().nullish(),
  serviceStartedAt: dateTimeSchema.nullish(),
  completedAt: dateTimeSchema.nullish(),
  closedAt: dateTimeSchema.nullish(),
  closureExceptionReason: z.string().nullish(),
  closedBy: z.string().uuid().nullish(),
  closedByRole: z.string().nullish(),
  createdAt: dateTimeSchema.nullish(),
  updatedAt: dateTimeSchema.nullish(),
}).strip();

export const MaintenanceCustodyEventSchema = z.object({
  id: z.string().uuid(),
  maintenanceRequestId: z.string().uuid(),
  repairCaseId: z.string().uuid().nullish(),
  eventType: z.enum([
    "PRIMARY_COLLECTED",
    "REPLACEMENT_DELIVERED",
    "REPLACEMENT_COLLECTED",
    "PRIMARY_RETURNED",
  ]),
  machineId: MachineIdSchema,
  actorId: z.string().uuid(),
  actorRole: z.string(),
  occurredAt: dateTimeSchema,
  conditionNotes: z.string().nullish(),
  evidenceReference: z.string().nullish(),
  ownerAcknowledgedAt: dateTimeSchema.nullish(),
  ownerAcknowledgedBy: z.string().uuid().nullish(),
  ownerAcknowledgement: z.string().nullish(),
  acknowledgementUnavailableReason: z.string().nullish(),
}).strip();

export const MaintenanceCustodyEventListSchema = z.array(MaintenanceCustodyEventSchema);
export const MaintenanceAppointmentRequestSchema = z.object({
  appointmentAt: dateTimeSchema,
}).strict();
export const MaintenanceCustodyAcknowledgementRequestSchema = z.object({
  acknowledgement: z.string().trim().min(1).max(1000),
}).strict();

export const RepairCaseTimelineEventSchema = z.object({
  id: z.string().uuid(),
  repairCaseId: z.string().uuid(),
  eventType: z.string(),
  fromStatus: z.string().nullish(),
  toStatus: z.string().nullish(),
  actorId: z.string().uuid().nullish(),
  actorRole: z.string(),
  occurredAt: dateTimeSchema,
  reason: z.string().nullish(),
  details: z.string().nullish(),
  relatedMachineId: MachineIdSchema.nullish(),
  offeredStartAt: dateTimeSchema.nullish(),
  offeredEndAt: dateTimeSchema.nullish(),
  idempotencyKey: z.string().nullish(),
}).strip();

export const RepairCaseSchema = z.object({
  id: z.string().uuid(),
  maintenanceRequestId: z.string().uuid(),
  ownerId: z.string().uuid(),
  contractId: z.string().uuid(),
  primaryMachineId: MachineIdSchema,
  maintenanceTicketId: z.string().uuid().nullish(),
  status: z.enum([
    "REPORTED",
    "TRIAGE",
    "WAITING_REPLACEMENT",
    "WAITING_OWNER_DECISION",
    "REPLACEMENT_PLANNED",
    "PRIMARY_COLLECTED",
    "REPLACEMENT_DELIVERED",
    "DIAGNOSIS",
    "REPAIR_IN_PROGRESS",
    "REPAIR_COMPLETED",
    "REPLACEMENT_COLLECTED",
    "PRIMARY_RETURNED",
    "OWNER_ACKNOWLEDGED",
    "CLOSED",
    "REJECTED",
    "CANCELLED",
  ]),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
  closedAt: dateTimeSchema.nullish(),
  timeline: z.array(RepairCaseTimelineEventSchema),
  timelineCount: z.number().int().nonnegative().optional(),
  timelineHasNext: z.boolean().optional(),
  timelinePath: z.string().optional(),
}).strip();

export const RepairCaseSummarySchema = z.object({
  id: z.string().uuid(),
  maintenanceRequestId: z.string().uuid(),
  ownerId: z.string().uuid(),
  contractId: z.string().uuid(),
  primaryMachineId: MachineIdSchema,
  status: RepairCaseSchema.shape.status,
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
  closedAt: dateTimeSchema.nullish(),
}).passthrough();
export const RepairCaseListSchema = z.array(RepairCaseSummarySchema);
export const RepairCaseTimelinePageSchema = z.object({
  content: z.array(RepairCaseTimelineEventSchema),
  totalPages: z.number().int().nonnegative(),
  totalElements: z.number().int().nonnegative(),
  number: z.number().int().nonnegative(),
  size: z.number().int().positive(),
  first: z.boolean().optional(),
  last: z.boolean().optional(),
  empty: z.boolean().optional(),
}).passthrough();

export const RepairDiagnosisRequestSchema = z.object({
  diagnosis: z.string().trim().min(1).max(4000),
  evidenceReference: z.string().trim().min(1).max(512),
}).strict();
export const RepairWorkStartRequestSchema = z.object({
  workScope: z.string().trim().min(1).max(2000),
  emergencyAuthorizationId: z.string().uuid().optional(),
}).strict();
export const RepairWorkCompletionRequestSchema = z.object({
  diagnosis: z.string().trim().min(1).max(4000),
  resolutionResult: z.string().trim().min(1).max(4000),
  workScope: z.string().trim().min(1).max(2000),
  evidenceReferences: z.array(z.string().trim().min(1).max(512)).min(1),
  notes: z.string().max(4000).optional(),
  emergencyAuthorizationId: z.string().uuid().optional(),
}).strict();
export const RepairFallbackDecisionRequestSchema = z.object({
  replacementMachineId: MachineIdSchema,
  accepted: z.boolean(),
  reason: z.string().trim().min(1).max(1000),
}).strict();
export const RepairCustodyEventRequestSchema = z.object({
  eventType: z.enum([
    "PRIMARY_COLLECTED",
    "REPLACEMENT_DELIVERED",
    "REPLACEMENT_COLLECTED",
    "PRIMARY_RETURNED",
  ]),
  machineId: MachineIdSchema,
  conditionNotes: z.string().trim().min(1).max(2000),
  evidenceReference: z.string().trim().min(1).max(512),
}).strict();

export const RepairTriageRequestSchema = z.object({
  accepted: z.boolean(),
  reason: z.string().max(1000),
});
export const RepairTriageResponseSchema = z.object({
  requestId: z.string().uuid(),
  accepted: z.boolean(),
  requestStatus: z.string(),
  repairCase: RepairCaseSchema.nullish(),
}).passthrough();
export const RepairIntakeResponseSchema = z.record(z.string(), z.unknown());

export type RepairIntakeRequest = z.infer<typeof RepairIntakeRequestSchema>;
export type MaintenanceRequest = z.infer<typeof MaintenanceRequestSchema>;
export type MaintenanceRequestDetails = z.infer<typeof MaintenanceRequestDetailsSchema>;
export type MaintenanceCustodyEvent = z.infer<typeof MaintenanceCustodyEventSchema>;
export type MaintenanceAppointmentRequest = z.infer<typeof MaintenanceAppointmentRequestSchema>;
export type MaintenanceCustodyAcknowledgementRequest = z.infer<typeof MaintenanceCustodyAcknowledgementRequestSchema>;
export type RepairCase = z.infer<typeof RepairCaseSchema>;
export type RepairCaseSummary = z.infer<typeof RepairCaseSummarySchema>;
export type RepairTriageRequest = z.infer<typeof RepairTriageRequestSchema>;
export type RepairTriageResponse = z.infer<typeof RepairTriageResponseSchema>;
export type RepairIntakeResponse = z.infer<typeof RepairIntakeResponseSchema>;
export type RepairDiagnosisRequest = z.infer<typeof RepairDiagnosisRequestSchema>;
export type RepairWorkStartRequest = z.infer<typeof RepairWorkStartRequestSchema>;
export type RepairWorkCompletionRequest = z.infer<typeof RepairWorkCompletionRequestSchema>;
export type RepairFallbackDecisionRequest = z.infer<typeof RepairFallbackDecisionRequestSchema>;
export type RepairCustodyEventRequest = z.infer<typeof RepairCustodyEventRequestSchema>;

export type MachineInventoryItem = z.infer<typeof MachineInventoryItemSchema>;
export type RentalCandidate = z.infer<typeof RentalCandidateSchema>;
export type Machine = z.infer<typeof MachineSchema>;
export type MarkMachineReadyRequest = z.infer<typeof MarkMachineReadyRequestSchema>;
export type CreateMachineRequest = z.infer<typeof CreateMachineRequestSchema>;
export type InventorySummary = z.infer<typeof InventorySummarySchema>;
export type MaintenanceSchedule = z.infer<typeof MaintenanceScheduleSchema>;
export type MaintenanceTicket = z.infer<typeof MaintenanceTicketSchema>;
