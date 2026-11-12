import { useState, type FormEvent } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { contractsApi } from "@/apis/contracts.api";
import { billingApi } from "@/apis/billing.api";
import { recallWorkOrdersApi } from "@/apis/recall-work-orders.api";
import { ButtonBar } from "@/components/button/button-bar";
import { TerminationWorkflowPanel } from "@/components/contracts/termination-workflow-panel";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import { NotificationDialog } from "@/components/notification-dialog/notification-dialog";
import { DataTable } from "@/components/table/data-table";
import { querySubject } from "@/components/features/repair-workflow/repair-workflow-query-identity";
import { getBillingWorkflowErrorMessage as getApiErrorMessage } from "@/lib/api-errors";
import { TerminationCaseIdSchema } from "@/schema/termination-cases.schema";
import { ContractIdSchema, TerminationCaseRequestSchema, type TerminationCaseRequest } from "@/schema/contracts.schema";
import { PATH_ADMIN, PATH_CUSTOMER, PATH_MODERATOR } from "@/routes/path";
import { ADMIN_OPERATIONS_MESSAGES as T } from "@/text/admin/admin-operations-messages";
import styles from "./contract-termination-screen.module.css";

type TerminationRole = "ADMIN" | "MODERATOR" | "OWNER";

const money = (value: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 2 }).format(value);
const invoiceStatuses: Record<string, string> = { DRAFT: "Bản nháp", PENDING: "Chờ xử lý", UNPAID: "Chưa thanh toán", PAID: "Đã thanh toán", OVERDUE: "Quá hạn", CANCELLED: "Đã hủy" };

