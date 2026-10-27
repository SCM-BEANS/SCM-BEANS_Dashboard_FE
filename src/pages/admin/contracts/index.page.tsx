import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { useState } from "react";
import { contractsApi } from "@/apis/contracts.api";
import { getApiErrorMessage } from "@/lib/api-errors";
import { profilesApi } from "@/apis/profiles.api";
import { ContractIdSchema } from "@/schema/contracts.schema";
import { ADMIN_OPERATIONS_MESSAGES as T } from "@/text/admin/admin-operations-messages";
import { ButtonBar } from "@/components/button/button-bar";
import { ContractCreateForm } from "@/components/create-form/contract-create-form";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import { NotificationDialog } from "@/components/notification-dialog/notification-dialog";
import { DataTable } from "@/components/table/data-table";
import { ActionBar } from "@/components/action-bar/action-bar";
import { AdminShell, adminStyles as styles } from "../admin-shell";
import { getContractsBackDestination } from "../admin-back-destination";

const queryValue = (value: string | string[] | undefined) => typeof value === "string" ? value : "";
function date(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleDateString("vi-VN");
}
function dateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "—" : parsed.toLocaleString("vi-VN");
}
function money(value: number | null | undefined): string {
  return value == null ? "—" : new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 2 }).format(value);
}
function status(value: string): string {
  if (value === "ACTIVE") return T.CONTRACTS.ACTIVE;
  if (value === "DRAFT") return T.CONTRACTS.DRAFT;
  return T.CONTRACTS.TERMINATED;
}

