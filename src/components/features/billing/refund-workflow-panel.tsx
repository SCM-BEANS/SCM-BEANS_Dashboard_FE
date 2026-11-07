import Cookies from "js-cookie";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { billingApi } from "@/apis/billing.api";
import { PageActions } from "@/components/action-bar/page-actions";
import { ButtonBar } from "@/components/button/button-bar";
import { NotificationDialog } from "@/components/notification-dialog/notification-dialog";
import { StatusBadge } from "@/components/status-badge/status-badge";
import { getAccessTokenSubject } from "@/lib/auth-role";
import { getBillingWorkflowErrorMessage } from "@/lib/api-errors";
import { RefundIdSchema, type RefundDetail, type RefundPayoutEvidence, type RefundStatus } from "@/schema/billing.schema";
import styles from "./refund-workflow-panel.module.css";

export type RefundRole = "ADMIN" | "MODERATOR" | "OWNER";
export type RefundContext = {
  ownerId: string;
  contractId?: string;
  invoiceId?: string;
  terminationCaseId?: string;
  kind?: "DEPOSIT" | "OVERPAYMENT";
};

export const refundStatusLabels: Record<RefundStatus, string> = {
  REQUESTED: "Chờ khách hàng xác nhận yêu cầu",
  TENANT_CONFIRMED: "Chờ duyệt hoàn tiền",
  APPROVED: "Đã duyệt, chờ chuyển khoản",
  SUBMITTED: "Chờ khách hàng xác nhận tiền nhận",
  COMPLETED: "Đã hoàn tiền",
  REJECTED: "Đã từ chối",
  FAILED: "Chuyển khoản thất bại",
  DISPUTED: "Cần đối chiếu khoản tiền đã nhận",
};
export const refundMoney = (amount: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 2 }).format(amount);
const dateText = (value: string) => {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString("vi-VN") : value;
};

export function refundMatchesContext(refund: RefundDetail, context: RefundContext) {
  return refund.ownerId === context.ownerId
    && (!context.contractId || refund.contractId === context.contractId)
    && (!context.invoiceId || refund.invoiceId === context.invoiceId)
    && (!context.terminationCaseId || refund.terminationCaseId === context.terminationCaseId)
    && (!context.kind || refund.refundKind === context.kind);
}

export function useRefundDetail(refundId: string, role: RefundRole, context: RefundContext, initialRefund?: RefundDetail) {
  const queryClient = useQueryClient();
  const subject = getAccessTokenSubject(Cookies.get("access_token") ?? "");
  const queryKey = ["dolores", "billing", "refund", role, subject, refundId, context.ownerId, context.contractId ?? "", context.invoiceId ?? "", context.terminationCaseId ?? "", context.kind ?? ""] as const;
  const query = useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      const fresh = await billingApi.getRefund(refundId, signal);
      if (!refundMatchesContext(fresh, context)) throw new Error("Khoản hoàn không thuộc hồ sơ đang xem.");
      const previous = queryClient.getQueryData<RefundDetail>(queryKey) ?? initialRefund;
      // The GET projection omits actor/approval metadata. Keep it only for the same confirmed state.
      return previous?.id === fresh.id && previous.status === fresh.status && refundMatchesContext(previous, context)
        ? { ...previous, ...fresh } : fresh;
    },
    enabled: Boolean(subject && context.ownerId && RefundIdSchema.safeParse(refundId).success),
    retry: false,
    staleTime: 0,
  });
  const data = query.data && initialRefund?.id === query.data.id && initialRefund.status === query.data.status && refundMatchesContext(initialRefund, context)
    ? { ...initialRefund, ...query.data } : query.data;
  return { ...query, data, queryKey, subject };
}

type Command =
  | { action: "confirm" | "approve" }
  | { action: "reject" | "fail"; reason: string }
  | { action: "reopen"; reason: string; key: string }
  | { action: "submit"; file: File }
  | { action: "receipt"; received: boolean; receivedAmount: number; note?: string };

const commandLabels: Record<Command["action"], string> = {
  confirm: "Xác nhận yêu cầu hoàn tiền", approve: "Duyệt hoàn tiền", reject: "Từ chối yêu cầu",
  fail: "Ghi nhận chuyển khoản thất bại", reopen: "Mở lại yêu cầu hoàn tiền",
  submit: "Gửi chứng từ chuyển khoản", receipt: "Gửi xác nhận tiền thực nhận",
};

