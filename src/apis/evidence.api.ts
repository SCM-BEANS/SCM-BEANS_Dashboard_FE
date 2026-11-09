import { z } from "zod";
import { axiosClient, DOLORES_API_BASE_URL } from "@/lib/http";
import {
  EvidencePageSchema,
  EvidenceResourceSchema,
  type EvidenceItem,
  type EvidencePage,
  type EvidenceResource,
} from "@/schema/evidence.schema";

const EvidenceParentIdSchema = z.string().uuid();
const EvidenceIdSchema = z.string().uuid();

const EvidenceListParamsSchema = z.object({
  page: z.number().int().nonnegative().default(0),
  size: z.number().int().min(1).max(100).default(50),
}).strict();

export type EvidenceListParams = z.input<typeof EvidenceListParamsSchema>;

const evidenceParentPaths: Record<EvidenceResource, string> = {
  TERMINATION_CASE: "termination-cases",
  DEPOSIT: "billing/deposits",
  MAINTENANCE_TICKET: "maintenance-tickets",
  MAINTENANCE_REQUEST: "maintenance-requests",
  REPAIR_CASE: "repair-cases",
  REPAIR_COST_REVIEW: "repair-cost-reviews",
  REPLACEMENT_ASSIGNMENT: "replacement-assignments",
  BUYBACK_CASE: "buybacks",
  OFFLINE_REVIEW: "offline-violation-reviews",
};

const evidencePath = (resource: EvidenceResource, parentId: string) =>
  `/${evidenceParentPaths[resource]}/${encodeURIComponent(EvidenceParentIdSchema.parse(parentId))}/evidence`;

export const evidenceApi = {
  async list(
    resource: EvidenceResource,
    parentId: string,
    params: EvidenceListParams = {},
    signal?: AbortSignal,
  ): Promise<EvidencePage> {
    const validResource = EvidenceResourceSchema.parse(resource);
    const validParentId = EvidenceParentIdSchema.parse(parentId);
    const query = EvidenceListParamsSchema.parse({
      page: params.page ?? 0,
      size: params.size ?? 50,
    });
    const response = await axiosClient.get<unknown>(evidencePath(validResource, validParentId), {
      baseURL: DOLORES_API_BASE_URL,
      params: query,
      signal,
    });
    const page = EvidencePageSchema.parse(response.data);
    if (page.items.some((item: EvidenceItem) => item.resourceId !== validParentId || item.resourceType !== validResource)) {
      throw new Error("Evidence response does not match the requested resource.");
    }
    return page;
  },
  async download(
    resource: EvidenceResource,
    parentId: string,
    evidenceId: string,
    signal?: AbortSignal,
  ): Promise<Blob> {
    const validResource = EvidenceResourceSchema.parse(resource);
    const validParentId = EvidenceParentIdSchema.parse(parentId);
    const validEvidenceId = EvidenceIdSchema.parse(evidenceId);
    const response = await axiosClient.get<Blob>(
      `${evidencePath(validResource, validParentId)}/${encodeURIComponent(validEvidenceId)}/content`,
      {
        baseURL: DOLORES_API_BASE_URL,
        headers: { Accept: "*/*", "Cache-Control": "no-store" },
        responseType: "blob",
        signal,
      },
    );
    return response.data;
  },
};
