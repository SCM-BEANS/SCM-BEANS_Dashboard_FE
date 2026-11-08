import { MachineContractHistory } from "@/components/machines/machine-contract-history";
import axios from "axios";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { machineCertificatesApi } from "@/apis/machine-certificates.api";
import { MachineActiveMenuPanel } from "@/components/features/recipe-menus/recipe-sync-panel";
import { MachineCertificatesPanel } from "@/components/machines/machine-certificates-panel";
import type { MachineCertificateStatus } from "@/schema/machine-certificates.schema";
import { useRouter } from "next/router";
import { machinesApi } from "@/apis/machines.api";
import { PageActions } from "@/components/action-bar/page-actions";
import { ButtonBar } from "@/components/button/button-bar";
import { telemetryApi, TELEMETRY_POINTS_PAGE_SIZE } from "@/apis/telemetry.api";
import { MachineHeartbeatPanel } from "@/components/machines/machine-heartbeat-panel";
import { SmartIotPanel } from "@/components/machines/smart-iot-panel";
import { createTelemetryRange, TelemetryHistoryPanel } from "@/components/machines/telemetry-history-panel";
import { usePageVisibility } from "@/components/machines/machine-heartbeat-visibility";
import { authScopedQuerySubject, getAuthenticatedSubjectId } from "@/lib/query-subject";
import { MachineMaintenanceTicketActions } from "@/components/features/maintenance-workflow/maintenance-ticket-actions";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import { getApiErrorMessage } from "@/lib/api-errors";
import { PATH_TECHNICIAN } from "@/routes/path";
import { MachineIdSchema, type Machine } from "@/schema/machines.schema";
import { TelemetryPointsParamsSchema } from "@/schema/telemetry.schema";
import { TECHNICIAN_MESSAGES as T } from "@/text/technician/technician-messages";
import { TechnicianShell } from "../technician-shell";
import styles from "../technician-shell.module.css";

type MachineStatus = NonNullable<Machine["status"]>;

