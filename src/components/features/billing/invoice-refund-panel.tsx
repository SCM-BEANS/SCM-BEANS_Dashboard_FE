import Cookies from "js-cookie";
import { useId, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { billingApi } from "@/apis/billing.api";
import { ButtonBar } from "@/components/button/button-bar";
import { NotificationDialog } from "@/components/notification-dialog/notification-dialog";
import { getAccessTokenSubject } from "@/lib/auth-role";
import { getBillingWorkflowErrorMessage } from "@/lib/api-errors";
import { RefundCreateRequestSchema, RefundIdSchema, type RefundCreateRequest, type RefundDetail } from "@/schema/billing.schema";
import { RefundWorkflowPanel, refundMoney, refundStatusLabels, type RefundRole } from "./refund-workflow-panel";
import styles from "./refund-workflow-panel.module.css";

export function InvoiceRefundPanel({ invoice, role }: {
  invoice: { id: string; ownerId?: string | null; contractId?: string | null; currency: string };
  role: RefundRole;
}) {
  const router = useRouter();
  const subject = getAccessTokenSubject(Cookies.get("access_token") ?? "");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [lookup, setLookup] = useState("");
  const [created, setCreated] = useState<RefundDetail | undefined>();
  const [pending, setPending] = useState<RefundCreateRequest | null>(null);
  const [formError, setFormError] = useState("");
  const [page, setPage] = useState(0);
  const [creating, setCreating] = useState(false);
  const createFormId = useId();
  const keys = useRef(new Map<string, string>());
  const ownerId = invoice.ownerId ?? "";
  const context = { ownerId, invoiceId: invoice.id, kind: "OVERPAYMENT" as const };
  const canCreate = Boolean(subject && ownerId && invoice.currency === "VND" && (role !== "OWNER" || ownerId === subject));
  const overdue = useQuery({
    queryKey: ["dolores", "billing", "refund-overdue", role, subject, ownerId, page],
    queryFn: ({ signal }) => billingApi.listOverdueRefunds({ ownerId, page, size: 50 }, signal),
    enabled: Boolean(subject && ownerId), retry: false,
  });
  const queryId = typeof router.query.refundId === "string" ? router.query.refundId : "";
  const refundId = queryId;
  const open = (id: string) => {
    void router.replace({ pathname: router.pathname, query: { ...router.query, refundId: id } }, undefined, { shallow: true, scroll: false });
  };
  const create = useMutation({
    mutationFn: (request: RefundCreateRequest) => billingApi.createRefund(request),
    onSuccess: (refund) => {
      setCreated(refund); setPending(null); setAmount(""); setReason(""); open(refund.id);
      void overdue.refetch();
    },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!canCreate) return;
    const payload = { ownerId, ...(invoice.contractId ? { contractId: invoice.contractId } : {}), invoiceId: invoice.id, refundKind: "OVERPAYMENT" as const, amount: Number(amount), currency: "VND" as const, reason: reason.trim() };
    const signature = JSON.stringify(payload);
    const key = keys.current.get(signature) ?? crypto.randomUUID(); keys.current.set(signature, key);
    const result = RefundCreateRequestSchema.safeParse({ ...payload, idempotencyKey: key });
    if (!amount.trim() || !result.success) { setFormError("Nhập số tiền lớn hơn 0 và lý do hoàn khoản thanh toán dư."); return; }
    setFormError(""); create.reset(); setPending(result.data);
  };
  const items = overdue.data?.items.filter((item) => item.invoiceId === invoice.id && item.refundKind === "OVERPAYMENT") ?? [];
  const initialRefund = created?.id === refundId ? created : items.find((item) => item.id === refundId);
  return (
    <section className={styles.panel} aria-label="Hoàn khoản thanh toán dư">
      <div className={styles.heading}><div><h2>Hoàn khoản thanh toán dư</h2><p className={styles.hint}>Dùng cho khoản đã thanh toán vượt số tiền cần thu.</p></div>{canCreate && <ButtonBar aria-expanded={creating} aria-controls={createFormId} onClick={() => setCreating((value) => !value)}>{creating ? "Đóng biểu mẫu" : "Tạo yêu cầu hoàn tiền"}</ButtonBar>}</div>
      {canCreate ? <form id={createFormId} hidden={!creating} className={`${styles.form} ${styles.createForm}`} onSubmit={submit}><div className={styles.grid}>
          <label>Số tiền đề nghị hoàn (VND) *<input required type="number" min="0.01" step="any" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
          <label>Lý do *<textarea required maxLength={2000} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
        </div>{formError ? <p className={styles.error} role="alert">{formError}</p> : null}
          <div className={styles.actions}><ButtonBar variant="primary" type="submit" disabled={create.isPending}>Tạo yêu cầu hoàn tiền</ButtonBar><span className={styles.hint}>Số dư khả dụng được kiểm tra khi gửi yêu cầu.</span></div>
        </form> : <p className={styles.notice}>{invoice.currency !== "VND" ? "Luồng hoàn tiền hiện chỉ hỗ trợ VND." : "Chưa có thông tin chủ hóa đơn hợp lệ để tạo yêu cầu hoàn tiền."}</p>}
      <div className={styles.invoiceTools}>
      <details className={styles.tool}><summary>Tra cứu khoản hoàn</summary>
      <form className={styles.lookup} onSubmit={(event) => { event.preventDefault(); if (RefundIdSchema.safeParse(lookup.trim()).success) open(lookup.trim()); }}>
        <label>Tra cứu khoản hoàn bằng mã<input value={lookup} onChange={(event) => setLookup(event.target.value)} placeholder="Nhập mã khoản hoàn đã được cấp" /></label>
        <ButtonBar type="submit" disabled={!RefundIdSchema.safeParse(lookup.trim()).success}>Xem khoản hoàn</ButtonBar>
      </form>
      </details>
      <details className={styles.tool}><summary>Khoản hoàn quá hạn</summary>
        <p className={styles.hint}>Danh sách này chỉ gồm khoản hoàn quá hạn, không phải toàn bộ lịch sử hoàn tiền.</p>
        {overdue.isLoading ? <p role="status">Đang tải khoản hoàn quá hạn…</p> : null}
        {overdue.isError ? <p className={styles.error} role="alert">{getBillingWorkflowErrorMessage(overdue.error)}</p> : null}
        <ul className={styles.queue}>{items.map((item) => <li key={item.id}><button type="button" onClick={() => open(item.id)}><strong>{refundMoney(item.amount)}</strong><span>{refundStatusLabels[item.status]}</span><span>{item.id.slice(0, 8).toUpperCase()}</span></button></li>)}</ul>
        {overdue.isSuccess && !items.length ? <p className={styles.hint}>Không có khoản hoàn quá hạn của hóa đơn trong trang này.</p> : null}
        <div className={styles.actions}>{(page > 0 || overdue.data?.hasNext) && <><ButtonBar disabled={page === 0 || overdue.isFetching} onClick={() => setPage((value) => value - 1)}>Trang trước</ButtonBar><span>Trang {page + 1}</span><ButtonBar disabled={!overdue.data?.hasNext || overdue.isFetching} onClick={() => setPage((value) => value + 1)}>Trang sau</ButtonBar></>}<ButtonBar disabled={overdue.isFetching} onClick={() => void overdue.refetch()}>Làm mới</ButtonBar></div>
      </details>
      </div>
      {refundId && ownerId ? <div className={styles.refundResult}><RefundWorkflowPanel key={refundId} refundId={refundId} role={role} context={context} initialRefund={initialRefund} onChanged={() => overdue.refetch()} /></div> : null}
      {pending ? <NotificationDialog variant="confirm" title="Tạo yêu cầu hoàn khoản thanh toán dư?" description={`Số tiền đề nghị: ${refundMoney(pending.amount)}. ${pending.reason} Khách hàng vẫn cần xác nhận yêu cầu trước khi nhân viên duyệt.`}
        primaryAction={{ label: "Tạo yêu cầu", pending: create.isPending, pendingLabel: "Đang gửi…", onClick: () => create.mutate(pending) }}
        secondaryAction={{ label: "Quay lại", disabled: create.isPending, onClick: () => setPending(null) }} onClose={() => { if (!create.isPending) setPending(null); }} closeOnEscape={!create.isPending}>
        {create.isError ? <p className={styles.error} role="alert">{getBillingWorkflowErrorMessage(create.error, "mutation")}</p> : null}
      </NotificationDialog> : null}
    </section>
  );
}
