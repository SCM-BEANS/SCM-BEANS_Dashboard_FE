import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { coffeePackagesApi } from "@/apis/coffee-packages.api";
import { contractsApi } from "@/apis/contracts.api";
import { authScopedQuerySubject, getAuthenticatedSubjectId } from "@/lib/query-subject";
import type { CoffeePackageUpsertRequest } from "@/schema/coffee-packages.schema";

export type CoffeePackageRole = "OWNER" | "ADMIN" | "MODERATOR";

export type CoffeePackageWorkflowAction =
  | { type: "PLACE_ORDER"; input: { contractId: string; packageId: string; quantity: number } }
  | { type: "APPROVE_ORDER"; orderId: string; note: string }
  | { type: "REJECT_ORDER"; orderId: string; reason: string }
  | { type: "WAITING_STOCK"; orderId: string; reason: string; expectedStockAt: string }
  | { type: "ACKNOWLEDGE_WAITING"; orderId: string }
  | { type: "HANDOVER"; orderId: string; method: "SELF_PICKUP" | "COMPANY_DELIVERY_EXTERNAL"; recipient: string; quantity: number }
  | { type: "CANCEL_ORDER"; orderId: string; reason: string }
  | { type: "SUBMIT_PROOF"; invoiceId: string; amount: number; file: File }
  | { type: "REVIEW_PROOF"; proofId: string; approve: boolean; reason: string }
  | { type: "DISPOSE_EXCEPTION"; proofId: string; disposition: "NO_FUNDS" | "EXCESS_RETURNED" | "EXCESS_INCLUDED_IN_REFUND"; verifiedAmount: number; bankReference: string; returnBankReference?: string; reason: string; evidence: File }
  | { type: "APPROVE_REFUND"; refundId: string; reason: string }
  | { type: "CREATE_PAYOUT"; refundId: string; bankReference: string; reason: string; evidence: File }
  | { type: "PAYOUT_FAILED"; refundId: string; attemptNumber: number; reason: string }
  | { type: "CREATE_REFUND_DISPUTE"; refundId: string; reason: string }
  | { type: "RESOLVE_REFUND_DISPUTE"; refundId: string; resolution: "CONFIRM_PAYOUT" | "RETRY_PAYOUT"; reason: string }
  | { type: "CONFIRM_REFUND_RECEIVED"; refundId: string }
  | { type: "CREATE_PACKAGE"; input: CoffeePackageUpsertRequest }
  | { type: "UPDATE_PACKAGE"; packageId: string; input: CoffeePackageUpsertRequest }
  | { type: "DEACTIVATE_PACKAGE"; packageId: string }
  | { type: "DOWNLOAD_PROOF"; proofId: string; filename: string }
  | { type: "DOWNLOAD_DISPOSITION_EVIDENCE"; proofId: string }
  | { type: "DOWNLOAD_PAYOUT"; refundId: string; attemptNumber: number };

const actionSuccessMessage: Record<CoffeePackageWorkflowAction["type"], string> = {
  PLACE_ORDER: "Đơn gói cà phê đã được gửi.",
  APPROVE_ORDER: "Đã duyệt đơn và xác nhận nguồn cung.",
  REJECT_ORDER: "Đã từ chối đơn hàng.",
  WAITING_STOCK: "Đã cập nhật đơn sang trạng thái chờ hàng.",
  ACKNOWLEDGE_WAITING: "Đã ghi nhận bạn đồng ý chờ hàng.",
  HANDOVER: "Đã ghi nhận bàn giao đơn hàng.",
  CANCEL_ORDER: "Đã gửi yêu cầu hủy và hoàn tiền.",
  SUBMIT_PROOF: "Chứng từ thanh toán đã được gửi để đối soát.",
  REVIEW_PROOF: "Đã lưu kết quả đối soát chứng từ.",
  DISPOSE_EXCEPTION: "Đã lưu kết quả xử lý khoản thanh toán ngoại lệ.",
  APPROVE_REFUND: "Đã duyệt khoản hoàn tiền.",
  CREATE_PAYOUT: "Đã ghi nhận chứng từ chuyển khoản hoàn tiền.",
  PAYOUT_FAILED: "Đã ghi nhận lần chuyển khoản không thành công.",
  CREATE_REFUND_DISPUTE: "Đã gửi tranh chấp khoản hoàn tiền.",
  RESOLVE_REFUND_DISPUTE: "Đã cập nhật kết quả xử lý tranh chấp.",
  CONFIRM_REFUND_RECEIVED: "Đã xác nhận nhận tiền hoàn.",
  CREATE_PACKAGE: "Đã tạo gói cà phê.",
  UPDATE_PACKAGE: "Đã cập nhật gói cà phê.",
  DEACTIVATE_PACKAGE: "Đã ngừng kinh doanh gói cà phê.",
  DOWNLOAD_PROOF: "",
  DOWNLOAD_DISPOSITION_EVIDENCE: "",
  DOWNLOAD_PAYOUT: "",
};

