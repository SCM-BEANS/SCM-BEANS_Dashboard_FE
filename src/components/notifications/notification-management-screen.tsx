import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { ButtonBar } from "@/components/button/button-bar";
import { TableFilters } from "@/components/table/table-filters";
import { AlertAcknowledgementButton } from "@/components/features/operations/alert-acknowledgement-button";
import { authScopedQuerySubject } from "@/lib/query-subject";
import { notificationsApi } from "@/apis/notifications.api";
import { NotificationInbox, formatDate } from "@/components/notifications/notification-inbox";
import { StatusBadge } from "@/components/status-badge/status-badge";
import { TruncatedId } from "@/components/truncated-id/truncated-id";
import { getApiErrorMessage } from "@/lib/api-errors";
import { ALERT_LEVEL_LABELS, getAlertPresentation } from "@/text/notification-inbox-messages";
import styles from "@/components/notifications/notification-management.module.css";

export function NotificationManagementScreen({ scope, initialSection = "notifications", scopeNotice }: { scope: "admin" | "moderator" | "technician"; initialSection?: "notifications" | "alerts"; scopeNotice?: string }) {
  const [draft, setDraft] = useState({ search: "", level: "", status: "" });
  const [filters, setFilters] = useState(draft);
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null | undefined>();
  const detailRef = useRef<HTMLElement>(null);
  const alerts = useQuery({
    queryKey: ["dolores", "alerts", authScopedQuerySubject(scope.toUpperCase())],
    queryFn: ({ signal }) => notificationsApi.listAlerts(signal),
    enabled: scope !== "technician",
    retry: false,
  });
  const filtered = (alerts.data ?? []).map((alert) => {
    const presentation = getAlertPresentation(alert);
    return { ...alert, ...presentation, title: ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"].includes(alert.level.toUpperCase()) ? `Cảnh báo mức ${presentation.levelLabel.toLocaleLowerCase("vi-VN")}` : presentation.levelLabel };
  }).filter((alert) => (!filters.level || alert.level.toUpperCase() === filters.level)
    && (!filters.status || alert.acknowledged === (filters.status === "acknowledged"))
    && (!filters.search || `${alert.message} ${alert.machineId ?? ""}`.toLocaleLowerCase("vi-VN").includes(filters.search.toLocaleLowerCase("vi-VN"))))
    .sort((a, b) => (Date.parse(b.ts) || 0) - (Date.parse(a.ts) || 0));
  const currentPage = Math.min(page, Math.max(0, Math.ceil(filtered.length / 10) - 1));
  const rows = filtered.slice(currentPage * 10, currentPage * 10 + 10);
  const selected = alerts.isSuccess && selectedId !== null ? rows.find((alert) => alert.id === selectedId) ?? rows[0] : undefined;

  return <NotificationInbox scope={scope} variant="management" initialSection={initialSection} title="Thông báo"
    description={scope === "technician" ? "Thông báo tài khoản và cập nhật công việc được giao cho bạn." : "Theo dõi thông báo hệ thống và các cảnh báo từ máy."}
    showOwnerId={scope === "admin"} onRefreshExtra={scope === "technician" ? undefined : () => alerts.refetch()}>
    {scope !== "technician" ? <div className={styles.workspace} data-detail={Boolean(selected)}>
      <section className={styles.feed} aria-labelledby="alerts-list-title">
        <div className={styles.panelHeading}><div><h2 id="alerts-list-title">Cảnh báo máy</h2><p>{alerts.isSuccess ? `${alerts.data.filter((alert) => !alert.acknowledged).length} chưa xác nhận · ${filtered.length} cảnh báo trong danh sách` : "Theo dõi cảnh báo và tình trạng xử lý của máy."}</p></div></div>
        {scopeNotice ? <p className={styles.scopeNote} role="note">{scopeNotice}</p> : null}
        <TableFilters search={{ ariaLabel: "Tìm cảnh báo", placeholder: "Tìm nội dung hoặc mã máy", value: draft.search, onChange: (search) => setDraft((value) => ({ ...value, search })) }} selects={[
          { id: "alert-level", ariaLabel: "Loại hoặc mức cảnh báo", value: draft.level, options: [{ value: "", label: "Tất cả cảnh báo" }, ...Array.from(new Set([...Object.keys(ALERT_LEVEL_LABELS), ...(alerts.data ?? []).map((alert) => alert.level.toUpperCase())])).map((value) => ({ value, label: ALERT_LEVEL_LABELS[value] ?? "Cảnh báo khác" }))], onChange: (level) => setDraft((value) => ({ ...value, level })) },
          { id: "alert-status", ariaLabel: "Trạng thái cảnh báo", value: draft.status, options: [{ value: "", label: "Tất cả trạng thái" }, { value: "active", label: "Chưa xác nhận" }, { value: "acknowledged", label: "Đã xác nhận" }], onChange: (status) => setDraft((value) => ({ ...value, status })) },
        ]} submitLabel="Tìm kiếm" onSubmit={(event) => { event.preventDefault(); setFilters({ ...draft, search: draft.search.trim() }); setPage(0); setSelectedId(undefined); }} />
        {alerts.isPending ? <p className={styles.empty} role="status">Đang tải cảnh báo…</p> : null}
        {alerts.isError ? <div className={styles.error} role="alert"><p>{getApiErrorMessage(alerts.error)}</p><ButtonBar onClick={() => void alerts.refetch()}>Thử lại</ButtonBar></div> : null}
        {alerts.isSuccess && !filtered.length ? <p className={styles.empty}>Không có cảnh báo phù hợp với bộ lọc.</p> : null}
        {alerts.isSuccess ? <div className={styles.list}>{rows.map((alert) => <article className={styles.item} key={alert.id} data-selected={selected?.id === alert.id}>
          <button id={`alert-open-${alert.id}`} type="button" className={styles.openNotification} aria-pressed={selected?.id === alert.id} aria-controls={selected ? "alert-detail" : undefined} onClick={() => {
            setSelectedId(alert.id);
            if (window.matchMedia("(max-width: 1100px)").matches) requestAnimationFrame(() => { detailRef.current?.focus(); detailRef.current?.scrollIntoView({ behavior: "instant", block: "nearest" }); });
          }}><span className={styles.categoryIcon} data-category="alert"><AlertTriangle size={22} aria-hidden="true" /></span><span className={styles.rowContent}><strong>{alert.title}</strong><span className={styles.preview}>{alert.message}</span><time dateTime={alert.ts}>{formatDate(alert.ts)}{alert.machineId ? ` · Máy ${alert.machineId.slice(0, 8).toUpperCase()}` : ""}</time></span></button>
          {!alert.acknowledged ? <span className={styles.alertDot} role="img" aria-label="Chưa xác nhận" /> : null}
        </article>)}</div> : null}
        {alerts.isSuccess && filtered.length > 0 ? <nav className={styles.pagination} aria-label="Phân trang cảnh báo"><span className={styles.pageSize}>10 cảnh báo / trang</span><span>Trang {currentPage + 1} / {Math.max(1, Math.ceil(filtered.length / 10))}</span><ButtonBar disabled={currentPage === 0} onClick={() => { setPage(currentPage - 1); setSelectedId(undefined); }}>Trang trước</ButtonBar><ButtonBar disabled={(currentPage + 1) * 10 >= filtered.length} onClick={() => { setPage(currentPage + 1); setSelectedId(undefined); }}>Trang sau</ButtonBar></nav> : null}
      </section>
      {selected ? <aside id="alert-detail" ref={detailRef} tabIndex={-1} className={styles.detailPane} aria-labelledby="alert-detail-title">
        <header><h2 id="alert-detail-title">Chi tiết cảnh báo</h2><button className={styles.closeDetail} aria-label="Đóng chi tiết cảnh báo" onClick={() => { document.getElementById(`alert-open-${selected.id}`)?.focus(); setSelectedId(null); }}><X size={20} aria-hidden="true" /></button></header>
        <div className={styles.detailMeta}><StatusBadge variant="dot" tone={selected.acknowledged ? "success" : "warning"}>{selected.acknowledged ? "Đã xác nhận" : "Chưa xác nhận"}</StatusBadge><time dateTime={selected.ts}>{formatDate(selected.ts)}</time></div>
        <h3>{selected.title}</h3><section className={styles.detailContent} aria-label="Nội dung cảnh báo"><h4>Nội dung</h4><p className={styles.detailBody}>{selected.message}</p></section>
        <dl className={styles.detailFacts}><div><dt>Máy liên quan</dt><dd><TruncatedId value={selected.machineId} /></dd></div>{selected.title !== selected.levelLabel ? <div><dt>Mức độ</dt><dd>{selected.levelLabel}</dd></div> : null}</dl>
        {!selected.acknowledged && ["HIGH", "CRITICAL"].includes(selected.level.toUpperCase()) ? <footer className={styles.detailActions}><AlertAcknowledgementButton key={selected.id} id={selected.id} level={selected.level} /></footer> : !selected.acknowledged ? <p className={styles.detailHint}>Cảnh báo này chỉ để theo dõi, không yêu cầu xác nhận.</p> : null}
      </aside> : null}
    </div> : null}
  </NotificationInbox>;
}
