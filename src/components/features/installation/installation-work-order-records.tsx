import { useQuery } from "@tanstack/react-query";
import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { installationWorkOrdersApi } from "@/apis/installation-work-orders.api";
import { ButtonBar } from "@/components/button/button-bar";
import { DataTable } from "@/components/table/data-table";
import { StatusBadge, type StatusBadgeTone } from "@/components/status-badge/status-badge";
import { getApiErrorMessage } from "@/lib/api-errors";
import type { InstallationWorkOrderDetails } from "@/schema/installation-work-orders.schema";
import styles from "./installation-work-order-records.module.css";

export type InstallationWorkOrderRecordsTab = "checklist" | "accessories" | "evidence";

const PAGE_SIZE = 50;
const tabs: Array<{ id: InstallationWorkOrderRecordsTab; label: string }> = [
  { id: "checklist", label: "Danh sách kiểm tra" },
  { id: "accessories", label: "Phụ kiện bàn giao" },
  { id: "evidence", label: "Chứng từ" },
];

const resultLabels: Record<string, { label: string; tone: StatusBadgeTone }> = {
  PENDING: { label: "Chờ xử lý", tone: "warning" },
  PASSED: { label: "Đạt", tone: "success" },
  FAILED: { label: "Không đạt", tone: "danger" },
  NOT_APPLICABLE: { label: "Không áp dụng", tone: "neutral" },
};

export function installationWorkOrderRecordsQueryKey(
  workOrderId: string,
  tab: InstallationWorkOrderRecordsTab,
  page: number,
) {
  return ["dolores", "installation-work-order-records", workOrderId, tab, page, PAGE_SIZE] as const;
}

export function installationWorkOrderRecordsQueryPrefix(
  workOrderId: string,
  tab: InstallationWorkOrderRecordsTab,
) {
  return ["dolores", "installation-work-order-records", workOrderId, tab] as const;
}

type ChecklistItem = InstallationWorkOrderDetails["checklistItems"][number];
type Evidence = InstallationWorkOrderDetails["evidence"][number];