async function executeAction(action: CoffeePackageWorkflowAction) {
  switch (action.type) {
    case "PLACE_ORDER": return coffeePackagesApi.placeOrder(action.input);
    case "APPROVE_ORDER": return coffeePackagesApi.approveOrder(action.orderId, { note: action.note });
    case "REJECT_ORDER": return coffeePackagesApi.rejectOrder(action.orderId, action.reason);
    case "WAITING_STOCK": return coffeePackagesApi.markWaitingStock(action.orderId, { reason: action.reason, expectedStockAt: action.expectedStockAt });
    case "ACKNOWLEDGE_WAITING": return coffeePackagesApi.acknowledgeWaitingStock(action.orderId);
    case "HANDOVER": return coffeePackagesApi.handover(action.orderId, { method: action.method, recipient: action.recipient, quantity: action.quantity, expiryChecked: true });
    case "CANCEL_ORDER": return coffeePackagesApi.cancelAndRefund(action.orderId, action.reason);
    case "SUBMIT_PROOF": return coffeePackagesApi.submitPaymentProof(action.invoiceId, action.amount, action.file);
    case "REVIEW_PROOF": return coffeePackagesApi.reviewPaymentProof(action.proofId, { approve: action.approve, reason: action.reason });
    case "DISPOSE_EXCEPTION": return coffeePackagesApi.disposePaymentException(action.proofId, action);
    case "APPROVE_REFUND": return coffeePackagesApi.approveRefund(action.refundId, action.reason);
    case "CREATE_PAYOUT": return coffeePackagesApi.createPayoutAttempt(action.refundId, action);
    case "PAYOUT_FAILED": return coffeePackagesApi.markPayoutFailed(action.refundId, action.attemptNumber, action.reason);
    case "CREATE_REFUND_DISPUTE": return coffeePackagesApi.createRefundDispute(action.refundId, action.reason);
    case "RESOLVE_REFUND_DISPUTE": return coffeePackagesApi.resolveRefundDispute(action.refundId, { resolution: action.resolution, reason: action.reason });
    case "CONFIRM_REFUND_RECEIVED": return coffeePackagesApi.confirmRefundReceived(action.refundId);
    case "CREATE_PACKAGE": return coffeePackagesApi.createPackage(action.input);
    case "UPDATE_PACKAGE": return coffeePackagesApi.updatePackage(action.packageId, action.input);
    case "DEACTIVATE_PACKAGE": return coffeePackagesApi.deactivatePackage(action.packageId);
    case "DOWNLOAD_PROOF": return coffeePackagesApi.downloadPaymentProof(action.proofId, action.filename);
    case "DOWNLOAD_DISPOSITION_EVIDENCE": return coffeePackagesApi.downloadDispositionEvidence(action.proofId);
    case "DOWNLOAD_PAYOUT": return coffeePackagesApi.downloadPayoutEvidence(action.refundId, action.attemptNumber);
  }
}