const STATUS_LABELS: Record<MachineStatus, string> = {
  IN_WAREHOUSE: "Trong kho",
  PENDING_ACTIVATION: "Chờ kích hoạt",
  DEPLOYED_CONTRACT_OWNER: "Đang triển khai · Owner hợp đồng",
  DEPLOYED_STORE_OWNER: "Đang triển khai · Owner cửa hàng",
  UNDER_MAINTENANCE: "Đang bảo trì",
  REFURBISHING: "Đang tân trang",
  PENDING_QA: "Chờ kiểm định",
  AVAILABLE_FOR_RENT: "Sẵn sàng cho thuê",
  RETIRED: "Đã ngừng sử dụng",
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatNumber(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : new Intl.NumberFormat("vi-VN").format(value);
}

function getMachineTypeLabel(machineType: Machine["machineType"]): string {
  if (machineType === "SMART_IOT") return "Smart IoT";
  if (machineType === "CONVENTIONAL") return "Máy thường";
  return "—";
}

function getStatusLabel(status: Machine["status"]): string {
  return status ? STATUS_LABELS[status] ?? status : "—";
}

function MachineDetailFields({ machine }: { machine: Machine }) {
  const fields = [
    [T.MACHINE_CHECK.ID, machine.id],
    [T.MACHINE_CHECK.OWNER_ID, machine.ownerId],
    [T.MACHINE_CHECK.SERIAL, machine.serialNumber],
    ["Menu đang gán", machine.activeMenuId === undefined ? "Chưa có thông tin menu" : machine.activeMenuId === null ? "Menu mặc định" : machine.activeMenuName || "Menu riêng"],
    [T.MACHINE_CHECK.STATUS, getStatusLabel(machine.status)],
    [T.MACHINE_CHECK.DETAIL_FIELDS.DEPLOYED_AT, formatDate(machine.deployedAt)],
    [T.MACHINE_CHECK.DETAIL_FIELDS.NEXT_MAINTENANCE_AT, formatDate(machine.nextPreventiveMaintenanceAt)],
    [T.MACHINE_CHECK.DETAIL_FIELDS.CUPS_SINCE_DESCALE, formatNumber(machine.cupsServedSinceLastDescale)],
    [T.MACHINE_CHECK.DETAIL_FIELDS.REGION, machine.region],
    [T.MACHINE_CHECK.DETAIL_FIELDS.LOCATION_ID, machine.locationId],
    [T.MACHINE_CHECK.MACHINE_TYPE, getMachineTypeLabel(machine.machineType)],
    [T.MACHINE_CHECK.DETAIL_FIELDS.MACHINE_TYPE_MAPPED_AT, formatDate(machine.machineTypeMappedAt)],
    [T.MACHINE_CHECK.DETAIL_FIELDS.MACHINE_TYPE_MAPPED_BY, machine.machineTypeMappedBy],
    [T.MACHINE_CHECK.DETAIL_FIELDS.MACHINE_TYPE_MAPPING_REASON, machine.machineTypeMappingReason],
    [T.MACHINE_CHECK.DETAIL_FIELDS.MODEL_ID, machine.modelId],
    [T.MACHINE_CHECK.DETAIL_FIELDS.MODEL_MAPPED_AT, formatDate(machine.modelMappedAt)],
    [T.MACHINE_CHECK.DETAIL_FIELDS.MODEL_MAPPED_BY, machine.modelMappedBy],
    [T.MACHINE_CHECK.DETAIL_FIELDS.MODEL_MAPPING_REASON, machine.modelMappingReason],
  ] as const;

  return (
    <div className={styles.machineDetailGrid}>
      {fields.map(([label, value]) => (
        <div className={styles.machineDetailField} key={label}>
          <span>{label}</span>
          <strong>{value || "—"}</strong>
        </div>
      ))}
    </div>
  );
}

function TechnicianMachineCertificates({ machineId, subject, serialNumber }: { machineId: string; subject: string; serialNumber?: string | null }) {
  const [status, setStatus] = useState<MachineCertificateStatus | "">("");
  const [pageNumber, setPageNumber] = useState(0);
  const [selectedCertificateId, setSelectedCertificateId] = useState("");
  const [busy, setBusy] = useState(false);
  const [issueBlocked, setIssueBlocked] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const locked = useRef(false);
  const alive = useRef(true);
  const downloadController = useRef<AbortController | null>(null);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; downloadController.current?.abort(); };
  }, []);
  const identity = useQuery({
    queryKey: ["machine-device-identity", "TECHNICIAN", subject, machineId],
    queryFn: async ({ signal }) => {
      try { return await machinesApi.getDeviceIdentity(machineId, signal); }
      catch (error) { if (axios.isAxiosError(error) && error.response?.status === 404) return null; throw error; }
    },
    retry: false,
  });
  const customIdentity = identity.isSuccess && Boolean(identity.data && identity.data.deviceId !== serialNumber);
  const identityAllowsIssue = identity.isSuccess && !identity.isFetching && !customIdentity && Boolean(serialNumber?.trim());
  const certificates = useQuery({
    queryKey: ["machine-certificates", "TECHNICIAN", subject, machineId, status, pageNumber],
    queryFn: ({ signal }) => machineCertificatesApi.list(machineId, { page: pageNumber, size: 50, ...(status ? { status } : {}) }, signal),
    retry: false,
  });
  const detail = useQuery({
    queryKey: ["machine-certificates", "TECHNICIAN", subject, machineId, "detail", selectedCertificateId],
    queryFn: ({ signal }) => machineCertificatesApi.getById(machineId, selectedCertificateId, signal),
    enabled: Boolean(selectedCertificateId), retry: false,
  });
  async function refresh() {
    if (locked.current) return;
    const [result, identityResult] = await Promise.all([certificates.refetch(), identity.refetch()]);
    if (alive.current && result.isSuccess && identityResult.isSuccess) { setIssueBlocked(false); setActionError(""); }
  }
  async function act(action: "issue" | "delete" | "download", id = "", format: "zip" | "json" = "zip") {
    if (locked.current || action === "issue" && (issueBlocked || !certificates.isSuccess || !identityAllowsIssue)) return;
    locked.current = true; setBusy(true); setActionError(""); setNotice("");
    try {
      if (action === "issue") {
        const issued = await machineCertificatesApi.issue(machineId);
        if (!alive.current) return;
        setSelectedCertificateId(issued.id);
        setNotice("Đã phát hành chứng chỉ kết nối.");
        await Promise.all([certificates.refetch(), identity.refetch()]);
      } else if (action === "delete") {
        await machineCertificatesApi.delete(machineId, id);
        if (!alive.current) return;
        if (selectedCertificateId === id) setSelectedCertificateId("");
        setNotice("Đã xóa chứng chỉ khỏi hệ thống.");
        await certificates.refetch();
      } else {
        const controller = new AbortController();
        downloadController.current = controller;
        const bundle = await machineCertificatesApi.download(machineId, id, format, controller.signal);
        if (!alive.current || controller.signal.aborted) return;
        const url = URL.createObjectURL(bundle.blob);
        const anchor = document.createElement("a");
        try {
          anchor.href = url; anchor.download = bundle.filename;
          document.body.appendChild(anchor); anchor.click();
        } finally { anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 0); }
      }
    } catch (error) {
      if (!alive.current) return;
      setActionError(getApiErrorMessage(error, "mutation"));
      if (action === "issue") {
        setIssueBlocked(true);
        setNotice("Chưa xác nhận được kết quả phát hành. Hãy kiểm tra danh sách và bấm Làm mới trước khi thử lại.");
        await Promise.all([certificates.refetch(), identity.refetch()]);
      } else if (action === "delete") {
        setSelectedCertificateId("");
        await certificates.refetch();
      }
    } finally {
      locked.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return <>
    <SmartIotPanel title="Định danh thiết bị">
      {identity.isPending ? <p role="status">Đang tải định danh…</p>
        : identity.isError ? <p role="alert">{getApiErrorMessage(identity.error)}</p>
          : identity.data ? <p>Mã thiết bị: <strong>{identity.data.deviceId}</strong></p>
            : <p>Chưa có định danh đang hoạt động.</p>}
      <ButtonBar disabled={busy || identity.isFetching} onClick={() => void identity.refetch()}>Làm mới định danh</ButtonBar>
      {customIdentity && <p role="alert">Mã thiết bị hiện tại khác serial máy. Chưa thể phát hành chứng chỉ; hãy liên hệ bộ phận vận hành kiểm tra định danh.</p>}
      {!serialNumber?.trim() && <p role="alert">Máy chưa có serial hợp lệ để phát hành chứng chỉ.</p>}
    </SmartIotPanel>
    <MachineCertificatesPanel
    page={certificates.data} detail={detail.isError ? undefined : detail.data}
    status={status} pageNumber={pageNumber} selectedCertificateId={selectedCertificateId}
    loading={certificates.isPending} detailLoading={Boolean(selectedCertificateId) && detail.isPending}
    error={certificates.isError ? getApiErrorMessage(certificates.error) : undefined}
    detailError={detail.isError ? getApiErrorMessage(detail.error) : undefined}
    actionError={actionError} notice={notice} busy={busy} issueBlocked={issueBlocked || !certificates.isSuccess || !identityAllowsIssue}
    onIssue={() => void act("issue")} onSelect={(id) => { if (id === selectedCertificateId) void detail.refetch(); else setSelectedCertificateId(id); }}
    onStatusChange={(next) => { setStatus(next); setPageNumber(0); setSelectedCertificateId(""); }}
    onPageChange={(next) => { setPageNumber(next); setSelectedCertificateId(""); }}
    onRefresh={() => void refresh()} onDownload={(id, format) => void act("download", id, format)}
    onDelete={(id) => void act("delete", id)}
  /></>;
}