export function RefundWorkflowPanel({ refundId, role, context, initialRefund, onChanged }: {
  refundId: string; role: RefundRole; context: RefundContext; initialRefund?: RefundDetail;
  onChanged?: () => void | Promise<unknown>;
}) {
  const queryClient = useQueryClient();
  const refund = useRefundDetail(refundId, role, context, initialRefund);
  const [reason, setReason] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [receivedChoice, setReceivedChoice] = useState<"" | "yes" | "no">("");
  const [receivedAmount, setReceivedAmount] = useState("");
  const [note, setNote] = useState("");
  const [evidenceId, setEvidenceId] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [pending, setPending] = useState<Command | null>(null);
  const reopenKeys = useRef(new Map<string, string>());
  const evidenceKey = [...refund.queryKey, "payout-evidence"];
  const evidence = useQuery<RefundPayoutEvidence[]>({ queryKey: evidenceKey, queryFn: async () => [], initialData: [], enabled: false });
  const mutation = useMutation({
    mutationFn: async (command: Command) => {
      const fresh = await billingApi.getRefund(refundId);
      if (!refundMatchesContext(fresh, context)) throw new Error("Khoản hoàn không thuộc hồ sơ đang xem.");
      const ownerAction = command.action === "confirm" || command.action === "receipt";
      if (ownerAction ? role !== "OWNER" || refund.subject !== fresh.ownerId : role === "OWNER") {
        throw new Error("Tài khoản hiện tại không được thực hiện thao tác này.");
      }
      const allowedStates: Record<Command["action"], RefundStatus[]> = {
        confirm: ["REQUESTED"], approve: ["TENANT_CONFIRMED"], reject: ["REQUESTED", "TENANT_CONFIRMED", "APPROVED"],
        fail: ["SUBMITTED"], reopen: ["REJECTED", "DISPUTED"], submit: ["APPROVED", "FAILED"], receipt: ["SUBMITTED"],
      };
      if (!allowedStates[command.action].includes(fresh.status)) throw new Error("Trạng thái khoản hoàn đã thay đổi. Hãy làm mới và chọn lại thao tác.");
      if (command.action === "reopen" && (role !== "ADMIN" || fresh.refundKind !== "DEPOSIT" || !fresh.terminationCaseId)) {
        throw new Error("Chỉ Admin được mở lại khoản hoàn cọc gắn với hồ sơ chấm dứt.");
      }
      if (command.action === "approve") {
        const known = refund.data;
        if (known?.requestedBy === refund.subject || known?.ownerConfirmedBy === refund.subject) throw new Error("Người tạo hoặc xác nhận yêu cầu không được tự duyệt.");
        if (role !== "ADMIN" && (fresh.refundKind === "DEPOSIT" || fresh.terminationCaseId || known?.status !== fresh.status || known.approvalRequiredRole !== "MODERATOR")) {
          throw new Error("Khoản hoàn này cần Admin duyệt hoặc cần kiểm tra lại vai trò duyệt.");
        }
      }
      const execute = async () => {
      switch (command.action) {
        case "confirm": return billingApi.confirmRefund(refundId);
        case "approve": return billingApi.approveRefund(refundId);
        case "reject": return billingApi.rejectRefund(refundId, command.reason);
        case "fail": return billingApi.failRefund(refundId, command.reason);
        case "reopen": return billingApi.reopenRefund(refundId, command.reason, command.key);
        case "receipt": return billingApi.recordRefundReceipt(refundId, { received: command.received, receivedAmount: command.receivedAmount, ...(command.note ? { note: command.note } : {}) });
        case "submit": {
          const uploaded = await billingApi.submitRefundTransferEvidence(refundId, command.file);
          queryClient.setQueryData<RefundPayoutEvidence[]>(evidenceKey, (items = []) => [uploaded, ...items.filter((item) => item.id !== uploaded.id)]);
          return undefined;
        }
      }
      };
      const result = await execute();
      if (result && !refundMatchesContext(result, context)) throw new Error("Khoản hoàn trả về không khớp hồ sơ.");
      return result;
    },
    onSuccess: async (updated) => {
      if (updated) {
        queryClient.setQueryData(refund.queryKey, updated);
      }
      setPending(null); setReason(""); setFile(null); setReceivedChoice(""); setReceivedAmount(""); setNote("");
      await queryClient.invalidateQueries({ queryKey: refund.queryKey });
      await queryClient.invalidateQueries({ queryKey: ["dolores", "billing", "refund-overdue"] });
      await onChanged?.();
    },
    onError: async () => {
      // A concurrent transition may already have happened; reload before offering the next action.
      await queryClient.invalidateQueries({ queryKey: refund.queryKey });
      await onChanged?.();
    },
  });
  const ask = (command: Command) => { mutation.reset(); setPending(command); };
  const download = async (id: string, filename = "chung-tu-hoan-tien") => {
    setDownloading(true); setDownloadError("");
    try {
      const blob = await billingApi.downloadRefundEvidence(refundId, id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a"); anchor.href = url;
      anchor.download = filename.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").slice(0, 180);
      anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { setDownloadError(getBillingWorkflowErrorMessage(error)); }
    finally { setDownloading(false); }
  };
  const data = refund.data;
  const operator = role === "ADMIN" || role === "MODERATOR";
  const owner = role === "OWNER" && refund.subject === data?.ownerId;
  const requiredRole = data?.refundKind === "DEPOSIT" || data?.terminationCaseId ? "ADMIN" : data?.approvalRequiredRole;
  const selfApproval = Boolean(refund.subject && (data?.requestedBy === refund.subject || data?.ownerConfirmedBy === refund.subject));
  const canApprove = operator && !selfApproval && (role === "ADMIN" || requiredRole === "MODERATOR");
  const receiptValid = receivedChoice !== "" && receivedAmount.trim() !== "" && Number.isFinite(Number(receivedAmount)) && Number(receivedAmount) >= 0;
  return (
    <section className={styles.panel} aria-label="Khoản hoàn tiền">
      <PageActions actions={data && !refund.isError ? [
        ...(owner && data.status === "REQUESTED" ? [{ id: "refund-confirm", label: "Xác nhận yêu cầu hoàn tiền", priority: 50, variant: "primary" as const, disabled: mutation.isPending, onClick: () => ask({ action: "confirm" }) }] : []),
        ...(operator && data.status === "TENANT_CONFIRMED" ? [{ id: "refund-approve", label: "Duyệt hoàn tiền", priority: 50, variant: "primary" as const, disabled: !canApprove || mutation.isPending, onClick: () => ask({ action: "approve" }) }] : []),
        ...(operator && ["APPROVED", "FAILED"].includes(data.status) ? [{ id: "refund-submit", label: "Gửi chứng từ", priority: 100, variant: "primary" as const, type: "submit" as const, form: "billing-refund-evidence-form", disabled: !file || mutation.isPending }] : []),
        ...(owner && data.status === "SUBMITTED" ? [{ id: "refund-receipt", label: "Gửi xác nhận tiền thực nhận", priority: 100, variant: "primary" as const, type: "submit" as const, form: "billing-refund-receipt-form", disabled: !receiptValid || mutation.isPending }] : []),
        ...(operator && ["REQUESTED", "TENANT_CONFIRMED", "APPROVED"].includes(data.status) ? [{ id: "refund-reject", label: "Từ chối yêu cầu", priority: 0, variant: "danger" as const, disabled: !reason.trim() || mutation.isPending, onClick: () => ask({ action: "reject", reason: reason.trim() }) }] : []),
        ...(operator && data.status === "SUBMITTED" ? [{ id: "refund-fail", label: "Ghi nhận chuyển khoản thất bại", priority: 50, variant: "primary" as const, disabled: !reason.trim() || mutation.isPending, onClick: () => ask({ action: "fail", reason: reason.trim() }) }] : []),
        ...(operator && role === "ADMIN" && data.refundKind === "DEPOSIT" && data.terminationCaseId && ["REJECTED", "DISPUTED"].includes(data.status) ? [{ id: "refund-reopen", label: "Mở lại yêu cầu", priority: 50, variant: "primary" as const, disabled: !reason.trim() || mutation.isPending, onClick: () => { const signature = `${refundId}:${reason.trim()}`; const key = reopenKeys.current.get(signature) ?? crypto.randomUUID(); reopenKeys.current.set(signature, key); ask({ action: "reopen", reason: reason.trim(), key }); } }] : []),
      ] : []} />
      <div className={styles.heading}><h3>Khoản hoàn tiền</h3><ButtonBar disabled={refund.isFetching || mutation.isPending} onClick={() => void refund.refetch()}>Làm mới</ButtonBar></div>
      {!RefundIdSchema.safeParse(refundId).success ? <p className={styles.error} role="alert">Mã khoản hoàn không hợp lệ.</p> : null}
      {refund.isLoading ? <p role="status">Đang tải khoản hoàn…</p> : null}
      {refund.isError ? <p className={styles.error} role="alert">{getBillingWorkflowErrorMessage(refund.error)}</p> : null}
      {data && !refund.isError ? <>
        <dl className={styles.summary}>
          <div><dt>Số tiền hoàn</dt><dd>{refundMoney(data.amount)}</dd></div>
          <div><dt>Trạng thái</dt><dd><StatusBadge status={data.status}>{refundStatusLabels[data.status]}</StatusBadge></dd></div>
          <div><dt>Loại khoản hoàn</dt><dd>{data.refundKind === "DEPOSIT" ? "Hoàn tiền cọc" : data.refundKind === "OVERPAYMENT" ? "Hoàn khoản thanh toán dư" : "Loại khoản hoàn chưa hỗ trợ"}</dd></div>
          <div><dt>Ngày yêu cầu</dt><dd>{dateText(data.requestedAt)}</dd></div>
          <div><dt>Mã khoản hoàn</dt><dd>{data.id}</dd></div>
          {data.reason ? <div><dt>Lý do</dt><dd>{data.reason}</dd></div> : null}
          {data.ownerReceivedAmount != null ? <div><dt>Khách hàng xác nhận đã nhận</dt><dd>{refundMoney(data.ownerReceivedAmount)}</dd></div> : null}
          {data.ownerReceiptNote ? <div><dt>Phản hồi của khách hàng</dt><dd>{data.ownerReceiptNote}</dd></div> : null}
        </dl>
        {data.failureReason ? <p className={styles.notice}>{data.failureReason}</p> : null}
        {operator && data.status === "TENANT_CONFIRMED" ? <>
          {selfApproval ? <p className={styles.notice}>Người tạo hoặc xác nhận yêu cầu không được tự duyệt. Cần nhân viên khác xử lý.</p>
            : role === "MODERATOR" && requiredRole !== "MODERATOR" ? <p className={styles.notice}>{requiredRole === "ADMIN" ? "Khoản hoàn này cần Admin duyệt." : "API chi tiết chưa trả vai trò duyệt. Mở yêu cầu từ hàng đợi quá hạn hoặc chuyển Admin kiểm tra."}</p> : null}
        </> : null}
        {operator && ["APPROVED", "FAILED"].includes(data.status) ? <form id="billing-refund-evidence-form" className={styles.form} onSubmit={(event) => { event.preventDefault(); if (file) ask({ action: "submit", file }); }}>
          <h4>{data.status === "FAILED" ? "Gửi chứng từ lần chuyển khoản mới" : "Chứng từ chuyển khoản"}</h4>
          <label>Chọn PDF hoặc ảnh chuyển khoản<input required type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" disabled={mutation.isPending} onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>
          <p className={styles.hint}>Tối đa 20 MiB. Tải chứng từ sau khi đã chuyển khoản bên ngoài hệ thống.</p>
        </form> : null}
        {owner && data.status === "SUBMITTED" ? <form id="billing-refund-receipt-form" className={styles.form} onSubmit={(event) => { event.preventDefault(); if (receiptValid) ask({ action: "receipt", received: receivedChoice === "yes", receivedAmount: Number(receivedAmount), ...(note.trim() ? { note: note.trim() } : {}) }); }}>
          <h4>Xác nhận tiền thực nhận</h4><div className={styles.grid}>
            <label>Bạn đã nhận tiền chưa? *<select required value={receivedChoice} onChange={(event) => setReceivedChoice(event.target.value as typeof receivedChoice)}><option value="">Chọn tình trạng nhận tiền</option><option value="yes">Đã nhận tiền</option><option value="no">Chưa nhận / có vấn đề</option></select></label>
            <label>Số tiền thực tế đã nhận (VND) *<input required type="number" min="0" step="any" value={receivedAmount} onChange={(event) => setReceivedAmount(event.target.value)} /></label>
            <label className={styles.wide}>Ghi chú<textarea maxLength={2000} value={note} onChange={(event) => setNote(event.target.value)} /></label>
          </div>
          {receiptValid && (receivedChoice === "no" || Number(receivedAmount) !== data.amount) ? <p className={styles.notice}>Phản hồi này sẽ chuyển khoản hoàn sang trạng thái cần đối chiếu; hồ sơ chấm dứt chưa thể hoàn tất.</p> : null}
        </form> : null}
        {operator && (["REQUESTED", "TENANT_CONFIRMED", "APPROVED"].includes(data.status) || data.status === "SUBMITTED" || (role === "ADMIN" && data.refundKind === "DEPOSIT" && data.terminationCaseId && ["REJECTED", "DISPUTED"].includes(data.status))) ? <div className={styles.form}>
          <label>Lý do xử lý *<textarea maxLength={2000} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ghi rõ lý do để lưu cùng hồ sơ" /></label>
        </div> : null}
        {data.status === "DISPUTED" ? <p className={styles.notice}>{data.terminationCaseId ? "Khoản hoàn cần đối chiếu. Admin có thể mở lại yêu cầu để khách hàng xác nhận lại." : "Khoản hoàn đang cần đối chiếu. API hiện chưa có thao tác mở lại khoản thanh toán dư độc lập; cần bộ phận vận hành xử lý."}</p> : null}
        {data.status === "COMPLETED" ? <p className={styles.success} role="status">Khách hàng đã xác nhận nhận đủ tiền hoàn.</p> : null}
        <details className={styles.form}><summary>Chứng từ chuyển khoản</summary>
          {evidence.data.map((item) => <div className={styles.heading} key={item.id}><span>{item.originalFilename} · {dateText(item.uploadedAt)}</span><ButtonBar disabled={downloading} onClick={() => void download(item.id, item.originalFilename)}>Tải chứng từ</ButtonBar></div>)}
          <p className={styles.hint}>API không có danh sách chứng từ hoàn tiền. Nếu đã có mã chứng từ từ lần tải lên hoặc bộ phận vận hành, nhập mã để tải.</p>
          <form className={styles.lookup} onSubmit={(event) => { event.preventDefault(); if (RefundIdSchema.safeParse(evidenceId.trim()).success) void download(evidenceId.trim()); }}>
            <label>Mã chứng từ<input value={evidenceId} onChange={(event) => setEvidenceId(event.target.value)} /></label><ButtonBar type="submit" disabled={downloading || !RefundIdSchema.safeParse(evidenceId.trim()).success}>Tải chứng từ</ButtonBar>
          </form>{downloadError ? <p className={styles.error} role="alert">{downloadError}</p> : null}
        </details>
      </> : null}
      {mutation.isError && !pending ? <p className={styles.error} role="alert">{getBillingWorkflowErrorMessage(mutation.error, "mutation")}</p> : null}
      {pending ? <NotificationDialog variant="confirm" title={`${commandLabels[pending.action]}?`} description={pending.action === "receipt" ? `Số tiền thực nhận: ${refundMoney(pending.receivedAmount)}. ${pending.received ? "Bạn đã chọn đã nhận tiền." : "Bạn đã chọn chưa nhận tiền hoặc có vấn đề."}` : `Khoản hoàn ${data ? refundMoney(data.amount) : ""}. ${"reason" in pending ? pending.reason : "Kiểm tra thông tin trước khi xác nhận."}`}
        primaryAction={{ label: commandLabels[pending.action], pending: mutation.isPending, pendingLabel: "Đang xử lý…", onClick: () => mutation.mutate(pending) }}
        secondaryAction={{ label: "Quay lại", disabled: mutation.isPending, onClick: () => setPending(null) }} onClose={() => { if (!mutation.isPending) setPending(null); }} closeOnEscape={!mutation.isPending}>
        {mutation.isError ? <p className={styles.error} role="alert">{getBillingWorkflowErrorMessage(mutation.error, "mutation")}</p> : null}
      </NotificationDialog> : null}
    </section>
  );
}