function ContractsContent() {
  const router = useRouter();
  const [createdContractId, setCreatedContractId] = useState("");
  const view = queryValue(router.query.view);
  const contractId = queryValue(router.query.id);
  const machineId = queryValue(router.query.machineId);
  const contracts = useQuery({ queryKey: ["dolores", "contracts"], queryFn: ({ signal }) => contractsApi.list(signal), enabled: view === "" || view === "list" });
  const owners = useQuery({
    queryKey: ["dolores", "profiles", "owner-directory"],
    queryFn: async ({ signal }) => {
      const first = await profilesApi.list({ role: "OWNER", page: 0, size: 100 }, signal);
      const pages = [first];
      for (let index = 1; index < first.totalPages; index += 5) {
        const numbers = Array.from({ length: Math.min(5, first.totalPages - index) }, (_, offset) => index + offset);
        pages.push(...await Promise.all(numbers.map((page) => profilesApi.list({ role: "OWNER", page, size: 100 }, signal))));
        if (signal?.aborted) break;
      }
      return pages.flatMap((page) => page.items);
    },
  });
  const contract = useQuery({ queryKey: ["dolores", "contract", contractId], queryFn: ({ signal }) => contractsApi.getById(contractId, signal), enabled: view !== "list" && ContractIdSchema.safeParse(contractId).success });
  const expiry = useQuery({ queryKey: ["dolores", "contract-expiry", contractId], queryFn: ({ signal }) => contractsApi.getExpiry(contractId, signal), enabled: view === "detail" && Boolean(contract.data) });
  const documents = useQuery({ queryKey: ["dolores", "contract-documents", contractId], queryFn: ({ signal }) => contractsApi.getDocuments(contractId, signal), enabled: view === "detail" && Boolean(contract.data) });
  const history = useQuery({ queryKey: ["dolores", "machine-contract-history", machineId], queryFn: ({ signal }) => contractsApi.getMachineHistory(machineId, signal), enabled: view === "history" && ContractIdSchema.safeParse(machineId).success });
  const download = useMutation({ mutationFn: ({ id, filename }: { id: string; filename: string }) => contractsApi.downloadDocument(contractId, id), onSuccess: (blob, input) => {
    const safeFilename = input.filename.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").slice(0, 180) || "contract-document";
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
    anchor.href = url; anchor.download = safeFilename; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } });
  const navigate = (query?: Record<string, string>) => {
    if (query?.view === "create") {
      setCreatedContractId("");
    }
    void router.push({ pathname: "/admin/contracts", query }, undefined, { shallow: true });
  };
  const ownerName = (id: string) => owners.data?.find((item) => item.idaasUserId === id)?.fullName ?? `${T.COMMON.OWNER} ${id.slice(0, 8)}`;
  const pageTitle = view === "create" ? T.CONTRACTS.CREATE_TITLE : view === "history" ? T.CONTRACTS.HISTORY : view === "detail" ? `${T.CONTRACTS.DETAIL} · ${contractId.slice(0, 8).toUpperCase()}` : T.CONTRACTS.TITLE;

  return <>
  <div className={styles.pageContent}>
    <BackButtonHeading
      title={pageTitle}
      titleId="admin-contracts-title"
      description={view === "create" ? T.CONTRACTS.CREATE_DESCRIPTION : T.CONTRACTS.DESCRIPTION}
      className={styles.pageHeading}
      back={getContractsBackDestination(router.query)}
    />
    {(view === "" || view === "list") && <>
      {contracts.isPending && <section className={styles.panel} role="status">{T.COMMON.LOADING}</section>}
      {contracts.isError && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{getApiErrorMessage(contracts.error)}</p><ButtonBar type="button" onClick={() => void contracts.refetch()}>{T.COMMON.RETRY}</ButtonBar></div>}
      {contracts.data && <section className={styles.panel}><h2>{contracts.data.length} hợp đồng</h2>
        {owners.isError && <p className={styles.operationsNotice} role="status">{T.CONTRACTS.UNKNOWN_OWNER}. {getApiErrorMessage(owners.error)}</p>}
        {contracts.data.length === 0 ? <p className={styles.emptyText}>{T.COMMON.EMPTY}</p> : <DataTable
          rows={contracts.data}
          rowKey={(item) => item.id}
          columns={[
            { key: "contract", header: "Hợp đồng", render: (item) => <button className={styles.accountTextButton} type="button" onClick={() => navigate({ view: "detail", id: item.id })}>{item.id.slice(0, 8).toUpperCase()}</button> },
            { key: "owner", header: T.COMMON.OWNER, render: (item) => ownerName(item.ownerId), cellProps: (item) => ({ title: item.ownerId }) },
            { key: "machine", header: "Máy", render: (item) => item.machineId?.slice(0, 8).toUpperCase() ?? T.CONTRACTS.NO_MACHINE },
            { key: "period", header: "Thời hạn", render: (item) => `${date(item.startDate)} – ${date(item.endDate)}` },
            { key: "status", header: "Trạng thái", render: (item) => status(item.status) },
          ]}
        />}
      </section>}
    </>}
    {view === "create" && <ContractCreateForm
      onCreated={(id) => {
        setCreatedContractId(id);
        void router.push({ pathname: "/admin/contracts" }, undefined, { shallow: true });
      }}
    />}
    {view === "detail" && <>
      {!ContractIdSchema.safeParse(contractId).success && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert">Mã hợp đồng không hợp lệ.</div>}
      {contract.isPending && <section className={styles.panel} role="status">{T.COMMON.LOADING}</section>}
      {contract.isError && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{getApiErrorMessage(contract.error)}</p><ButtonBar type="button" onClick={() => void contract.refetch()}>{T.COMMON.RETRY}</ButtonBar></div>}
      {contract.data && <>
        <section className={styles.panel}><h2>{T.CONTRACTS.DETAIL}</h2><div className={styles.operationsGrid}>
          <div><span>Mã hợp đồng</span><strong>{contract.data.id}</strong></div><div><span>{T.COMMON.OWNER}</span><strong>{ownerName(contract.data.ownerId)} · {contract.data.ownerId}</strong></div>
          <div><span>Mã máy</span><strong>{contract.data.machineId ?? T.CONTRACTS.NO_MACHINE}</strong></div><div><span>Trạng thái</span><strong>{status(contract.data.status)}</strong></div>
          <div><span>Thời hạn</span><strong>{date(contract.data.startDate)} – {date(contract.data.endDate)}</strong></div><div><span>Loại máy</span><strong>{contract.data.machineTypeSnapshot ?? "—"}</strong></div>
          <div><span>Phí thuê hàng tháng</span><strong>{money(contract.data.monthlyRentalFee)}</strong></div><div><span>Giá PAYG</span><strong>{money(contract.data.paygUnitPrice)}</strong></div>
          <div><span>Tiền cọc</span><strong>{money(contract.data.depositAmount)}</strong></div><div><span>Phí lắp đặt</span><strong>{money(contract.data.installationFee)}</strong></div>
          <div><span>Giới hạn offline</span><strong>{contract.data.offlineLimitMinutes == null ? "—" : `${contract.data.offlineLimitMinutes} phút`}</strong></div>
        </div>
        {(contract.data.termsSnapshot ?? contract.data.terms) && <p className={styles.panelSubtitle}>{contract.data.termsSnapshot ?? contract.data.terms}</p>}</section>
        <section className={styles.panel}><h2>Trạng thái hết hạn</h2>
          {expiry.isPending && <p role="status">{T.COMMON.LOADING}</p>}
          {expiry.isError && <div className={styles.operationsNotice} role="alert">{getApiErrorMessage(expiry.error)} <ButtonBar type="button" onClick={() => void expiry.refetch()}>{T.COMMON.RETRY}</ButtonBar></div>}
          {expiry.data && <div className={styles.operationsGrid}><div><span>Ngày hết hạn</span><strong>{date(expiry.data.expiryDate)}</strong></div><div><span>Ngày nhắc</span><strong>{date(expiry.data.reminderDate)}</strong></div><div><span>Đã gửi nhắc lúc</span><strong>{dateTime(expiry.data.reminderSentAt)}</strong></div><div><span>Quyết định</span><strong>{expiry.data.decision ?? "Chưa có"}</strong></div><div><span>Thời điểm quyết định</span><strong>{dateTime(expiry.data.decidedAt)}</strong></div></div>}
        </section>
        <section className={styles.panel}><h2>{T.CONTRACTS.DOCUMENTS}</h2>
          {documents.isPending && <p role="status">{T.COMMON.LOADING}</p>}
          {documents.isError && <div className={styles.operationsNotice} role="alert">{getApiErrorMessage(documents.error)} <ButtonBar type="button" onClick={() => void documents.refetch()}>{T.COMMON.RETRY}</ButtonBar></div>}
          {documents.data && documents.data.length === 0 && <p className={styles.emptyText}>{T.COMMON.EMPTY}</p>}
          {documents.data && documents.data.length > 0 && <DataTable
            rows={documents.data}
            rowKey={(doc) => doc.id}
            columns={[
              { key: "file", header: "Tệp", render: (doc) => doc.originalFilename },
              { key: "type", header: "Loại", render: (doc) => doc.documentType },
              { key: "size", header: "Dung lượng · phiên bản", render: (doc) => `${(doc.sizeBytes / 1024 / 1024).toFixed(2)} MB · v${doc.version}` },
              { key: "uploaded", header: "Ngày tải", render: (doc) => doc.archivedAt ? "Đã lưu trữ" : dateTime(doc.uploadedAt) },
              { key: "actions", header: "", render: (doc) => <ButtonBar type="button" disabled={download.isPending} onClick={() => download.mutate({ id: doc.id, filename: doc.originalFilename })}>{download.isPending && download.variables?.id === doc.id ? "Đang tải…" : T.CONTRACTS.DOWNLOAD}</ButtonBar> },
            ]}
          />}
          {download.isError && <p className={styles.operationsNotice} role="alert">Không tải được tài liệu. Vui lòng thử lại.</p>}
        </section>
      </>}
    </>}
    {view === "history" && <>
      {!ContractIdSchema.safeParse(machineId).success && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert">Mã máy không hợp lệ.</div>}
      {history.isPending && <section className={styles.panel} role="status">{T.COMMON.LOADING}</section>}
      {history.isError && <div className={`${styles.notice} ${styles.errorNotice}`} role="alert"><p>{getApiErrorMessage(history.error)}</p><ButtonBar type="button" onClick={() => void history.refetch()}>{T.COMMON.RETRY}</ButtonBar></div>}
      {history.data && <section className={styles.panel}><h2>Hợp đồng theo máy</h2>{history.data.length === 0 ? <p className={styles.emptyText}>{T.COMMON.EMPTY}</p> : <DataTable
        rows={history.data}
        rowKey={(item) => item.id}
        columns={[
          { key: "contract", header: "Hợp đồng", render: (item) => <button className={styles.accountTextButton} type="button" onClick={() => navigate({ view: "detail", id: item.id })}>{item.id.slice(0, 8).toUpperCase()}</button> },
          { key: "owner", header: T.COMMON.OWNER, render: (item) => ownerName(item.ownerId) },
          { key: "period", header: "Thời hạn", render: (item) => `${date(item.startDate)} – ${date(item.endDate)}` },
          { key: "status", header: "Trạng thái", render: (item) => status(item.status) },
        ]}
      />}</section>}
    </>}
  </div>
  {(view === "" || view === "list") && <ActionBar>
        <ButtonBar type="button" onClick={() => navigate({ view: "create" })}>{T.CONTRACTS.CREATE}</ButtonBar>
        <ButtonBar type="button" disabled={contracts.isFetching || owners.isFetching} onClick={() => { void Promise.all([contracts.refetch(), owners.refetch()]); }}>{T.COMMON.RETRY}</ButtonBar>
  </ActionBar>}
  {view === "detail" && contract.data?.machineId && <ActionBar>
    <ButtonBar type="button" onClick={() => navigate({ view: "history", id: contract.data!.id, machineId: contract.data!.machineId! })}>{T.CONTRACTS.HISTORY}</ButtonBar>
  </ActionBar>}
  {(view === "" || view === "list") && createdContractId && (
    <NotificationDialog
      variant="success"
      title={T.CONTRACTS.CREATED}
      description={`M\u00e3 h\u1ee3p \u0111\u1ed3ng: ${createdContractId}`}
      primaryAction={{
        label: T.CONTRACTS.DETAIL,
        onClick: () => {
          const id = createdContractId;
          setCreatedContractId("");
          navigate({ view: "detail", id });
        },
      }}
      onClose={() => setCreatedContractId("")}
    />
  )}
  </>;
}

export default function AdminContractsPage() { return <AdminShell><ContractsContent /></AdminShell>; }