export function TechnicianMachineDetailScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const subject = authScopedQuerySubject("TECHNICIAN");
  const pageVisible = usePageVisibility();
  const [defaultRange] = useState(() => createTelemetryRange("24h"));
  const rangeResult = useMemo(() => TelemetryPointsParamsSchema.safeParse(router.query.telemetryFrom || router.query.telemetryTo ? { from: router.query.telemetryFrom, to: router.query.telemetryTo } : defaultRange), [router.query.telemetryFrom, router.query.telemetryTo, defaultRange]);
  const telemetryRange = rangeResult.success ? rangeResult.data : null;
  const setTelemetryRange = (range: { from: string; to: string }) => { void router.push({ pathname: router.pathname, query: { ...router.query, telemetryFrom: range.from, telemetryTo: range.to } }, undefined, { shallow: true }); };
  const machineId = typeof router.query.machineId === "string" ? router.query.machineId : "";
  const validId = router.isReady && MachineIdSchema.safeParse(machineId).success;
  const authenticated = Boolean(getAuthenticatedSubjectId());
  const machineQueryKey = ["dolores", "machines", "technician-detail", subject, machineId] as const;
  const machine = useQuery({
    queryKey: machineQueryKey,
    queryFn: ({ signal }) => machinesApi.getById(machineId, signal),
    enabled: validId && authenticated, retry: false,
  });
  const maintenanceTickets = useQuery({
    queryKey: ["dolores", "technician", "machine-tickets", machineId],
    queryFn: ({ signal }) => machinesApi.listMaintenanceTickets({ machineId, page: 0, size: 100 }, signal),
    enabled: validId && Boolean(machine.data),
    retry: false,
  });
  const smartIot = validId && authenticated && machine.isSuccess && machine.data?.machineType === "SMART_IOT";
  const heartbeat = useQuery({
    queryKey: ["technician-machine-heartbeat", subject, machineId],
    queryFn: ({ signal }) => telemetryApi.getLatestHeartbeat(machineId, signal),
    enabled: smartIot && pageVisible, retry: false,
    refetchInterval: smartIot && pageVisible ? 5_000 : false, refetchIntervalInBackground: false,
  });
  const points = useInfiniteQuery({
    queryKey: ["technician-machine-telemetry", subject, machineId, telemetryRange],
    queryFn: ({ pageParam, signal }) => telemetryApi.listMachinePoints(machineId, telemetryRange!, pageParam, signal),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => lastPage.length === TELEMETRY_POINTS_PAGE_SIZE && pages.length * TELEMETRY_POINTS_PAGE_SIZE <= 100_000 ? pages.length * TELEMETRY_POINTS_PAGE_SIZE : undefined,
    enabled: smartIot && pageVisible && Boolean(telemetryRange), retry: false,
  });
  const telemetryPoints = useMemo(() => points.data?.pages.flat() ?? [], [points.data]);
  const statusUpdate = useMutation({
    mutationFn: () => {
      return machinesApi.markReady(machineId, { reason: T.MACHINE_CHECK.STATUS_UPDATE_REASON });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: machineQueryKey }),
        queryClient.invalidateQueries({ queryKey: ["dolores", "machines", "inventory"] }),
      ]);
    },
  });

  const actionBar = () => (
    <PageActions actions={machine.data?.status === "IN_WAREHOUSE" ? [{
      id: "mark-ready", label: T.MACHINE_CHECK.UPDATE_STATUS, variant: "primary", priority: 50,
      disabled: !machine.data.serialNumber || statusUpdate.isPending,
      disabledReason: "Cần số sê-ri để cập nhật trạng thái.",
      pending: statusUpdate.isPending, pendingLabel: T.MACHINE_CHECK.STATUS_UPDATING,
      onClick: () => statusUpdate.mutate(),
    }] : []} />
  );
  const heading = (title: string = T.MACHINE_CHECK.DETAIL_TITLE, description?: string) => (
    <BackButtonHeading
      title={title}
      titleId="technician-machine-detail-title"
      description={description}
      className={styles.pageHeading}
      back={{ label: T.MACHINE_CHECK.BACK_TO_LIST, fallbackHref: PATH_TECHNICIAN.MACHINE_CHECK }}
    />
  );

  if (!router.isReady) {
    return <TechnicianShell pageTitle={T.MACHINE_CHECK.DETAIL_TITLE}>
      <section className={styles.pageContent}>{heading()}<p className={styles.pendingNotice} role="status">{T.MACHINE_CHECK.LOADING}</p></section>
      {actionBar()}
    </TechnicianShell>;
  }

  if (!validId) {
    return <TechnicianShell pageTitle={T.MACHINE_CHECK.DETAIL_TITLE}>
      <section className={styles.pageContent}>{heading()}<div className={styles.machineCheckError} role="alert"><p>{T.MACHINE_CHECK.INVALID_ID}</p></div></section>
      {actionBar()}
    </TechnicianShell>;
  }

  if (machine.isPending) {
    return <TechnicianShell pageTitle={T.MACHINE_CHECK.DETAIL_TITLE}>
      <section className={styles.pageContent}>{heading()}<p className={styles.pendingNotice} role="status">{T.MACHINE_CHECK.LOADING}</p></section>
      {actionBar()}
    </TechnicianShell>;
  }

  if (machine.isError) {
    return <TechnicianShell pageTitle={T.MACHINE_CHECK.DETAIL_TITLE}>
      <section className={styles.pageContent}>
        {heading()}
        <div className={styles.machineCheckError} role="alert">
          <p>{getApiErrorMessage(machine.error)}</p>
          <button className={styles.machineCheckRetry} type="button" onClick={() => void machine.refetch()}>{T.MACHINE_CHECK.RETRY}</button>
        </div>
      </section>
      {actionBar()}
    </TechnicianShell>;
  }

  if (!machine.data) {
    return <TechnicianShell pageTitle={T.MACHINE_CHECK.DETAIL_TITLE}>
      <section className={styles.pageContent}>
        {heading()}
        <p className={styles.pendingNotice} role="status">{T.MACHINE_CHECK.NOT_FOUND}</p>
      </section>
      {actionBar()}
    </TechnicianShell>;
  }

  const device = machine.data;
  return (
    <TechnicianShell pageTitle={T.MACHINE_CHECK.DETAIL_TITLE}>
      <section className={styles.pageContent}>
        {heading(`${T.MACHINE_CHECK.DETAIL_TITLE} · ${device.serialNumber ?? device.id}`, device.id)}
        {statusUpdate.isSuccess && <p className={styles.pendingNotice} role="status">{T.MACHINE_CHECK.STATUS_UPDATE_SUCCESS}</p>}
        {statusUpdate.isError && (
          <div className={styles.machineCheckError} role="alert">
            <p>{getApiErrorMessage(statusUpdate.error)}</p>
            {device.status === "IN_WAREHOUSE" ? (
              <button className={styles.machineCheckRetry} type="button" onClick={() => statusUpdate.mutate()}>
                {T.MACHINE_CHECK.UPDATE_STATUS}
              </button>
            ) : null}
          </div>
        )}
        <section className={styles.machineCheckPanel} aria-labelledby="technician-machine-profile-title">
          <h2 id="technician-machine-profile-title">{T.MACHINE_CHECK.TABLE_TITLE}</h2>
          <MachineDetailFields machine={device} />
          <MachineContractHistory machineId={machineId} role="TECHNICIAN" />
          {device.status !== "IN_WAREHOUSE" ? (
            <p className={styles.pendingNotice} role="status">
              Chỉ xác nhận sẵn sàng cho máy đang ở trạng thái Trong kho. Máy hiện tại không đủ điều kiện.
            </p>
          ) : null}
        </section>
        <section className={styles.machineCheckPanel} aria-labelledby="technician-machine-tickets-title">
          <h2 id="technician-machine-tickets-title">Phiếu bảo trì</h2>
          {maintenanceTickets.isPending && <p className={styles.pendingNotice} role="status">Đang tải phiếu bảo trì…</p>}
          {maintenanceTickets.isError && (
            <div className={styles.machineCheckError} role="alert">
              <p>{getApiErrorMessage(maintenanceTickets.error)}</p>
              <button className={styles.machineCheckRetry} type="button" onClick={() => void maintenanceTickets.refetch()}>Thử lại</button>
            </div>
          )}
          {maintenanceTickets.isSuccess && maintenanceTickets.data.length === 0 && <p className={styles.pendingNotice}>Chưa có phiếu bảo trì cho máy này.</p>}
          <MachineMaintenanceTicketActions
            machineId={machineId}
            tickets={maintenanceTickets.data ?? []}
            role="TECHNICIAN"
            onRefresh={() => maintenanceTickets.refetch()}
          />
        </section>
        <TechnicianMachineCertificates key={`${subject}:${machineId}`} machineId={machineId} subject={subject} serialNumber={device.serialNumber} />
        <MachineActiveMenuPanel key={`menu:${subject}:${machineId}`} machineId={machineId} subject={subject} onChanged={() => machine.refetch()} />
        {smartIot ? <>
          <MachineHeartbeatPanel title="Kết nối & sức khỏe máy" heartbeat={heartbeat.data} loading={heartbeat.isPending} error={heartbeat.isError ? getApiErrorMessage(heartbeat.error) : undefined} onRetry={() => void heartbeat.refetch()} />
          <SmartIotPanel title="Lịch sử thông số">
            <TelemetryHistoryPanel range={telemetryRange} onRangeChange={setTelemetryRange} selectedField={typeof router.query.field === "string" ? router.query.field : undefined} onFieldChange={(field) => { void router.push({ pathname: router.pathname, query: { ...router.query, field } }, undefined, { shallow: true }); }} points={telemetryPoints} loading={points.isPending && Boolean(telemetryRange)} error={!telemetryRange ? "Khoảng thời gian không hợp lệ. Hãy chọn lại khoảng tối đa 30 ngày." : points.isError ? getApiErrorMessage(points.error) : undefined} onRetry={telemetryRange ? () => void points.refetch() : undefined} hasMore={points.hasNextPage} loadingMore={points.isFetchingNextPage} onLoadMore={() => void points.fetchNextPage()} />
          </SmartIotPanel>
        </> : null}
      </section>
      {actionBar()}
    </TechnicianShell>
  );
}
