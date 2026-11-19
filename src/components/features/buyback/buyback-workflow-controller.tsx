import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { readAllPages } from "@/lib/read-all-pages";
import { useRouter } from "next/router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { buybacksApi } from "@/apis/buybacks.api";
import { evidenceApi } from "@/apis/evidence.api";
import { contractsApi } from "@/apis/contracts.api";
import { machineModelsApi } from "@/apis/machine-models.api";
import { profilesApi } from "@/apis/profiles.api";
import { createIdempotencyKey } from "@/lib/idempotency-key";
import { authScopedQuerySubject, getAuthenticatedSubjectId } from "@/lib/query-subject";
import { BuybackIdSchema, BuybackSerialSchema, type BuybackCase } from "@/schema/buybacks.schema";
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
  const router = useRouter();
  const queryClient = useQueryClient();
  const idempotencyKeys = useRef(new Map<string, { key: string; fingerprint: string }>());
  const fileFingerprints = useRef(new WeakMap<File, string>());
  const subject = authScopedQuerySubject(role === "operator" ? operatorRole ?? role : role.toUpperCase());
  const isModeratorRoute = role === "operator" && operatorRole === "MODERATOR";
  const ownerId = getAuthenticatedSubjectId();
  const routeCaseId = typeof router.query.caseId === "string" ? router.query.caseId : "";
  const [selectedCaseId, setSelectedCaseId] = useState(initialCaseId ?? routeCaseId);
  const [page, setPage] = useState(0);
  const [listFilterDraft, setListFilterDraft] = useState({ search: "", status: "" as BuybackCase["status"] | "" });
  const [listFilters, setListFilters] = useState(listFilterDraft);
  const [proofPage, setProofPage] = useState(0);
  const [createConfirmed, setCreateConfirmed] = useState(false);
  const [serialNumber, setSerialNumber] = useState("");
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

  useEffect(() => {
    if (initialCaseId || !router.isReady) return;
    setSelectedCaseId(routeCaseId);
  }, [initialCaseId, routeCaseId, router.isReady]);

  const list = useQuery({
    queryKey: ["dolores", role, "buybacks", subject, page, role === "technician" ? 20 : 10, listFilters],
    queryFn: async ({ signal }) => {
      const status = listFilters.status || undefined;
      if (!listFilters.search) return buybacksApi.list({ page, size: role === "technician" ? 20 : 10, ...(status ? { status } : {}) }, signal);
      // shortcut: API chưa hỗ trợ tìm kiếm hồ sơ; chuyển sang tìm phía server khi API hỗ trợ.
      const all = await readAllPages((index) => buybacksApi.list({ page: index, size: 100, ...(status ? { status } : {}) }, signal));
      const search = listFilters.search.toLocaleLowerCase("vi-VN");
      const items = all.filter((item) => [item.id, item.machineSerialNumber, item.assetSerial, item.machineModelName, item.assetModelLabel].some((value) => typeof value === "string" && value.toLocaleLowerCase("vi-VN").includes(search)));
      return { items: items.slice(page * 10, page * 10 + 10), page, size: 10, hasNext: (page + 1) * 10 < items.length };
    },
    enabled: !(isModeratorRoute && Boolean(initialCaseId))
      && !(role === "technician" && Boolean(initialCaseId)),
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
  const caseData = detail.isError ? undefined : detail.data;
  const isExternalBuyback = caseData?.workflowVersion === 2;
  const isResponsibleModerator = isModeratorRoute && Boolean(ownerId && caseData?.responsibleModeratorId === ownerId);
  const canOperateCase = operatorRole === "ADMIN" || isResponsibleModerator;
  const collectionSerialVerified = Boolean(caseData?.collectionEvidenceRecorded && caseData.intakeSerial
    && caseData.assetSerial?.toUpperCase() === caseData.intakeSerial.toUpperCase());
  const canDecideValuation = Boolean(role === "operator" && caseData?.status === "VALUATION_PENDING"
    && (!isExternalBuyback || canOperateCase));
  const [paymentIdCaseId, setPaymentIdCaseId] = useState("");
  const setPaymentIdForCase = (caseId: string, value: string) => {
    setPaymentIdState(value);
    setPaymentIdCaseId(caseId);
    if (typeof window !== "undefined" && caseId) {
      try {
        const key = `buyback-payment-id:${subject}:${caseId}`;
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
      cached = window.sessionStorage.getItem(`buyback-payment-id:${subject}:${detailId}`)
        ?? window.sessionStorage.getItem(`buyback-payment-id:${detailId}`) ?? "";
    } catch {
      // The payment ID can still be pasted into the form when session storage is unavailable.
    }
    setPaymentIdState(cached);
    setPaymentIdCaseId(detailId);
    setPaymentMethod("");
    setExternalReference("");
    setProofFile(null);
    setProofPage(0);
    setProofId("");
    setProofReviewReason("");
    setCondition("");
    setValuationAmount("");
    setInspectionNotes("");
    setCurrency("");
    setApprovedPrice("");
    setDecisionReason("");
    setOwnerDecisionReason("");
    setCollectionReason("");
    setConfirmedCollectionSerial("");
    setCollectionLocation("");
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
  }, [detailId, subject]);
  const scopedPaymentId = paymentIdCaseId === detailId ? paymentId : "";
  const paymentProofs = useQuery({
    queryKey: ["dolores", role, "buyback-payment-proofs", subject, detailId, proofPage],
    queryFn: ({ signal }) => buybacksApi.listPaymentProofs(detailId, proofPage, 50, signal),
    enabled: detailValid && Boolean(caseData) && (
      role === "owner"
      || (role === "operator" && canOperateCase)
    ),
    retry: false,
  });
  const proofPaymentId = paymentProofs.data?.items.find((proof) =>
    proof.status === "OWNER_NOT_RECEIVED" || proof.status === "SUBMITTED")?.paymentId;
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
      && ["REQUESTED", "INSPECTION_PENDING"].includes(caseData.status)
      && isResponsibleModerator,
  );
  const canCancelExternalBuyback = Boolean(
    role === "operator"
      && canOperateCase
      && isExternalBuyback
      && caseData
      && ["REQUESTED", "INSPECTION_PENDING", "VALUATION_PENDING", "APPROVED", "COLLECTION_PENDING"].includes(caseData.status),
  );
  const canRequestCollection = Boolean(
    role === "operator"
      && isExternalBuyback
      && caseData?.status === "APPROVED"
      && caseData.ownerAccepted === true
      && Number(caseData.acceptedPrice) > 0
      && Number(caseData.acceptedPrice) === Number(caseData.approvedPrice)
      && canOperateCase,
  );
  const canAssignCollection = Boolean(
    role === "operator"
      && operatorRole === "MODERATOR"
      && isExternalBuyback
      && caseData?.status === "COLLECTION_PENDING"
      && isResponsibleModerator
  );
  const canConfirmCollection = Boolean(
    role === "operator"
      && isExternalBuyback
      && caseData?.status === "COLLECTION_PENDING"
      && caseData.collectionTechnicianId
      && collectionSerialVerified
      && canOperateCase,
  );
  const canVerifyCollectionSerial = Boolean(role === "technician" && isExternalBuyback && ownerId && caseData
    && caseData.collectionTechnicianId === ownerId && !caseData.collectionEvidenceRecorded
    && (caseData.status === "COLLECTION_PENDING" || (
      (caseData.serialRevision ?? 0) > 0 && caseData.collectedAt
      && ["COLLECTED", "PAYMENT_PENDING", "PAID", "REFURBISHING", "READY_FOR_REGISTRATION"].includes(caseData.status)
    )));
  const collectionEvidence = useQuery({
    queryKey: ["dolores", role, "buyback-collection-evidence", subject, detailId, caseData?.serialRevision],
    queryFn: ({ signal }) => evidenceApi.list("BUYBACK_CASE", detailId, { purpose: "BUYBACK_COLLECTION", size: 1 }, signal),
    enabled: canConfirmCollection && !detail.isFetching && !detail.isError,
    retry: false,
  });
  const canManageExternalPayment = Boolean(
    role === "operator"
      && isExternalBuyback
      && canOperateCase,
  );
  const refurbishmentOpen = caseData?.refurbishment?.status === "OPEN";
  const canOpenRefurbishment = caseData?.status === "PAID"
    || (caseData?.status === "REFURBISHING" && Boolean(caseData.refurbishment) && !refurbishmentOpen);
  const canAssignRefurbishment = Boolean(
    role === "operator"
      && operatorRole === "MODERATOR"
      && isExternalBuyback
      && canOpenRefurbishment
      && isResponsibleModerator,
  );
  const canRegisterMachine = Boolean(
    role === "operator"
      && operatorRole === "MODERATOR"
      && isExternalBuyback
      && caseData?.status === "READY_FOR_REGISTRATION"
      && isResponsibleModerator
      && collectionSerialVerified
      && !caseData.registeredMachineId,
  );
  const canStartRefurbishment = Boolean(
    role === "technician"
      && isExternalBuyback
      && canOpenRefurbishment
      && Boolean(ownerId && caseData?.refurbishmentTechnicianId === ownerId),
  );
  const canCompleteRefurbishment = Boolean(
    role === "technician"
      && isExternalBuyback
      && caseData?.status === "REFURBISHING"
      && refurbishmentOpen
      && ownerId
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
  const fileFingerprint = (file: File) => {
    let fingerprint = fileFingerprints.current.get(file);
    if (!fingerprint) {
      fingerprint = createIdempotencyKey();
      fileFingerprints.current.set(file, fingerprint);
    }
    return fingerprint;
  };
  const paymentProofOperationKey = (caseId: string, id: string, file: File) =>
    operationKey("payment-proof", `${caseId}:${id}`, fileFingerprint(file));
  const invalidate = async (caseId = detailId) => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["dolores", role, "buybacks", subject] }),
    ...(caseId ? [queryClient.invalidateQueries({ queryKey: ["dolores", role, "buyback", subject, caseId] })] : []),
    ...(caseId ? [queryClient.invalidateQueries({ queryKey: ["dolores", role, "buyback-payment-proofs", subject, caseId] })] : []),
    ...(caseId ? [queryClient.invalidateQueries({ queryKey: ["dolores", role, "buyback-collection-evidence", subject, caseId] })] : []),
    ...(caseId ? [queryClient.invalidateQueries({ queryKey: ["dolores", "evidence", "BUYBACK_CASE", caseId] })] : []),
    ...(caseId && role === "owner" ? [queryClient.invalidateQueries({ queryKey: ["dolores", "dashboard", "action-items", subject] })] : []),
  ]);

  const create = useMutation({
    mutationFn: (input: Parameters<typeof buybacksApi.create>[0]) => buybacksApi.create(input),
    onSuccess: async (value) => {
      clearOperationKey("create");
      setSelectedCaseId(value.id);
      setSerialNumber("");
      setCreateConfirmed(false);
      await invalidate(value.id);
      void router.replace(`${listHref ?? "/dashboard/buyback"}?caseId=${encodeURIComponent(value.id)}`);
    },
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
      if (!eligible) throw new Error("Chọn kỹ thuật viên thu máy đang hoạt động và đã xác minh email.");
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
      if (!canCancelExternalBuyback) throw new Error("Hồ sơ này không đủ điều kiện hủy.");
      return buybacksApi.cancel(input.id, input);
    },
    onSuccess: (_, input) => {
      clearOperationKey("buyback-cancel", input.id);
    },
    onSettled: (_, __, input) => invalidate(input.id),
  });
  const startInspection = useMutation({ mutationFn: (input: { id: string; reason: string; idempotencyKey: string; correlationId: string }) => buybacksApi.startInspection(input.id, input), onSuccess: (_, input) => clearOperationKey("inspection-start", input.id), onSettled: () => invalidate() });
  const submitInspection = useMutation({ mutationFn: (input: Parameters<typeof buybacksApi.submitInspection>[1] & { id: string; files: File[] }) => { const { id, files, ...request } = input; return buybacksApi.submitInspection(id, request, files); }, onSuccess: (_, input) => clearOperationKey("inspection-submit", input.id), onSettled: () => invalidate() });
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
  const respondToReceipt = useMutation({
    mutationFn: ({ proofId, received }: { proofId: string; received: boolean }) => {
      const key = operationKey("owner-receipt", proofId, String(received));
      return buybacksApi.respondToOwnerPaymentReceipt(proofId, { received, idempotencyKey: key, correlationId: key });
    },
    onSuccess: (_, input) => clearOperationKey("owner-receipt", input.proofId),
    onSettled: () => invalidate(),
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
    mutationFn: (input: Parameters<typeof buybacksApi.recordCollectionEvidence>[1] & { id: string; files: File[] }) => {
      const { id, files, ...request } = input;
      if (!canVerifyCollectionSerial || caseData?.id !== id) {
        throw new Error("Chỉ Technician được giao mới có thể ghi bằng chứng thu máy cho hồ sơ này.");
      }
      return buybacksApi.recordCollectionEvidence(id, request, files);
    },
    onSuccess: (_, input) => clearOperationKey("collection-evidence", input.id),
    onSettled: (_, __, input) => invalidate(input.id),
  });
  const confirmCollection = useMutation({
    mutationFn: (input: Parameters<typeof buybacksApi.confirmCollection>[1] & { id: string }) => {
      if (!canConfirmCollection) throw new Error("Chỉ Operator được quyền xác nhận sau khi Dolores ghi nhận bằng chứng thu máy.");
      const { id, ...request } = input;
      return buybacksApi.confirmCollection(id, request);
    },
    onSuccess: (_, input) => clearOperationKey("collection-confirm", input.id),
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
    mutationFn: (input: Parameters<typeof buybacksApi.completeRefurbishment>[1] & { id: string; files: File[] }) => {
      if (isExternalBuyback && !canCompleteRefurbishment) throw new Error("Chỉ Technician được giao mới có thể hoàn tất tân trang hồ sơ này.");
      const { id, files, ...request } = input;
      return buybacksApi.completeRefurbishment(id, request, files);
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
    const serial = BuybackSerialSchema.safeParse(serialNumber);
    if (!createConfirmed || !hasActiveContract || !serial.success || create.isPending) return;
    const key = operationKey("create", "new", serial.data);
    create.mutate({ serialNumber: serial.data, idempotencyKey: key, correlationId: key });
  };
  const perform = (run: () => void) => (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); run(); };
  const commonError = [assignInspection, assignCollection, assignRefurbishment, assignModerator, decideOwnerPrice, cancelBuyback, startInspection, submitInspection, decideValuation, createPayment, submitProof, respondToReceipt, reviewProof, requestCollection, recordCollectionEvidence, confirmCollection, startRefurbishment, completeRefurbishment, registerMachine, decideQa, downloadProof].find((mutation) => mutation.isError);
  const backHref = listHref ?? "/dashboard/buyback";
  const createFormOpen = role === "owner" && showCreateForm && !detailId;
  const showList = !createFormOpen && !(isModeratorRoute && Boolean(detailId))
    && !((role === "owner" || role === "operator") && Boolean(detailId))
    && !(role === "technician" && Boolean(initialCaseId));
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
    listFilterDraft, setListFilterDraft,
    applyListFilters: () => { setListFilters({ ...listFilterDraft, search: listFilterDraft.search.trim() }); setPage(0); },
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
    isResponsibleModerator,
    canDecideValuation,
    canCancelExternalBuyback,
    canAssignModerator,
    canRequestCollection,
    canAssignCollection,
    canConfirmCollection,
    canVerifyCollectionSerial,
    collectionEvidence,
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
    serialNumber,
    setSerialNumber,
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
    paymentId: scopedPaymentId || proofPaymentId || "",
    setPaymentId: updatePaymentId,
    paymentProofOperationKey,
    fileFingerprint,
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
    respondToReceipt,
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
