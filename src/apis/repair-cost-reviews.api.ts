import { axiosClient, DOLORES_API_BASE_URL } from "@/lib/http";
import {
  RepairCostAcknowledgementRequestSchema,
  RepairCostDecisionRequestSchema,
  RepairCostDisputeRequestSchema,
  RepairCostProposalRequestSchema,
  RepairCostResolutionRequestSchema,
  RepairCostReviewIdSchema,
  RepairCostReviewSchema,
  type RepairCostDecisionRequest,
  type RepairCostDisputeRequest,
  type RepairCostProposalRequest,
  type RepairCostResolutionRequest,
} from "@/schema/repair-cost-reviews.schema";
import { MaintenanceTicketIdSchema } from "@/schema/machines.schema";
import { buildEvidenceForm, EVIDENCE_MULTIPART_HEADERS, validateEvidenceFiles } from "@/lib/evidence-multipart";

const reviewPath = (reviewId: string) => "/repair-cost-reviews/" + encodeURIComponent(RepairCostReviewIdSchema.parse(reviewId));

function parseReview(data: unknown, reviewId?: string) {
  const review = RepairCostReviewSchema.parse(data);
  if (reviewId && review.id !== reviewId) throw new Error("Dolores returned a different repair-cost review than requested.");
  return review;
}

export const repairCostReviewsApi = {
  async propose(ticketId: string, input: RepairCostProposalRequest, files: File[]) {
    const validTicketId = MaintenanceTicketIdSchema.parse(ticketId);
    const body = RepairCostProposalRequestSchema.parse(input);
    validateEvidenceFiles(files, { min: 1, max: 5 });
    const response = await axiosClient.post<unknown>(
      "/maintenance-tickets/" + encodeURIComponent(validTicketId) + "/repair-cost-reviews",
      buildEvidenceForm(body, files),
      { baseURL: DOLORES_API_BASE_URL, headers: EVIDENCE_MULTIPART_HEADERS },
    );
    const review = parseReview(response.data);
    if (review.maintenanceTicketId !== validTicketId) {
      throw new Error("Dolores returned a repair-cost review for a different maintenance ticket.");
    }
    return review;
  },
  async getById(reviewId: string, signal?: AbortSignal) {
    const validReviewId = RepairCostReviewIdSchema.parse(reviewId);
    const response = await axiosClient.get<unknown>(reviewPath(validReviewId), {
      baseURL: DOLORES_API_BASE_URL,
      signal,
    });
    return parseReview(response.data, validReviewId);
  },
  async decide(reviewId: string, input: RepairCostDecisionRequest) {
    const validReviewId = RepairCostReviewIdSchema.parse(reviewId);
    const body = RepairCostDecisionRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(reviewPath(validReviewId) + "/decision", body, {
      baseURL: DOLORES_API_BASE_URL,
    });
    return parseReview(response.data, validReviewId);
  },
  async acknowledge(reviewId: string) {
    const validReviewId = RepairCostReviewIdSchema.parse(reviewId);
    const body = RepairCostAcknowledgementRequestSchema.parse({ acknowledgeApprovedAmount: true });
    const response = await axiosClient.post<unknown>(reviewPath(validReviewId) + "/acknowledgment", body, {
      baseURL: DOLORES_API_BASE_URL,
    });
    return parseReview(response.data, validReviewId);
  },
  async dispute(reviewId: string, input: RepairCostDisputeRequest, files: File[]) {
    const validReviewId = RepairCostReviewIdSchema.parse(reviewId);
    const body = RepairCostDisputeRequestSchema.parse(input);
    validateEvidenceFiles(files, { min: 1, max: 5 });
    const response = await axiosClient.post<unknown>(
      reviewPath(validReviewId) + "/dispute",
      buildEvidenceForm(body, files),
      { baseURL: DOLORES_API_BASE_URL, headers: EVIDENCE_MULTIPART_HEADERS },
    );
    return parseReview(response.data, validReviewId);
  },
  async resolve(reviewId: string, input: RepairCostResolutionRequest) {
    const validReviewId = RepairCostReviewIdSchema.parse(reviewId);
    const body = RepairCostResolutionRequestSchema.parse(input);
    const response = await axiosClient.post<unknown>(reviewPath(validReviewId) + "/resolution", body, {
      baseURL: DOLORES_API_BASE_URL,
    });
    return parseReview(response.data, validReviewId);
  },
};
