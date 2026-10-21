"use client";

import type { AdminContractView } from "@/routes/query";
import { DoloresApiError } from "@/apis/dolores/client";
import { DoloresApiErrorState, DoloresEmptyState, DoloresLoadingState } from "@/app/_ui/dolores/DoloresApiState";
import { DoloresButton, DoloresNotice, DoloresPanel, DoloresPanelTitle, DoloresTable } from "@/app/_ui/dolores/DoloresUI";
import { DoloresPage } from "@/app/_shell/dolores/DoloresShell";
import { useRouteView } from "@/app/(admin)/admin/_components/useRouteView";
import { describeDoloresError } from "@/hooks/dolores/queryPolicy";
import { useTenants } from "@/hooks/dolores/useTenants";
import {
  useContractDetail,
  useContractDocuments,
  useContractExpiryStatus,
  useContractMachineHistory,
  useDownloadContractDocument,
  usePlatformContracts,
} from "@/hooks/dolores/useContracts";
import { ContractIdSchema, type Contract, type ContractDocument } from "@/schemas/dolores/contracts";

function ContractField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-[46px] flex-col gap-1">
      <span className="text-[11px] leading-4 text-[#706561]">{label}</span>
      <strong className="break-words text-[13px] font-semibold leading-5 text-[#302927]">{value}</strong>
    </div>
  );
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return "—";
  return new Intl.DateTimeFormat("vi-VN").format(new Date(year, month - 1, day));
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatMoney(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 2 }).format(amount)
    : "—";
}

function contractStatus(status: Contract["status"]): string {
  if (status === "ACTIVE") return "Đang hiệu lực";
  if (status === "DRAFT") return "Bản nháp";
  return "Đã kết thúc";
}

function tenantLabel(tenantId: string, tenants: ReturnType<typeof useTenants>["data"]): string {
  const tenant = tenants?.find((item) => item.id === tenantId);
  return tenant?.name ?? `Tenant ${tenantId.slice(0, 8)}`;
}

function TenantCell({ tenantId, tenants }: { tenantId: string; tenants: ReturnType<typeof useTenants>["data"] }) {
  return (
    <span className="inline-flex flex-col" title={tenantId}>
      <span>{tenantLabel(tenantId, tenants)}</span>
      <span className="text-[10px] text-[#706561]">{tenantId.slice(0, 8).toUpperCase()}</span>
    </span>
  );
}

function openContract(setView: (view: AdminContractView, params?: Record<string, string | null>) => void, contract: Contract) {
  setView("detail", { contractId: contract.id, tenantId: contract.tenantId });
}

function documentRows(
  documents: ContractDocument[],
  contractId: string,
  download: ReturnType<typeof useDownloadContractDocument>
) {
  return documents.map((document) => {
    const downloadInput = { contractId, documentId: document.id, filename: document.originalFilename };
    const isCurrentDownload = download.variables?.documentId === document.id;
    return [
      <span key={document.id} className="font-medium">{document.originalFilename}</span>,
      document.documentType,
      `${(document.sizeBytes / 1024 / 1024).toFixed(2)} MB · v${document.version}`,
      document.archivedAt ? "Đã lưu trữ" : formatDateTime(document.uploadedAt),
      <DoloresButton
        key={`${document.id}-download`}
        variant="secondary"
        disabled={download.isPending}
        onClick={() => download.mutate(downloadInput)}
      >
        {download.isPending && isCurrentDownload ? "Đang tải…" : "Tải xuống"}
      </DoloresButton>,
    ];
  });
}