// Keep collection lookup beside the termination page; proof upload/review stays on the existing invoice routes.
function DepositCollectionSection({ contractId, ownerId, depositAmount, startDate, role }: {
  contractId: string; ownerId: string; depositAmount?: number | null; startDate?: string | null; role: TerminationRole;
}) {
  const [open, setOpen] = useState(false);
  const initialPeriod = startDate && /^\d{4}-(0[1-9]|1[0-2])-/.test(startDate) ? startDate.slice(0, 7) : "";
  const [periodInput, setPeriodInput] = useState(initialPeriod);
  const [period, setPeriod] = useState(initialPeriod);
  const [page, setPage] = useState(0);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [linePage, setLinePage] = useState(0);
  const identity = querySubject(role === "ADMIN" ? "admin" : role === "MODERATOR" ? "moderator" : "owner");
  const invoices = useQuery({
    queryKey: ["billing", "deposit-collection", identity, ownerId, contractId, period, page],
    queryFn: async ({ signal }) => {
      const result = await billingApi.listInvoicesPage({ ...(role === "OWNER" ? {} : { ownerId }), type: "RENTAL", ...(period ? { period } : {}), page, size: 50 }, signal);
      if (result.items.some((invoice) => invoice.ownerId !== ownerId || invoice.type !== "RENTAL")) {
        throw new Error("Hóa đơn trả về không khớp khách hàng đang xem. Vui lòng kiểm tra lại dữ liệu.");
      }
      return result;
    },
    enabled: open,
    retry: false,
  });
  const selectedInvoice = invoices.data?.items.find((invoice) => invoice.id === selectedInvoiceId);
  const lines = useQuery({
    queryKey: ["billing", "deposit-collection-lines", identity, ownerId, contractId, selectedInvoice?.id, linePage],
    queryFn: ({ signal }) => billingApi.listInvoiceLineItemsPage(selectedInvoice!.id, { page: linePage, size: 100 }, signal),
    enabled: open && Boolean(selectedInvoice) && !invoices.isError,
    retry: false,
  });
  // Invoice summaries can aggregate contracts; only line-level references identify this contract's deposit.
  const depositLines = lines.data?.items.filter((line) => line.serviceCode === "DEPOSIT" && line.contractId === contractId && line.ownerId === ownerId) ?? [];
  const invoiceHref = selectedInvoice ? role === "ADMIN" ? PATH_ADMIN.INVOICE_DETAIL(selectedInvoice.id)
    : role === "MODERATOR" ? PATH_MODERATOR.INVOICE_DETAIL(selectedInvoice.id) : PATH_CUSTOMER.INVOICE_DETAIL(selectedInvoice.id) : "";

  return <section className={styles.contractCard} aria-label="Thu tiền cọc">
    <div className={styles.depositHeading}>
      <div><h2>Thu tiền cọc</h2><p className={styles.depositDescription}>Tiền cọc theo hợp đồng: <strong>{depositAmount == null ? "Chưa có dữ liệu" : money(depositAmount)}</strong></p></div>
      <ButtonBar type="button" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "Thu gọn" : "Kiểm tra hóa đơn tiền cọc"}</ButtonBar>
    </div>
    {open ? <div className={styles.depositContent}>
      <p className={styles.depositDescription}>Tiền cọc được thu qua hóa đơn thuê máy. Hóa đơn chứa dòng tiền cọc cần được thanh toán đủ và đối soát trước khi quyết toán chấm dứt.</p>
      <form className={styles.depositFilters} onSubmit={(event) => {
        event.preventDefault(); setPeriod(periodInput); setPage(0); setSelectedInvoiceId(""); setLinePage(0);
        if (periodInput === period && page === 0) void invoices.refetch();
      }}>
        <label>Kỳ hóa đơn<input type="month" value={periodInput} onChange={(event) => setPeriodInput(event.target.value)} /></label>
        <ButtonBar type="submit">Tìm hóa đơn</ButtonBar>
      </form>
      {invoices.isFetching ? <p role="status">Đang tải hóa đơn…</p> : null}
      {invoices.isError ? <p className={styles.error} role="alert">{getApiErrorMessage(invoices.error)}</p> : null}
      {invoices.isSuccess ? <>
        <DataTable headers={["Hóa đơn", "Kỳ", "Tổng hóa đơn", "Trạng thái", ""]} minWidth={620}>
          {invoices.data.items.map((invoice) => <tr key={invoice.id}>
            <td>{invoice.id.slice(0, 8).toUpperCase()}</td><td>{invoice.period}</td>
            <td>{money(invoice.amount)}</td><td>{invoiceStatuses[invoice.status] ?? invoice.status}</td>
            <td><ButtonBar type="button" aria-pressed={selectedInvoice?.id === invoice.id} onClick={() => { setSelectedInvoiceId(invoice.id); setLinePage(0); }}>Xem dòng tiền cọc</ButtonBar></td>
          </tr>)}
        </DataTable>
        {!invoices.data.items.length ? <p className={styles.notice}>Chưa có hóa đơn trong kỳ đang chọn. Có thể đổi kỳ hoặc xóa kỳ để tìm tất cả. Nếu hóa đơn chưa được sinh, cần bộ phận vận hành kiểm tra lịch tạo hóa đơn; trang này không tự tạo hóa đơn hoặc dòng tiền cọc.</p> : null}
        <div className={styles.depositActions}>
          <ButtonBar type="button" disabled={page === 0 || invoices.isFetching} onClick={() => { setPage(page - 1); setSelectedInvoiceId(""); }}>Trang trước</ButtonBar>
          <span>Trang {page + 1}</span>
          <ButtonBar type="button" disabled={!invoices.data.hasNext || invoices.isFetching} onClick={() => { setPage(page + 1); setSelectedInvoiceId(""); }}>Trang sau</ButtonBar>
          <ButtonBar type="button" disabled={invoices.isFetching} onClick={() => { void invoices.refetch(); if (selectedInvoice) void lines.refetch(); }}>Làm mới</ButtonBar>
        </div>
      </> : null}
      {selectedInvoice && !invoices.isError ? <div className={styles.depositLines}>
        <h3>Tiền cọc của hợp đồng trong hóa đơn {selectedInvoice.id.slice(0, 8).toUpperCase()}</h3>
        {lines.isFetching ? <p role="status">Đang kiểm tra các dòng hóa đơn…</p> : null}
        {lines.isError ? <div className={styles.error} role="alert"><p>{getApiErrorMessage(lines.error)}</p><ButtonBar type="button" onClick={() => void lines.refetch()}>Thử lại</ButtonBar></div> : null}
        {lines.isSuccess ? <>
          <DataTable headers={["Nội dung", "Tiền cọc trên hóa đơn", "Đối chiếu hợp đồng"]} minWidth={500}>
            {depositLines.map((line, index) => <tr key={line.id ?? index}><td>{line.description || "Tiền cọc"}</td><td>{line.amount == null ? "Chưa có dữ liệu" : money(line.amount)}</td><td>{line.amount != null && depositAmount != null && line.amount === depositAmount ? "Khớp số tiền cọc" : "Cần kiểm tra số tiền cọc"}</td></tr>)}
          </DataTable>
          {!depositLines.length ? <p className={styles.notice}>Không có dòng tiền cọc khớp hợp đồng trên trang chi tiết này.{lines.data.hasNext ? " Hãy xem tiếp các trang còn lại." : " Kiểm tra các trang hoặc hóa đơn khác; nếu thiếu dòng cọc, cần bộ phận vận hành kiểm tra dữ liệu."}</p> : null}
          {depositLines.length > 0 ? <p className={styles.notice}>{selectedInvoice.status === "PAID" ? "Hóa đơn đang ghi nhận đã thanh toán. Backend sẽ kiểm tra thêm nguồn thu khi quyết toán; đây chưa phải xác nhận cọc đủ điều kiện hoàn." : "Hóa đơn chưa ở trạng thái đã thanh toán. Cần thanh toán và đối soát đủ số dư toàn bộ hóa đơn, không chỉ riêng dòng tiền cọc."}</p> : null}
          <div className={styles.depositActions}>
            <ButtonBar type="button" disabled={linePage === 0 || lines.isFetching} onClick={() => setLinePage(linePage - 1)}>Dòng trước</ButtonBar><span>Trang chi tiết {linePage + 1}</span>
            <ButtonBar type="button" disabled={!lines.data.hasNext || lines.isFetching} onClick={() => setLinePage(linePage + 1)}>Dòng tiếp</ButtonBar>
          </div>
        </> : null}
        <Link className={styles.invoiceLink} href={invoiceHref}>{role === "OWNER" ? "Mở hóa đơn và gửi chứng từ" : "Mở hóa đơn và đối soát chứng từ"}</Link>
      </div> : null}
    </div> : null}
  </section>;
}