export function useCoffeePackageWorkflowController(role: CoffeePackageRole, selectedPackageId = "", initialOrderId = "") {
  const queryClient = useQueryClient();
  const subject = authScopedQuerySubject(role);
  const ownerId = role === "OWNER" ? getAuthenticatedSubjectId() : null;
  const queryRoot = ["dolores", "coffee-packages", role, subject] as const;
  const [page, setPage] = useState(0);
  const [selectedOrderId, setSelectedOrderId] = useState(initialOrderId);
  const [selectedRefundId, setSelectedRefundId] = useState("");
  const [success, setSuccess] = useState("");

  const packages = useQuery({
    queryKey: [...queryRoot, "catalog"],
    queryFn: ({ signal }) => coffeePackagesApi.listPackages({ includeInactive: role === "ADMIN", page: 0, size: 100 }, signal),
    enabled: true,
    retry: false,
  });
  const packageIdValid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(selectedPackageId);
  const packageDetail = useQuery({
    queryKey: [...queryRoot, "package", selectedPackageId],
    queryFn: ({ signal }) => coffeePackagesApi.getPackage(selectedPackageId, signal),
    enabled: role === "OWNER" && packageIdValid,
    retry: false,
  });
  const contracts = useQuery({
    queryKey: ["dolores", "owner", "coffee-package-contracts", subject, ownerId],
    queryFn: ({ signal }) => {
      if (!ownerId) throw new Error("Không xác định được tài khoản Owner hiện tại.");
      return contractsApi.listByOwner(ownerId, signal);
    },
    enabled: role === "OWNER" && Boolean(ownerId),
    retry: false,
  });
  const orders = useQuery({
    queryKey: [...queryRoot, "orders", page],
    queryFn: ({ signal }) => coffeePackagesApi.listOrders(page, 50, signal),
    retry: false,
  });
  const orderIdValid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(selectedOrderId);
  const orderDetail = useQuery({
    queryKey: [...queryRoot, "order", selectedOrderId],
    queryFn: ({ signal }) => coffeePackagesApi.getOrder(selectedOrderId, signal),
    enabled: orderIdValid,
    retry: false,
  });
  const selectedOrder = orderDetail.data ?? orders.data?.items.find((order) => order.id === selectedOrderId);
  const orderRefund = useQuery({
    queryKey: [...queryRoot, "order-refund", selectedOrderId],
    queryFn: ({ signal }) => coffeePackagesApi.getRefundByOrder(selectedOrderId, signal),
    enabled: role === "OWNER" && orderIdValid && ["CANCELLED", "CANCELLATION_REFUND_PENDING", "CANCELLED_REFUNDED"].includes(selectedOrder?.status ?? "") && !selectedRefundId,
    retry: false,
  });
  const invoiceEligible = selectedOrder && !["PENDING_APPROVAL", "REJECTED"].includes(selectedOrder.status);
  const invoice = useQuery({
    queryKey: [...queryRoot, "order-invoice", selectedOrderId],
    queryFn: ({ signal }) => coffeePackagesApi.getInvoiceByOrder(selectedOrderId, signal),
    enabled: orderIdValid && Boolean(invoiceEligible),
    retry: false,
  });
  const proofs = useQuery({
    queryKey: [...queryRoot, "proofs", invoice.data?.id],
    queryFn: ({ signal }) => coffeePackagesApi.listPaymentProofs(invoice.data!.id, 0, 100, signal),
    enabled: Boolean(invoice.data?.id),
    retry: false,
  });
  const refunds = useQuery({
    queryKey: [...queryRoot, "refunds"],
    queryFn: ({ signal }) => coffeePackagesApi.listRefunds(0, 100, signal),
    enabled: role !== "OWNER",
    retry: false,
  });
  const refundIdValid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(selectedRefundId);
  const refundDetail = useQuery({
    queryKey: [...queryRoot, "refund", selectedRefundId],
    queryFn: ({ signal }) => coffeePackagesApi.getRefund(selectedRefundId, signal),
    enabled: refundIdValid,
    retry: false,
  });
  const payoutAttempts = useQuery({
    queryKey: [...queryRoot, "payout-attempts", selectedRefundId],
    queryFn: ({ signal }) => coffeePackagesApi.listPayoutAttempts(selectedRefundId, signal),
    enabled: refundIdValid,
    retry: false,
  });
  const exceptions = useQuery({
    queryKey: [...queryRoot, "payment-exceptions"],
    queryFn: ({ signal }) => coffeePackagesApi.listExceptions(0, 100, signal),
    enabled: role === "ADMIN",
    retry: false,
  });

  const actionMutation = useMutation({
    mutationFn: executeAction,
    onMutate: () => setSuccess(""),
    onSuccess: async (data, action) => {
      setSuccess(actionSuccessMessage[action.type]);
      if (action.type === "PLACE_ORDER" && data && typeof data === "object" && "id" in data && typeof data.id === "string") {
        setSelectedOrderId(data.id);
      }
      if (action.type === "CANCEL_ORDER" && data && typeof data === "object" && "refundId" in data && typeof data.refundId === "string") {
        setSelectedRefundId(data.refundId);
      }
      await queryClient.invalidateQueries({ queryKey: queryRoot });
    },
  });

  const activeSmartIoTContracts = (contracts.data ?? []).filter(
    (contract) => contract.status === "ACTIVE" && contract.machineTypeSnapshot === "SMART_IOT",
  );

  return {
    role,
    page,
    setPage,
    selectedOrderId,
    setSelectedOrderId,
    selectedRefundId,
    setSelectedRefundId,
    success,
    clearSuccess: () => setSuccess(""),
    run: actionMutation.mutate,
    pending: actionMutation.isPending,
    actionError: actionMutation.error,
    packages,
    packageDetail,
    contracts,
    activeSmartIoTContracts,
    orders,
    orderDetail,
    selectedOrder,
    orderRefund,
    invoice,
    proofs,
    refunds,
    refundDetail,
    payoutAttempts,
    exceptions,
  };
}