export function InstallationWorkOrderRecords({
  workOrderId,
  renderChecklistActions,
  accessoryActions,
  renderEvidenceActions,
  checklistMessage,
  evidenceMessage,
  evidenceActions,
}: {
  workOrderId: string;
  renderChecklistActions?: (item: ChecklistItem) => ReactNode;
  accessoryActions?: ReactNode;
  renderEvidenceActions?: (item: Evidence) => ReactNode;
  checklistMessage?: ReactNode;
  evidenceMessage?: ReactNode;
  evidenceActions?: ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<InstallationWorkOrderRecordsTab>("checklist");
  const [pages, setPages] = useState<Record<InstallationWorkOrderRecordsTab, number>>({
    checklist: 0,
    accessories: 0,
    evidence: 0,
  });
  const tabButtons = useRef<Array<HTMLButtonElement | null>>([]);

  const checklist = useQuery({
    queryKey: installationWorkOrderRecordsQueryKey(workOrderId, "checklist", pages.checklist),
    queryFn: ({ signal }) => installationWorkOrdersApi.listChecklistItems(workOrderId, { page: pages.checklist, size: PAGE_SIZE }, signal),
    enabled: activeTab === "checklist",
    retry: false,
  });
  const accessories = useQuery({
    queryKey: installationWorkOrderRecordsQueryKey(workOrderId, "accessories", pages.accessories),
    queryFn: ({ signal }) => installationWorkOrdersApi.listAccessories(workOrderId, { page: pages.accessories, size: PAGE_SIZE }, signal),
    enabled: activeTab === "accessories",
    retry: false,
  });
  const evidence = useQuery({
    queryKey: installationWorkOrderRecordsQueryKey(workOrderId, "evidence", pages.evidence),
    queryFn: ({ signal }) => installationWorkOrdersApi.listEvidence(workOrderId, { page: pages.evidence, size: PAGE_SIZE }, signal),
    enabled: activeTab === "evidence",
    retry: false,
  });

  const setActivePage = (nextPage: number) => {
    setPages((current) => ({ ...current, [activeTab]: Math.max(0, nextPage) }));
  };

  const moveTabFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = tabs.findIndex((tab) => tab.id === activeTab);
    const keyDirection = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    const nextIndex = event.key === "Home" ? 0
      : event.key === "End" ? tabs.length - 1
        : keyDirection ? (currentIndex + keyDirection + tabs.length) % tabs.length
          : -1;
    if (nextIndex < 0) return;
    event.preventDefault();
    const nextTab = tabs[nextIndex];
    setActiveTab(nextTab.id);
    tabButtons.current[nextIndex]?.focus();
  };

  const renderPager = (currentPage: number, hasNext: boolean, isFetching: boolean, tab: InstallationWorkOrderRecordsTab) => {
    if (currentPage === 0 && !hasNext) return null;
    return (
      <nav className={styles.pagination} aria-label={`Phân trang ${tabs.find((item) => item.id === tab)?.label.toLowerCase()}`}>
        <ButtonBar type="button" disabled={currentPage === 0 || isFetching} onClick={() => setActivePage(currentPage - 1)}>
          Trang trước
        </ButtonBar>
        <span>Trang {currentPage + 1}</span>
        <ButtonBar type="button" disabled={!hasNext || isFetching} onClick={() => setActivePage(currentPage + 1)}>
          Trang sau
        </ButtonBar>
      </nav>
    );
  };

  const renderLoading = () => <p className={styles.feedback} role="status">Đang tải dữ liệu…</p>;
  const renderError = (error: unknown, retry: () => void, isFetching: boolean) => (
    <div className={`${styles.feedback} ${styles.error}`} role="alert">
      <p>{getApiErrorMessage(error)}</p>
      <ButtonBar type="button" disabled={isFetching} onClick={() => void retry()}>
        {isFetching ? "Đang tải…" : "Thử lại"}
      </ButtonBar>
    </div>
  );

  let content: ReactNode;
  if (activeTab === "checklist") {
    content = checklist.isPending ? renderLoading()
      : checklist.isError ? renderError(checklist.error, checklist.refetch, checklist.isFetching)
        : <>
          {checklist.data.items.length === 0
            ? <p className={styles.feedback} role="status">Chưa có mục kiểm tra nào.</p>
            : <DataTable
              variant="moderator"
              rows={checklist.data.items}
              rowKey={(item) => item.id}
              columns={[
                { key: "code", header: "Mã mục", render: (item) => item.itemCode },
                { key: "label", header: "Nội dung", render: (item) => item.label },
                { key: "required", header: "Bắt buộc", render: (item) => item.required ? "Có" : "Không" },
                { key: "result", header: "Kết quả", render: (item) => {
                  const result = resultLabels[item.result] ?? { label: item.result, tone: "neutral" as const };
                  return <StatusBadge tone={result.tone}>{result.label}</StatusBadge>;
                } },
                { key: "notes", header: "Ghi chú", render: (item) => item.notes ?? "—" },
                ...(renderChecklistActions ? [{ key: "actions", header: "Cập nhật", render: renderChecklistActions }] : []),
              ]}
            />}
          {checklistMessage}
          {renderPager(checklist.data.page, checklist.data.hasNext, checklist.isFetching, "checklist")}
        </>;
  } else if (activeTab === "accessories") {
    content = accessories.isPending ? renderLoading()
      : accessories.isError ? renderError(accessories.error, accessories.refetch, accessories.isFetching)
        : <>
          {accessories.data.items.length === 0
            ? <p className={styles.feedback} role="status">Chưa ghi nhận phụ kiện nào.</p>
            : <DataTable
              variant="moderator"
              rows={accessories.data.items}
              rowKey={(item) => item.id}
              columns={[
                { key: "name", header: "Phụ kiện", render: (item) => item.accessoryName },
                { key: "quantity", header: "Số lượng", render: (item) => item.quantity },
                { key: "serial", header: "Số sê-ri", render: (item) => item.serialNumber ?? "—" },
                { key: "notes", header: "Ghi chú", render: (item) => item.notes ?? "—" },
              ]}
            />}
          {accessoryActions}
          {renderPager(accessories.data.page, accessories.data.hasNext, accessories.isFetching, "accessories")}
        </>;
  } else {
    content = evidence.isPending ? renderLoading()
      : evidence.isError ? renderError(evidence.error, evidence.refetch, evidence.isFetching)
        : <>
          {evidence.data.items.length === 0
            ? <p className={styles.feedback} role="status">Chưa có chứng từ nào.</p>
            : <DataTable
              variant="moderator"
              rows={evidence.data.items}
              rowKey={(item) => item.id}
              style={{ minWidth: 760 }}
              columns={[
                { key: "filename", header: "Tệp", render: (item) => item.originalFilename },
                { key: "content-type", header: "Định dạng", render: (item) => item.contentType ?? "—" },
                { key: "size", header: "Dung lượng", render: (item) => `${item.sizeBytes.toLocaleString("vi-VN")} bytes` },
                { key: "sha256", header: "Mã SHA-256", render: (item) => item.sha256 ?? "—" },
                { key: "uploaded", header: "Ngày tải", render: (item) => item.uploadedAt ? new Date(item.uploadedAt).toLocaleString("vi-VN") : "—" },
                ...(renderEvidenceActions ? [{ key: "actions", header: "Thao tác", render: renderEvidenceActions }] : []),
              ]}
            />}
          {evidenceMessage}
          {evidenceActions}
          {renderPager(evidence.data.page, evidence.data.hasNext, evidence.isFetching, "evidence")}
        </>;
  }

  return (
    <section className={styles.panel} aria-label="Hồ sơ lắp đặt">
      <div className={styles.tabs} role="tablist" aria-label="Hồ sơ lắp đặt" onKeyDown={moveTabFocus}>
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(element) => { tabButtons.current[index] = element; }}
            className={`${styles.tab} ${activeTab === tab.id ? styles.activeTab : ""}`}
            type="button"
            role="tab"
            id={`installation-records-tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls="installation-records-panel"
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className={styles.content} role="tabpanel" id="installation-records-panel" aria-labelledby={`installation-records-tab-${activeTab}`}>
        <h2 className={styles.heading}>{tabs.find((tab) => tab.id === activeTab)?.label}</h2>
        {content}
      </div>
    </section>
  );
}