export default function AdminContractScreens({
  initialView = "list",
  initialContractId,
  initialTenantId,
}: {
  initialView?: AdminContractView;
  initialContractId?: string;
  initialTenantId?: string;
}) {
  const [view, setView] = useRouteView<AdminContractView>(initialView);
  const tenants = useTenants();
  const platformContracts = usePlatformContracts(tenants.data, view === "list");
  const contractId = initialContractId;
  const tenantId = initialTenantId;
  const validRouteIds = Boolean(
    contractId && tenantId && ContractIdSchema.safeParse(contractId).success && ContractIdSchema.safeParse(tenantId).success
  );
  const detail = useContractDetail(tenantId, contractId, view !== "list" && validRouteIds);
  const tenantMatches = Boolean(detail.data && detail.data.tenantId === tenantId);
  const relatedReadsEnabled = view === "detail" && tenantMatches;
  const documents = useContractDocuments(tenantId, contractId, relatedReadsEnabled);
  const expiry = useContractExpiryStatus(tenantId, contractId, relatedReadsEnabled);
  const history = useContractMachineHistory(tenantId, detail.data?.machineId, view === "history" && tenantMatches);
  const download = useDownloadContractDocument();

  const listUrl = () => setView("list", { contractId: null, tenantId: null });
  const refreshContracts = () => {
    void tenants.refetch();
    platformContracts.refetchAll();
  };

  if (view === "list") {
    const contractRows = platformContracts.contracts.map(({ tenant, contract }) => [
      <button
        className="font-semibold hover:text-[#B81724]"
        key={contract.id}
        onClick={() => openContract(setView, contract)}
        title={contract.id}
        aria-label={`Mở hợp đồng ${contract.id}`}
      >
        {contract.id.slice(0, 8).toUpperCase()}
      </button>,
      <TenantCell tenantId={tenant.id} tenants={tenants.data} key={`${contract.id}-tenant`} />,
      contract.machineId ? <span title={contract.machineId}>{contract.machineId.slice(0, 8).toUpperCase()}</span> : "Chưa gắn máy",
      `${formatDate(contract.startDate)} – ${formatDate(contract.endDate)}`,
      contractStatus(contract.status),
    ]);

    return (
      <DoloresPage
        title="Hợp đồng & trạng thái"
        description="Danh sách hợp đồng theo tenant từ Dolores. ID rút gọn và mã máy đều là tiền tố UUID trả về từ API."
        actions={<DoloresButton variant="secondary" onClick={refreshContracts} disabled={tenants.isFetching || platformContracts.isLoading}>Tải lại</DoloresButton>}
      >
        {tenants.isPending ? <DoloresLoadingState /> : tenants.isError ? (
          <DoloresApiErrorState error={tenants.error} onRetry={() => { void tenants.refetch(); }} />
        ) : (
          <>
            {platformContracts.isLoading && platformContracts.contracts.length === 0 && <DoloresLoadingState />}
            {platformContracts.failedTenants.length > 0 && (
              <DoloresNotice title="Chưa tải được hợp đồng của một số tenant" tone="warning">
                <ul className="mb-3 list-disc pl-5">
                  {platformContracts.failedTenants.map(({ tenant, error }) => (
                    <li key={tenant.id}>{tenant.name}: {describeDoloresError(error)}</li>
                  ))}
                </ul>
                <p className="mb-3">Nếu tenant đang lỗi có dữ liệu cache, các hàng đó có thể chưa mới nhất. Tổng hợp chỉ đầy đủ sau khi tải lại thành công.</p>
                <DoloresButton variant="secondary" onClick={platformContracts.retryFailed}>Thử lại tenant lỗi</DoloresButton>
              </DoloresNotice>
            )}
            {platformContracts.isLoading && platformContracts.contracts.length > 0 && (
              <p className="text-sm text-[#706561]" role="status">Đang tải hợp đồng từ các tenant còn lại…</p>
            )}
            <DoloresPanel>
              <DoloresPanelTitle>
                {platformContracts.contracts.length} hợp đồng
                {(platformContracts.isLoading || platformContracts.failedTenants.length > 0) && tenants.data
                  ? ` đã tải từ ${platformContracts.completedTenantCount}/${tenants.data.length} tenant`
                  : ""}
              </DoloresPanelTitle>
              {tenants.data?.length === 0 ? (
                <DoloresEmptyState message="Backend chưa trả về tenant nào trong phạm vi tài khoản này." />
              ) : platformContracts.contracts.length === 0 && !platformContracts.isLoading && platformContracts.failedTenants.length === 0 ? (
                <DoloresEmptyState message="Không có hợp đồng trong các tenant đã tải thành công." />
              ) : (
                <DoloresTable
                  headers={["Hợp đồng · UUID", "Tenant nguồn", "Máy · UUID", "Thời hạn", "Trạng thái"]}
                  rows={contractRows}
                  emptyMessage={platformContracts.failedTenants.length > 0 ? "Chưa có hợp đồng từ các tenant tải thành công." : undefined}
                />
              )}
              {tenants.data && platformContracts.failedTenants.length > 0 && (
                <p className="mt-3 text-xs text-[#706561]" role="status">
                  Đã tải {platformContracts.completedTenantCount}/{tenants.data.length} tenant; tổng hợp đồng hiện chưa đầy đủ.
                </p>
              )}
            </DoloresPanel>
          </>
        )}
      </DoloresPage>
    );
  }

  if (!validRouteIds) {
    return (
      <DoloresPage title="Hợp đồng" description="Liên kết chi tiết cần UUID hợp lệ của tenant và hợp đồng." actions={<DoloresButton variant="secondary" onClick={listUrl}>Về danh sách</DoloresButton>}>
        <DoloresEmptyState message="Hãy mở hợp đồng từ danh sách để có đủ tenantId và contractId." />
      </DoloresPage>
    );
  }

  if (detail.isPending) {
    return <DoloresPage title="Hợp đồng" description="Đang tải hồ sơ từ Dolores." actions={<DoloresButton variant="secondary" onClick={listUrl}>Về danh sách</DoloresButton>}><DoloresLoadingState /></DoloresPage>;
  }

  if (detail.isError) {
    const content = detail.error instanceof DoloresApiError && detail.error.kind === "not_found"
      ? <DoloresEmptyState message="Không tìm thấy hợp đồng theo UUID này hoặc hợp đồng nằm ngoài phạm vi tài khoản." />
      : <DoloresApiErrorState error={detail.error} onRetry={() => { void detail.refetch(); }} />;
    return <DoloresPage title="Hợp đồng" description="Không tải được hồ sơ hợp đồng." actions={<DoloresButton variant="secondary" onClick={listUrl}>Về danh sách</DoloresButton>}>{content}</DoloresPage>;
  }

  const contract = detail.data;
  if (!contract || !tenantId || contract.tenantId !== tenantId) {
    return (
      <DoloresPage title="Hợp đồng" description="Tenant của liên kết không khớp dữ liệu do Dolores trả về." actions={<DoloresButton variant="secondary" onClick={listUrl}>Về danh sách</DoloresButton>}>
        <DoloresNotice title="Không thể xác nhận tenant nguồn" tone="warning">Mở lại hồ sơ từ danh sách hợp đồng để kiểm tra tenant và UUID cùng nhau.</DoloresNotice>
      </DoloresPage>
    );
  }

  const tenantName = tenantLabel(contract.tenantId, tenants.data);
  const isHistory = view === "history";
  const pageActions = isHistory ? (
    <>
      <DoloresButton onClick={() => setView("detail", { contractId: contract.id, tenantId: contract.tenantId })}>Chi tiết hợp đồng</DoloresButton>
      <DoloresButton variant="secondary" onClick={listUrl}>Về danh sách</DoloresButton>
    </>
  ) : (
    <>
      <DoloresButton onClick={() => setView("history", { contractId: contract.id, tenantId: contract.tenantId })} disabled={!contract.machineId}>Lịch sử theo máy</DoloresButton>
      <DoloresButton variant="secondary" onClick={listUrl}>Về danh sách</DoloresButton>
    </>
  );

  if (isHistory) {
    const historyRows = (history.data ?? []).map((item) => [
      <button
        className="font-semibold hover:text-[#B81724]"
        key={item.id}
        onClick={() => openContract(setView, item)}
        title={item.id}
        aria-label={`Mở hợp đồng ${item.id}`}
      >
        {item.id.slice(0, 8).toUpperCase()}
      </button>,
      <TenantCell tenantId={item.tenantId} tenants={tenants.data} key={`${item.id}-tenant`} />,
      `${formatDate(item.startDate)} – ${formatDate(item.endDate)}`,
      contractStatus(item.status),
    ]);
    return (
      <DoloresPage title={`Lịch sử máy · ${contract.id.slice(0, 8).toUpperCase()}`} description="Lịch sử hợp đồng lấy theo machine UUID; tenant nguồn được giữ trên từng hàng." actions={pageActions}>
        {!contract.machineId ? <DoloresEmptyState message="Hợp đồng này chưa được gắn với máy nên chưa thể truy vấn lịch sử theo machine." /> : history.isPending ? <DoloresLoadingState /> : history.isError ? (
          <DoloresApiErrorState error={history.error} onRetry={() => { void history.refetch(); }} />
        ) : (history.data ?? []).length === 0 ? <DoloresEmptyState message="API không trả về lịch sử hợp đồng cho máy này." /> : (
          <DoloresPanel>
            <DoloresPanelTitle>Hợp đồng theo máy</DoloresPanelTitle>
            <DoloresTable headers={["Hợp đồng · UUID", "Tenant nguồn", "Thời hạn", "Trạng thái"]} rows={historyRows} />
          </DoloresPanel>
        )}
      </DoloresPage>
    );
  }

  return (
    <DoloresPage title={`Hợp đồng · ${contract.id.slice(0, 8).toUpperCase()}`} description={`Hồ sơ ${contractStatus(contract.status).toLowerCase()} từ Dolores · tenant ${tenantName}.`} actions={pageActions}>
      <DoloresPanel>
        <DoloresPanelTitle>Thông tin hợp đồng</DoloresPanelTitle>
        <div className="grid grid-cols-1 gap-x-4 gap-y-7 sm:grid-cols-2">
          <ContractField label="Contract UUID" value={contract.id} />
          <ContractField label="Tenant nguồn" value={`${tenantName} · ${contract.tenantId}`} />
          <ContractField label="Machine UUID" value={contract.machineId ?? "Chưa gắn máy"} />
          <ContractField label="Trạng thái" value={contractStatus(contract.status)} />
          <ContractField label="Thời hạn" value={`${formatDate(contract.startDate)} – ${formatDate(contract.endDate)}`} />
          <ContractField label="Loại máy theo hợp đồng" value={contract.machineTypeSnapshot ?? "—"} />
          <ContractField label="Phí thuê hàng tháng" value={formatMoney(contract.monthlyRentalFee)} />
          <ContractField label="Giá mỗi đơn vị PAYG" value={formatMoney(contract.paygUnitPrice)} />
          <ContractField label="Tiền cọc" value={formatMoney(contract.depositAmount)} />
          <ContractField label="Phí lắp đặt" value={formatMoney(contract.installationFee)} />
          <ContractField label="Giới hạn offline" value={contract.offlineLimitMinutes == null ? "—" : `${contract.offlineLimitMinutes} phút`} />
          <ContractField label="Hợp đồng legacy chưa ánh xạ" value={contract.legacyUnmapped ? "Có" : "Không"} />
        </div>
        {(contract.termsSnapshot ?? contract.terms) && (
          <div className="mt-6 border-t border-[#F0ECE8] pt-5">
            <p className="mb-2 text-[11px] text-[#706561]">Điều khoản do backend trả về</p>
            <p className="whitespace-pre-wrap text-sm leading-6 text-[#302927]">{contract.termsSnapshot ?? contract.terms}</p>
          </div>
        )}
      </DoloresPanel>

      <DoloresPanel>
        <DoloresPanelTitle>Trạng thái hết hạn</DoloresPanelTitle>
        {expiry.isPending ? <DoloresLoadingState /> : expiry.isError ? (
          <DoloresApiErrorState error={expiry.error} onRetry={() => { void expiry.refetch(); }} />
        ) : expiry.data ? (
          <div className="grid grid-cols-1 gap-x-4 gap-y-7 sm:grid-cols-2">
            <ContractField label="Ngày hết hạn" value={formatDate(expiry.data.expiryDate)} />
            <ContractField label="Ngày nhắc theo lịch" value={formatDate(expiry.data.reminderDate)} />
            <ContractField label="Đã gửi nhắc lúc" value={formatDateTime(expiry.data.reminderSentAt)} />
            <ContractField label="Quyết định đã ghi nhận" value={expiry.data.decision ?? "Chưa có"} />
            <ContractField label="Thời điểm quyết định" value={formatDateTime(expiry.data.decidedAt)} />
            <ContractField label="Xử lý hết hạn lúc" value={formatDateTime(expiry.data.expiryProcessedAt)} />
          </div>
        ) : <DoloresEmptyState message="API chưa trả trạng thái hết hạn cho hợp đồng này." />}
      </DoloresPanel>

      <DoloresPanel>
        <DoloresPanelTitle>Tài liệu trong hồ sơ</DoloresPanelTitle>
        {documents.isPending ? <DoloresLoadingState /> : documents.isError ? (
          <DoloresApiErrorState error={documents.error} onRetry={() => { void documents.refetch(); }} />
        ) : (documents.data ?? []).length === 0 ? <DoloresEmptyState message="Hợp đồng chưa có metadata tài liệu được API trả về." /> : (
          <DoloresTable
            headers={["Tệp", "Loại", "Dung lượng · phiên bản", "Trạng thái / ngày tải", ""]}
            rows={documentRows(documents.data ?? [], contract.id, download)}
          />
        )}
        {download.isError && download.variables?.contractId === contract.id && (
          <div className="mt-4">
            <DoloresApiErrorState error={download.error} onRetry={() => download.mutate(download.variables!)} />
          </div>
        )}
      </DoloresPanel>
    </DoloresPage>
  );
}