export function ContractTerminationScreen({
  contractId,
  role,
  backHref,
}: {
  contractId: string;
  role: TerminationRole;
  backHref: string;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [type, setType] = useState<TerminationCaseRequest["type"]>("NORMAL");
  const [reason, setReason] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [pendingRequest, setPendingRequest] = useState<TerminationCaseRequest | null>(null);
  const [createdCaseId, setCreatedCaseId] = useState("");
  const [formError, setFormError] = useState("");
  const validId = ContractIdSchema.safeParse(contractId).success;
  const contract = useQuery({
    queryKey: ["dolores", "contracts", "id", contractId],
    queryFn: ({ signal }) => contractsApi.getById(contractId, signal),
    enabled: validId,
    retry: false,
  });
  const expiry = useQuery({
    queryKey: ["dolores", "contract-expiry", contractId],
    queryFn: ({ signal }) => contractsApi.getExpiry(contractId, signal),
    enabled: validId && Boolean(contract.data),
    retry: false,
  });
  const recallOrders = useQuery({
    queryKey: ["dolores", "recall-work-orders", "contract", contractId],
    queryFn: ({ signal }) => recallWorkOrdersApi.list({ contractId, page: 0, size: 100 }, signal),
    enabled: validId && Boolean(contract.data),
    retry: false,
  });
  const requestTermination = useMutation({
    mutationFn: (input: TerminationCaseRequest) => contractsApi.requestTermination(contractId, input),
    onSuccess: async (created) => {
      setPendingRequest(null);
      setCreatedCaseId(created.id);
      void router.replace({ pathname: router.pathname, query: { ...router.query, caseId: created.id } }, undefined, { shallow: true, scroll: false });
      setReason("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dolores", "contracts", "id", contractId] }),
        queryClient.invalidateQueries({ queryKey: ["dolores", "contract-expiry", contractId] }),
      ]);
    },
    onError: (error: unknown) => setFormError(getApiErrorMessage(error, "mutation")),
  });

  const submitRequest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = TerminationCaseRequestSchema.safeParse({
      type,
      reason,
      ...(effectiveDate ? { effectiveDate } : {}),
      idempotencyKey: globalThis.crypto.randomUUID(),
      correlationId: globalThis.crypto.randomUUID(),
    });
    if (!parsed.success) {
      setFormError("Vui lòng chọn loại yêu cầu và nhập lý do hợp lệ.");
      return;
    }
    setFormError("");
    setPendingRequest(parsed.data);
  };

  const sortedRecallOrders = [...(recallOrders.data?.content ?? [])].sort((left, right) =>
    Date.parse(right.createdAt ?? "") - Date.parse(left.createdAt ?? ""),
  );
  const latestRecallCaseId = sortedRecallOrders.find((order) => order.status !== "CANCELLED")?.terminationCaseId
    ?? sortedRecallOrders[0]?.terminationCaseId
    ?? "";
  const requestedCaseId = typeof router.query.caseId === "string" ? router.query.caseId : "";
  const invalidCaseId = requestedCaseId !== "" && !TerminationCaseIdSchema.safeParse(requestedCaseId).success;
  const activeCaseId = (invalidCaseId ? "" : requestedCaseId) || createdCaseId || expiry.data?.terminationCaseId || latestRecallCaseId;
  const canCreateCase = role !== "OWNER"
    && contract.data?.status === "ACTIVE"
    && expiry.isSuccess
    && recallOrders.isSuccess
    && !invalidCaseId
    && !activeCaseId;
  const detailHref = role === "ADMIN"
    ? PATH_ADMIN.CONTRACT_DETAIL(contractId)
    : role === "MODERATOR"
      ? PATH_MODERATOR.CONTRACT_DETAIL(contractId)
      : PATH_CUSTOMER.CONTRACT_DETAIL(contractId);

  return (
    <section className={styles.page} aria-labelledby="termination-page-title">
      <BackButtonHeading
        back={{ label: "Về chi tiết hợp đồng", fallbackHref: backHref || detailHref }}
        title="Chấm dứt hợp đồng"
        titleId="termination-page-title"
        description="Theo dõi yêu cầu, thu hồi máy và các bước xử lý liên quan đến hợp đồng."
        className={styles.heading}
      />

      {!validId ? <p className={styles.error} role="alert">Mã hợp đồng không hợp lệ.</p> : null}
      {invalidCaseId ? <p className={styles.error} role="alert">Mã hồ sơ chấm dứt trong đường dẫn không hợp lệ.</p> : null}
      {contract.isPending && validId ? <p className={styles.notice} role="status">Đang tải thông tin hợp đồng…</p> : null}
      {contract.isError ? (
        <div className={styles.error} role="alert">
          <p>{getApiErrorMessage(contract.error)}</p>
          <ButtonBar type="button" onClick={() => void contract.refetch()}>Thử lại</ButtonBar>
        </div>
      ) : null}

      {role !== "OWNER" && contract.data?.status === "ACTIVE" && expiry.isPending ? (
        <p className={styles.notice} role="status">Đang kiểm tra hồ sơ chấm dứt hiện có…</p>
      ) : null}
      {role !== "OWNER" && contract.data?.status === "ACTIVE" && expiry.isSuccess && recallOrders.isPending && !activeCaseId ? (
        <p className={styles.notice} role="status">Đang kiểm tra hồ sơ thu hồi đã có của hợp đồng…</p>
      ) : null}
      {contract.data?.status === "ACTIVE" && recallOrders.isError && !expiry.data?.terminationCaseId ? (
        <div className={styles.error} role="alert">
          <p>Không thể kiểm tra lệnh thu hồi đã liên kết nên chưa xác định được hồ sơ hiện có.</p>
          <ButtonBar type="button" onClick={() => void recallOrders.refetch()}>Thử lại</ButtonBar>
        </div>
      ) : null}
      {contract.data ? (
        <div className={canCreateCase ? styles.terminationStartLayout : styles.terminationReadLayout}>
          <section className={styles.contractCard} aria-label="Thông tin hợp đồng">
            <div className={styles.contractCardHeading}>
              <h2>Hợp đồng</h2>
              <span className={styles.terminationState}>{contract.data.status === "ACTIVE" ? T.CONTRACTS.ACTIVE : contract.data.status === "TERMINATED" ? T.CONTRACTS.TERMINATED : T.CONTRACTS.DRAFT}</span>
            </div>
            <dl className={styles.contractSummary}>
              <div><dt>Mã hợp đồng</dt><dd>{contract.data.id}</dd></div>
              <div><dt>Chủ sở hữu</dt><dd>{contract.data.ownerName || contract.data.ownerId}</dd></div>
              <div><dt>Máy</dt><dd>{contract.data.machineId ?? "Chưa gắn máy"}</dd></div>
              <div><dt>Thời hạn</dt><dd>{contract.data.startDate && contract.data.endDate ? `${contract.data.startDate} – ${contract.data.endDate}` : "Chưa xác định"}</dd></div>
              <div><dt>Phí thuê tháng</dt><dd>{contract.data.monthlyRentalFee == null ? "—" : `${contract.data.monthlyRentalFee.toLocaleString("vi-VN")} ₫`}</dd></div>
              <div><dt>Tiền cọc</dt><dd>{contract.data.depositAmount == null ? "—" : `${contract.data.depositAmount.toLocaleString("vi-VN")} ₫`}</dd></div>
            </dl>
          </section>
          {canCreateCase ? (
            <form className={styles.form} onSubmit={submitRequest}>
              <h2>Tạo hồ sơ chấm dứt</h2>
              <p>Sau khi tạo hồ sơ, máy chuyển sang trạng thái bảo trì. Hợp đồng vẫn có hiệu lực cho đến khi quy trình hoàn tất.</p>
              <div className={styles.formGrid}>
                <label>Loại yêu cầu
                  <select value={type} onChange={(event) => setType(event.target.value as TerminationCaseRequest["type"])}>
                    <option value="NORMAL">Kết thúc theo kỳ hạn</option>
                    <option value="EARLY">Chấm dứt trước hạn</option>
                    <option value="VIOLATION">Do vi phạm</option>
                  </select>
                </label>
                <label>Ngày hiệu lực
                  <input type="date" value={effectiveDate} onChange={(event) => setEffectiveDate(event.target.value)} />
                </label>
                <label className={styles.reasonField}>Lý do <span aria-hidden="true">*</span>
                  <textarea required maxLength={2000} value={reason} onChange={(event) => setReason(event.target.value)} />
                </label>
              </div>
              {formError ? <p className={styles.error} role="alert">{formError}</p> : null}
              {requestTermination.isError ? <p className={styles.error} role="alert">{getApiErrorMessage(requestTermination.error, "mutation")}</p> : null}
              {requestTermination.isSuccess ? <p className={styles.success} role="status">Đã tạo hồ sơ. Máy được chuyển sang trạng thái bảo trì; hợp đồng vẫn hiệu lực đến khi quy trình hoàn tất.</p> : null}
              <ButtonBar type="submit" disabled={requestTermination.isPending}>
                {requestTermination.isPending ? "Đang gửi yêu cầu…" : "Tạo hồ sơ chấm dứt"}
              </ButtonBar>
            </form>
          ) : null}
        </div>
      ) : null}

      {role !== "OWNER" && contract.data?.status === "ACTIVE" && activeCaseId ? (
        <p className={styles.notice} role="status">Hợp đồng đã có hồ sơ chấm dứt. Các bước xử lý được theo dõi bên dưới.</p>
      ) : null}
      {role === "OWNER" && !activeCaseId && expiry.isSuccess && recallOrders.isSuccess ? (
        <p className={styles.notice} role="status">Hợp đồng chưa có hồ sơ chấm dứt được liên kết.</p>
      ) : null}
      {expiry.isError ? (
        <div className={styles.error} role="alert">
          <p>Không tải được trạng thái hồ sơ chấm dứt: {getApiErrorMessage(expiry.error)}</p>
          <ButtonBar type="button" onClick={() => void expiry.refetch()}>Thử tải lại</ButtonBar>
        </div>
      ) : null}
      {activeCaseId && contract.data ? (
        <DepositCollectionSection key={`${role}:${contractId}:${contract.data.ownerId}`} contractId={contractId} ownerId={contract.data.ownerId} depositAmount={contract.data.depositAmount} startDate={contract.data.startDate} role={role} />
      ) : null}
      {activeCaseId ? (
        <TerminationWorkflowPanel
          key={`${role}:${contractId}:${activeCaseId}`}
          mode={role === "OWNER" ? "owner" : "operator"}
          role={role}
          contractId={contractId}
          contractStatus={contract.data?.status}
          caseId={activeCaseId}
        />
      ) : null}

      {pendingRequest ? (
        <NotificationDialog
          variant="confirm"
          title="Tạo hồ sơ chấm dứt hợp đồng?"
          description="Hồ sơ sẽ được tạo để theo dõi quá trình xử lý. Máy chuyển sang trạng thái bảo trì ngay khi backend ghi nhận; hợp đồng vẫn hiệu lực đến bước hoàn tất cuối cùng."
          primaryAction={{
            label: "Tạo hồ sơ",
            pending: requestTermination.isPending,
            pendingLabel: "Đang tạo…",
            onClick: () => requestTermination.mutate(pendingRequest),
          }}
          secondaryAction={{ label: "Quay lại", disabled: requestTermination.isPending, onClick: () => setPendingRequest(null) }}
          onClose={() => { if (!requestTermination.isPending) setPendingRequest(null); }}
          closeOnEscape={!requestTermination.isPending}
        >
          {formError ? <p className={styles.error} role="alert">{formError}</p> : null}
        </NotificationDialog>
      ) : null}
    </section>
  );
}
