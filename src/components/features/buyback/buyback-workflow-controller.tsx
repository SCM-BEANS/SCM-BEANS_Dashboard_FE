import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { buybacksApi } from "@/apis/buybacks.api";
import { contractsApi } from "@/apis/contracts.api";
import { machineModelsApi } from "@/apis/machine-models.api";
import { profilesApi } from "@/apis/profiles.api";
import { createIdempotencyKey } from "@/lib/idempotency-key";
import { authScopedQuerySubject, getAuthenticatedSubjectId } from "@/lib/query-subject";
import { BuybackIdSchema } from "@/schema/buybacks.schema";
import { MachineModelIdSchema } from "@/schema/machine-models.schema";
import { ProfileIdSchema } from "@/schema/profiles.schema";

export type BuybackWorkflowRole = "owner" | "operator" | "technician";
export type BuybackWorkflowOptions = {
  role: BuybackWorkflowRole;
  initialCaseId?: string;
  listHref?: string;
  operatorRole?: "ADMIN" | "MODERATOR";
  showCreateForm?: boolean;
};

export function useBuybackWorkflowController({ role, initialCaseId, listHref, operatorRole, showCreateForm = true }: BuybackWorkflowOptions) {
  const queryClient = useQueryClient();
  const idempotencyKeys = useRef(new Map<string, { key: string; fingerprint: string }>());
  const paymentProofFingerprints = useRef(new WeakMap<File, string>());
  const subject = authScopedQuerySubject(role === "operator" ? operatorRole ?? role : role.toUpperCase());
  const isModeratorRoute = role === "operator" && operatorRole === "MODERATOR";
  const ownerId = getAuthenticatedSubjectId();
  const [selectedCaseId, setSelectedCaseId] = useState(initialCaseId ?? "");
  const [page, setPage] = useState(0);
  const [proofPage, setProofPage] = useState(0);
  const [createConfirmed, setCreateConfirmed] = useState(false);
  const [currency, setCurrency] = useState("");
  const [condition, setCondition] = useState("");
  const [valuationAmount, setValuationAmount] = useState("");
  const [inspectionNotes, setInspectionNotes] = useState("");
  const [approvedPrice, setApprovedPrice] = useState("");
  const [decisionReason, setDecisionReason] = useState("");
  const [ownerDecisionReason, setOwnerDecisionReason] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [externalReference, setExternalReference] = useState("");
  const [paymentId, setPaymentIdState] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofId, setProofId] = useState("");
  const [proofReviewReason, setProofReviewReason] = useState("");
  const [collectionReason, setCollectionReason] = useState("");
  const [confirmedCollectionSerial, setConfirmedCollectionSerial] = useState("");
  const [collectionLocation, setCollectionLocation] = useState("");
  const [collectionEvidenceReference, setCollectionEvidenceReference] = useState("");
  const [collectionConfirmationReference, setCollectionConfirmationReference] = useState("");
  const [assignmentSearch, setAssignmentSearch] = useState("");
  const [assignmentPage, setAssignmentPage] = useState(0);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState("");
  const [assignmentReason, setAssignmentReason] = useState("");
  const [workPlanned, setWorkPlanned] = useState("");
  const [estimatedPartsCost, setEstimatedPartsCost] = useState("");
  const [workPerformed, setWorkPerformed] = useState("");
  const [workResult, setWorkResult] = useState("");
  const [registrationMachineType, setRegistrationMachineTypeState] = useState<"CONVENTIONAL" | "SMART_IOT">("CONVENTIONAL");
  const [registrationModelId, setRegistrationModelId] = useState("");
  const [registrationRegion, setRegistrationRegion] = useState("");
  const [registrationReason, setRegistrationReason] = useState("");
  const [qaReason, setQaReason] = useState("");
  const [qaPassed, setQaPassed] = useState(true);

  const list = useQuery({
    queryKey: ["dolores", role, "buybacks", subject, page],
    queryFn: ({ signal }) => buybacksApi.list({ page, size: 20 }, signal),
    enabled: !(isModeratorRoute && Boolean(initialCaseId)),
    retry: false,
  });
  const detailId = isModeratorRoute ? initialCaseId ?? "" : selectedCaseId || initialCaseId || "";
  const detailValid = BuybackIdSchema.safeParse(detailId).success;
  const detail = useQuery({
    queryKey: ["dolores", role, "buyback", subject, detailId],
    queryFn: ({ signal }) => buybacksApi.getById(detailId, signal),
    enabled: detailValid,
    retry: false,
  });
  const caseData = detail.data;
  const isExternalBuyback = caseData?.workflowVersion === 2;
  const [paymentIdCaseId, setPaymentIdCaseId] = useState("");
  const setPaymentIdForCase = (caseId: string, value: string) => {
    setPaymentIdState(value);
    setPaymentIdCaseId(caseId);
    if (typeof window !== "undefined" && caseId) {
      try {
        const key = `buyback-payment-id:${caseId}`;
        if (value.trim()) window.sessionStorage.setItem(key, value.trim());
        else window.sessionStorage.removeItem(key);
      } catch {
        // Keep the form usable when browser storage is blocked; the ID remains editable here.
      }
    }
  };
  const updatePaymentId = (value: string) => setPaymentIdForCase(detailId, value);
  useEffect(() => {
    if (!detailId || typeof window === "undefined") return;
    let cached = "";
    try {
      cached = window.sessionStorage.getItem(`buyback-payment-id:${detailId}`) ?? "";
    } catch {
      // The payment ID can still be pasted into the form when session storage is unavailable.
    }
    setPaymentIdState(cached);
    setPaymentIdCaseId(detailId);
    setPaymentMethod("");
    setExternalReference("");
    setProofFile(null);
    setProofId("");
    setProofReviewReason("");
    setCollectionReason("");
    setConfirmedCollectionSerial("");
    setCollectionLocation("");
    setCollectionEvidenceReference("");
    setCollectionConfirmationReference("");
    setSelectedAssigneeId("");
    setAssignmentReason("");
    setWorkPlanned("");
    setEstimatedPartsCost("");
    setWorkPerformed("");
    setWorkResult("");
    setRegistrationMachineTypeState("CONVENTIONAL");
    setRegistrationModelId("");
    setRegistrationRegion("");
    setRegistrationReason("");
  }, [detailId]);
  const scopedPaymentId = paymentIdCaseId === detailId ? paymentId : "";
  const paymentProofs = useQuery({
    queryKey: ["dolores", role, "buyback-payment-proofs", subject, detailId, proofPage],
    queryFn: ({ signal }) => buybacksApi.listPaymentProofs(detailId, proofPage, 50, signal),
    enabled: detailValid && Boolean(caseData) && (
      role === "owner"
      || (role === "operator" && (operatorRole === "ADMIN" || caseData?.responsibleModeratorId === ownerId))
    ),
    retry: false,
  });
  const contracts = useQuery({
    queryKey: ["dolores", "owner", "buyback-contracts", subject],
    queryFn: ({ signal }) => contractsApi.listByOwner(ownerId!, signal),
    enabled: role === "owner" && showCreateForm && !detailId && Boolean(ownerId),
    retry: false,
  });
  const hasActiveContract = contracts.data?.some((item) => item.status === "ACTIVE") ?? false;
  const canAssignInspection = Boolean(
    role === "operator"
      && operatorRole === "MODERATOR"
      && caseData != null
      && isExternalBuyback
      && caseData.contractId == null
      && caseData.status === "REQUESTED"
      && caseData.responsibleModeratorId === ownerId
      && !caseData.inspectionTechnicianId,
  );
  const canCancelExternalBuyback = Boolean(
    role === "operator"
      && isModeratorRoute
      && isExternalBuyback
      && caseData
      && caseData.contractId == null
      && caseData.responsibleModeratorId === ownerId
      && ["REQUESTED", "INSPECTION_PENDING", "VALUATION_PENDING", "APPROVED", "COLLECTION_PENDING"].includes(caseData.status),
  );
  const canRequestCollection = Boolean(
    role === "operator"
      && isExternalBuyback
      && caseData?.status === "APPROVED"
      && caseData.ownerAccepted === true
      && Number(caseData.acceptedPrice) > 0
      && Number(caseData.acceptedPrice) === Number(caseData.approvedPrice)
      && (operatorRole === "ADMIN" || caseData.responsibleModeratorId === ownerId),
  );
  const canAssignCollection = Boolean(
    role === "operator"
      && operatorRole === "MODERATOR"
      && isExternalBuyback
      && caseData?.status === "COLLECTION_PENDING"
      && caseData.responsibleModeratorId === ownerId
      && !caseData.collectionTechnicianId,
  );
  const canConfirmCollection = Boolean(
    role === "operator"
      && isExternalBuyback
      && caseData?.status === "COLLECTION_PENDING"
      && caseData.collectionEvidenceRecorded
      && (operatorRole === "ADMIN" || caseData.responsibleModeratorId === ownerId),
  );
  const canManageExternalPayment = Boolean(
    role === "operator"
      && isExternalBuyback
      && (operatorRole === "ADMIN" || caseData?.responsibleModeratorId === ownerId),
  );
  const canAssignRefurbishment = Boolean(
    role === "operator"
      && operatorRole === "MODERATOR"
      && isExternalBuyback
      && caseData?.status === "PAID"
      && caseData.responsibleModeratorId === ownerId
      && !caseData.refurbishmentTechnicianId,
  );
  const canRegisterMachine = Boolean(
    role === "operator"
      && operatorRole === "MODERATOR"
      && isExternalBuyback
      && caseData?.status === "READY_FOR_REGISTRATION"
      && caseData.responsibleModeratorId === ownerId
      && !caseData.registeredMachineId,
  );
  const canStartRefurbishment = Boolean(
    role === "technician"
      && isExternalBuyback
      && caseData?.status === "PAID"
      && caseData.refurbishmentTechnicianId === ownerId,
  );
  const canCompleteRefurbishment = Boolean(
    role === "technician"
      && isExternalBuyback
      && caseData?.status === "REFURBISHING"
      && caseData.refurbishmentTechnicianId === ownerId,
  );
  const machineModels = useQuery({
    queryKey: ["dolores", "buyback-registration-models", subject],
    queryFn: ({ signal }) => machineModelsApi.list(signal),
    enabled: canRegisterMachine,
    retry: false,
  });
  const eligibleRegistrationModels = (machineModels.data ?? []).filter(
    (model) => model.active && model.machineType === registrationMachineType,
  );
  const setRegistrationMachineType = (value: "CONVENTIONAL" | "SMART_IOT") => {
    setRegistrationMachineTypeState(value);
    setRegistrationModelId("");
  };
  const canAssignModerator = Boolean(
    role === "operator"
      && operatorRole === "ADMIN"
      && caseData != null
      && isExternalBuyback
      && caseData.contractId == null
      && caseData.status === "REQUESTED"
      && !caseData.responsibleModeratorId,
  );
  const assignmentRole = canAssignInspection
    ? "INSPECTION_TECHNICIAN"
    : canAssignCollection
      ? "COLLECTION_TECHNICIAN"
      : canAssignRefurbishment
        ? "REFURBISHMENT_TECHNICIAN"
        : canAssignModerator
          ? "MODERATOR"
          : null;
  const assignmentProfileRole = assignmentRole === "MODERATOR" ? "MODERATOR" : assignmentRole ? "TECHNICIAN" : null;
  const assignmentProfiles = useQuery({
    queryKey: ["dolores", "profiles", subject, "buyback-assignment", assignmentProfileRole, assignmentSearch, assignmentPage],
    queryFn: ({ signal }) => profilesApi.list({
      role: assignmentProfileRole ?? undefined,
      status: "ACTIVE",
      q: assignmentSearch.trim() || undefined,
      page: assignmentPage,
      size: 20,
    }, signal),
    enabled: Boolean(assignmentRole),
    retry: false,
  });
  const eligibleAssignees = (assignmentProfiles.data?.items ?? []).filter((profile) =>
    profile.status === "ACTIVE"
      && profile.emailVerified
      && Boolean(assignmentProfileRole && profile.roles.includes(assignmentProfileRole)),
  );
  const operationKey = (action: string, resourceId = "new", fingerprint = "") => {
    const scope = `${action}:${resourceId}`;
    let entry = idempotencyKeys.current.get(scope);
    if (!entry || entry.fingerprint !== fingerprint) {
      entry = { key: createIdempotencyKey(), fingerprint };
      idempotencyKeys.current.set(scope, entry);
    }
    return entry.key;
  };
  const clearOperationKey = (action: string, resourceId = "new") => {
    idempotencyKeys.current.delete(`${action}:${resourceId}`);
  };
  const paymentProofOperationKey = (caseId: string, id: string, file: File) => {
    let fingerprint = paymentProofFingerprints.current.get(file);
    if (!fingerprint) {
      fingerprint = createIdempotencyKey();
      paymentProofFingerprints.current.set(file, fingerprint);
    }
    return operationKey("payment-proof", `${caseId}:${id}`, fingerprint);
  };
  const invalidate = async (caseId = detailId) => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["dolores", role, "buybacks", subject] }),
    ...(caseId ? [queryClient.invalidateQueries({ queryKey: ["dolores", role, "buyback", subject, caseId] })] : []),
    ...(caseId ? [queryClient.invalidateQueries({ queryKey: ["dolores", role, "buyback-payment-proofs", subject, caseId] })] : []),
  ]);

  const create = useMutation({
    mutationFn: (input: Parameters<typeof buybacksApi.create>[0]) => buybacksApi.create(input),
    onSuccess: async (value) => { clearOperationKey("create"); setSelectedCaseId(value.id); setProofPage(0); await invalidate(value.id); },
  });
  const assignInspection = useMutation({
    mutationFn: (input: Parameters<typeof buybacksApi.assignInspection>[1] & { id: string }) => {
      const { id, ...request } = input;
      const technicianId = ProfileIdSchema.parse(input.technicianId);
      const eligible = canAssignInspection && eligibleAssignees.some((profile) => profile.idaasUserId === technicianId);
      if (!eligible) throw new Error("Chỉ Moderator phụ trách mới được giao Technician đang hoạt động và đã xác minh email.");
      return buybacksApi.assignInspection(id, { ...request, technicianId });
    },
    onSuccess: (_, input) => {
      clearOperationKey("inspection-assign", input.id);
      setSelectedAssigneeId("");
      setAssignmentReason("");
    },
    onSettled: (_, __, input) => invalidate(input.id),
  });
  const assignCollection = useMutation({
    mutationFn: (input: Parameters<typeof buybacksApi.assignCollection>[1] & { id: string }) => {
      const { id, ...request } = input;
      const technicianId = ProfileIdSchema.parse(input.technicianId);
      const eligible = canAssignCollection && eligibleAssignees.some((profile) => profile.idaasUserId === technicianId);
      if (!eligible) throw new Error("Chỉ Moderator phụ trách mới được giao Technician thu máy đang hoạt động và đã xác minh email.");
      return buybacksApi.assignCollection(id, { ...request, technicianId });
    },
    onSuccess: (_, input) => {
      clearOperationKey("collection-assign", input.id);
      setSelectedAssigneeId("");
      setAssignmentReason("");
    },
    onSettled: (_, __, input) => invalidate(input.id),
  });
  const assignRefurbishment = useMutation({
    mutationFn: (input: Parameters<typeof buybacksApi.assignRefurbishment>[1] & { id: string }) => {
      const { id, ...request } = input;
      const technicianId = ProfileIdSchema.parse(input.technicianId);
      const eligible = canAssignRefurbishment && eligibleAssignees.some((profile) => profile.idaasUserId === technicianId);
      if (!eligible) throw new Error("Chỉ Moderator phụ trách mới được giao Technician tân trang đang hoạt động và đã xác minh email.");
      return buybacksApi.assignRefurbishment(id, { ...request, technicianId });
    },
    onSuccess: (_, input) => {
      clearOperationKey("refurbishment-assign", input.id);
      setSelectedAssigneeId("");
      setAssignmentReason("");
    },
    onSettled: (_, __, input) => invalidate(input.id),
  });
  const assignModerator = useMutation({
    mutationFn: (input: Parameters<typeof buybacksApi.assignModerator>[1] & { id: string }) => {
      const { id, ...request } = input;
      const moderatorId = ProfileIdSchema.parse(input.moderatorId);
      const eligible = canAssignModerator && eligibleAssignees.some((profile) => profile.idaasUserId === moderatorId);
      if (!eligible) throw new Error("Chỉ Admin mới được giao hồ sơ cho Moderator đang hoạt động và đã xác minh email.");
      return buybacksApi.assignModerator(id, { ...request, moderatorId });
    },
    onSuccess: (_, input) => {
      clearOperationKey("moderator-assign", input.id);
      setSelectedAssigneeId("");
      setAssignmentReason("");
    },
    onSettled: (_, __, input) => invalidate(input.id),
  });
  const decideOwnerPrice = useMutation({
    mutationFn: (input: Parameters<typeof buybacksApi.decideOwnerPrice>[1] & { id: string }) => buybacksApi.decideOwnerPrice(input.id, input),
    onSuccess: (_, input) => clearOperationKey(`owner-decision-${input.accepted ? "accept" : "reject"}`, input.id),
    onSettled: (_, __, input) => invalidate(input.id),
  });
  const cancelBuyback = useMutation({
    mutationFn: (input: { id: string; reason: string; idempotencyKey: string; correlationId: string }) => {
      if (!canCancelExternalBuyback) throw new Error("Chỉ Moderator phụ trách mới có thể hủy hồ sơ thu mua đủ điều kiện.");
      return buybacksApi.cancel(input.id, input);
    },
    onSuccess: (_, input) => {
      clearOperationKey("buyback-cancel", input.id);
    },
    onSettled: (_, __, input) => invalidate(input.id),
  });
  const startInspection = useMutation({ mutationFn: (input: { id: string; reason: string; idempotencyKey: string; correlationId: string }) => buybacksApi.startInspection(input.id, input), onSuccess: (_, input) => clearOperationKey("inspection-start", input.id), onSettled: () => invalidate() });
  const submitInspection = useMutation({ mutationFn: (input: Parameters<typeof buybacksApi.submitInspection>[1] & { id: string }) => buybacksApi.submitInspection(input.id, input), onSuccess: (_, input) => clearOperationKey("inspection-submit", input.id), onSettled: () => invalidate() });
  const decideValuation = useMutation({ mutationFn: (input: Parameters<typeof buybacksApi.decideValuation>[1] & { id: string }) => buybacksApi.decideValuation(input.id, input), onSuccess: (_, input) => clearOperationKey("valuation-decision", input.id), onSettled: () => invalidate() });
  const createPayment = useMutation({
    mutationFn: (input: Parameters<typeof buybacksApi.createPayment>[1] & { id: string }) => buybacksApi.createPayment(input.id, input),
    onSuccess: (payment, input) => { clearOperationKey("create-payment", input.id); setPaymentIdForCase(input.id, payment.id); },
    onSettled: (_, __, input) => invalidate(input.id),
  });
  const submitProof = useMutation({
    mutationFn: (input: { id: string; paymentId: string; key: string; correlationId: string; file: File }) => buybacksApi.submitPaymentProof(input.id, input.paymentId, input.key, input.correlationId, input.file),
    onSuccess: (proof, input) => { clearOperationKey("payment-proof", `${input.id}:${input.paymentId}`); setProofId(proof.id); setProofFile(null); },
    onSettled: (_, __, input) => invalidate(input.id),
  });
  const reviewProof = useMutation({
    mutationFn: (input: Parameters<typeof buybacksApi.reviewPaymentProof>[1] & { caseId: string; proofId: string; approved: boolean }) => {
      const { caseId, proofId, ...request } = input;
      return buybacksApi.reviewPaymentProof(proofId, request);
    },
    onSuccess: (_, input) => clearOperationKey(`proof-review-${input.approved ? "approve" : "reject"}`, input.proofId),
    onSettled: (_, __, input) => invalidate(input.caseId),
  });
  const requestCollection = useMutation({ mutationFn: (input: Parameters<typeof buybacksApi.requestCollection>[1] & { id: string }) => buybacksApi.requestCollection(input.id, input), onSuccess: (_, input) => clearOperationKey("collection-request", input.id), onSettled: (_, __, input) => invalidate(input.id) });
  const recordCollectionEvidence = useMutation({
    mutationFn: (input: Parameters<typeof buybacksApi.recordCollectionEvidence>[1] & { id: string }) => {
      const { id, ...request } = input;
      if (role !== "technician" || !caseData || caseData.collectionTechnicianId !== ownerId || caseData.status !== "COLLECTION_PENDING") {
        throw new Error("Chỉ Technician được giao mới có thể ghi bằng chứng thu máy cho hồ sơ này.");
      }
      return buybacksApi.recordCollectionEvidence(id, request);
    },
    onSuccess: (_, input) => {
      clearOperationKey("collection-evidence", input.id);
      setCollectionEvidenceReference("");
    },
    onSettled: (_, __, input) => invalidate(input.id),
  });
  const confirmCollection = useMutation({
    mutationFn: (input: Parameters<typeof buybacksApi.confirmCollection>[1] & { id: string }) => {
      if (!canConfirmCollection) throw new Error("Chỉ Operator được quyền xác nhận sau khi Dolores ghi nhận bằng chứng thu máy.");
      const { id, ...request } = input;
      return buybacksApi.confirmCollection(id, request);
    },
    onSuccess: (_, input) => {
      clearOperationKey("collection-confirm", input.id);
      setCollectionConfirmationReference("");
    },
    onSettled: (_, __, input) => invalidate(input.id),
  });
  const startRefurbishment = useMutation({
    mutationFn: (input: Parameters<typeof buybacksApi.startRefurbishment>[1] & { id: string }) => {
      if (isExternalBuyback && !canStartRefurbishment) throw new Error("Chỉ Technician được giao mới có thể bắt đầu tân trang hồ sơ này.");
      return buybacksApi.startRefurbishment(input.id, input);
    },
    onSuccess: (_, input) => clearOperationKey("refurbishment-start", input.id),
    onSettled: (_, __, input) => invalidate(input.id),
  });
  const completeRefurbishment = useMutation({
    mutationFn: (input: Parameters<typeof buybacksApi.completeRefurbishment>[1] & { id: string }) => {
      if (isExternalBuyback && !canCompleteRefurbishment) throw new Error("Chỉ Technician được giao mới có thể hoàn tất tân trang hồ sơ này.");
      return buybacksApi.completeRefurbishment(input.id, input);
    },
    onSuccess: (_, input) => clearOperationKey("refurbishment-complete", input.id),
    onSettled: (_, __, input) => invalidate(input.id),
  });
  const registerMachine = useMutation({
    mutationFn: (input: Parameters<typeof buybacksApi.registerMachine>[1] & { id: string }) => {
      const { id, ...request } = input;
      const modelId = MachineModelIdSchema.parse(input.modelId);
      if (!canRegisterMachine || !eligibleRegistrationModels.some((model) => model.id === modelId)) {
        throw new Error("Chỉ Moderator phụ trách được đăng ký với model đang hoạt động từ danh mục Dolores.");
      }
      return buybacksApi.registerMachine(id, { ...request, modelId });
    },
    onSuccess: (_, input) => {
      clearOperationKey("machine-register", input.id);
      setRegistrationReason("");
    },
    onSettled: (_, __, input) => invalidate(input.id),
  });
  const decideQa = useMutation({ mutationFn: (input: Parameters<typeof buybacksApi.decideQa>[1] & { id: string }) => buybacksApi.decideQa(input.id, input), onSuccess: (_, input) => clearOperationKey("qa-decision", input.id), onSettled: () => invalidate() });
  const downloadProof = useMutation({
    mutationFn: (input: string | { id: string; filename: string }) => buybacksApi.downloadPaymentProofContent(typeof input === "string" ? input : input.id),
    onSuccess: ({ blob }, input) => { const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = typeof input === "string" ? "buyback-payment-proof" : input.filename; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); },
  });

  const submitCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!createConfirmed || !hasActiveContract) return;
    const key = operationKey("create");
    create.mutate({ idempotencyKey: key, correlationId: key });
  };
  const perform = (run: () => void) => (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); run(); };
  const commonError = [assignInspection, assignCollection, assignRefurbishment, assignModerator, decideOwnerPrice, cancelBuyback, startInspection, submitInspection, decideValuation, createPayment, submitProof, reviewProof, requestCollection, recordCollectionEvidence, confirmCollection, startRefurbishment, completeRefurbishment, registerMachine, decideQa, downloadProof].find((mutation) => mutation.isError);
  const backHref = listHref ?? "/dashboard/buyback";
  const createFormOpen = role === "owner" && showCreateForm && !detailId;
  const showList = !createFormOpen && !(isModeratorRoute && Boolean(detailId));
  const setAssignmentSearchAndReset = (value: string) => {
    setAssignmentSearch(value);
    setAssignmentPage(0);
    setSelectedAssigneeId("");
  };
  const goToAssignmentPage = (nextPage: number) => {
    const lastPage = Math.max(0, (assignmentProfiles.data?.totalPages ?? 1) - 1);
    setAssignmentPage(Math.min(lastPage, Math.max(0, nextPage)));
    setSelectedAssigneeId("");
  };
  const ownerDecisionAvailable = Boolean(caseData && role === "owner" && (
    (isExternalBuyback && caseData.status === "APPROVED" && Number(caseData.approvedPrice) > 0 && caseData.ownerAccepted == null)
    || (!isExternalBuyback && caseData.status === "VALUATION_PENDING" && caseData.proposedPrice != null)
  ));
  return {
    role,
    operatorRole,
    initialCaseId,
    isModeratorRoute,
    ownerId,
    list,
    detail,
    paymentProofs,
    contracts,
    hasActiveContract,
    canAssignInspection,
    canCancelExternalBuyback,
    canAssignModerator,
    canRequestCollection,
    canAssignCollection,
    canConfirmCollection,
    canManageExternalPayment,
    canAssignRefurbishment,
    canRegisterMachine,
    canStartRefurbishment,
    canCompleteRefurbishment,
    assignmentRole,
    assignmentProfileRole,
    assignmentProfiles,
    eligibleAssignees,
    assignmentSearch,
    setAssignmentSearch: setAssignmentSearchAndReset,
    assignmentPage,
    goToAssignmentPage,
    selectedAssigneeId,
    setSelectedAssigneeId,
    assignmentReason,
    setAssignmentReason,
    selectedCaseId,
    setSelectedCaseId,
    page,
    setPage,
    proofPage,
    setProofPage,
    createConfirmed,
    setCreateConfirmed,
    currency,
    setCurrency,
    condition,
    setCondition,
    valuationAmount,
    setValuationAmount,
    inspectionNotes,
    setInspectionNotes,
    approvedPrice,
    setApprovedPrice,
    decisionReason,
    setDecisionReason,
    ownerDecisionReason,
    setOwnerDecisionReason,
    paymentMethod,
    setPaymentMethod,
    externalReference,
    setExternalReference,
    paymentId: scopedPaymentId,
    setPaymentId: updatePaymentId,
    paymentProofOperationKey,
    proofFile,
    setProofFile,
    proofId,
    setProofId,
    proofReviewReason,
    setProofReviewReason,
    collectionReason,
    setCollectionReason,
    confirmedCollectionSerial,
    setConfirmedCollectionSerial,
    collectionLocation,
    setCollectionLocation,
    collectionEvidenceReference,
    setCollectionEvidenceReference,
    collectionConfirmationReference,
    setCollectionConfirmationReference,
    workPlanned,
    setWorkPlanned,
    estimatedPartsCost,
    setEstimatedPartsCost,
    workPerformed,
    setWorkPerformed,
    workResult,
    setWorkResult,
    registrationMachineType,
    setRegistrationMachineType,
    registrationModelId,
    setRegistrationModelId,
    registrationRegion,
    setRegistrationRegion,
    registrationReason,
    setRegistrationReason,
    machineModels,
    eligibleRegistrationModels,
    qaReason,
    setQaReason,
    qaPassed,
    setQaPassed,
    caseData,
    detailId,
    detailValid,
    operationKey,
    clearOperationKey,
    invalidate,
    create,
    assignInspection,
    assignCollection,
    assignRefurbishment,
    assignModerator,
    decideOwnerPrice,
    cancelBuyback,
    startInspection,
    submitInspection,
    decideValuation,
    createPayment,
    submitProof,
    reviewProof,
    requestCollection,
    recordCollectionEvidence,
    confirmCollection,
    startRefurbishment,
    completeRefurbishment,
    registerMachine,
    decideQa,
    downloadProof,
    submitCreate,
    perform,
    commonError,
    backHref,
    createFormOpen,
    showList,
    isExternalBuyback,
    ownerDecisionAvailable,
  };
}

export type BuybackWorkflowController = ReturnType<typeof useBuybackWorkflowController>;