export type CoffeePackageWorkflowController = ReturnType<typeof useCoffeePackageWorkflowController>;

const coffeePackageStatusLabels: Record<string, string> = {
  ACTIVE: "Đang kinh doanh",
  INACTIVE: "Ngừng kinh doanh",
  PENDING_APPROVAL: "Chờ duyệt đơn",
  PENDING_PAYMENT: "Chờ thanh toán",
  PARTIALLY_PAID: "Đã thanh toán một phần",
  PAID: "Đã thanh toán",
  WAITING_STOCK: "Đang chờ hàng",
  DELIVERED: "Đã bàn giao",
  REJECTED: "Đã từ chối",
  CANCELLED: "Đã hủy",
  CANCELLATION_REFUND_PENDING: "Đang hoàn tiền đơn đã hủy",
  CANCELLED_REFUNDED: "Đã hoàn tiền đơn đã hủy",
  SUBMITTED: "Chờ đối soát",
  APPROVED: "Đã duyệt",
  REJECTED_PROOF: "Đã từ chối chứng từ",
  REQUESTED: "Chờ duyệt hoàn tiền",
  APPROVED_REFUND: "Đã duyệt hoàn tiền",
  DISPUTED: "Đang có tranh chấp",
  COMPLETED: "Đã hoàn tất",
  FAILED: "Chuyển khoản chưa thành công",
  PAYOUT_RECORDED: "Đã ghi nhận chuyển khoản",
  OWNER_CONFIRMED: "Owner đã xác nhận nhận tiền",
  RECORDED: "Đã ghi nhận chuyển khoản",
  DISPUTE_CONFIRMED: "Đã xác nhận tranh chấp",
  DISPUTE_RETRY: "Được phép chuyển lại",
  UNKNOWN: "Chưa xác định",
  PENDING: "Đang chờ xử lý",
  REFUND_PENDING: "Đang chờ hoàn tiền",
  REFUNDED: "Đã hoàn tiền",
  NO_FUNDS: "Không có tiền vào",
  EXCESS_RETURNED: "Đã hoàn phần dư",
  EXCESS_INCLUDED_IN_REFUND: "Đã gộp phần dư vào khoản hoàn",
};

export function coffeePackageStatusLabel(status: string | null | undefined) {
  if (!status) return "Chưa có trạng thái";
  return coffeePackageStatusLabels[status] ?? status.toLowerCase().replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

export function formatCoffeePackageMoney(amount: number | null | undefined, currency = "VND") {
  if (amount == null || !Number.isFinite(amount)) return "—";
  try {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency, maximumFractionDigits: currency === "VND" ? 0 : 2 }).format(amount);
  } catch {
    return `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(amount)} ${currency}`;
  }
}

export function formatCoffeePackageDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(date);
}
