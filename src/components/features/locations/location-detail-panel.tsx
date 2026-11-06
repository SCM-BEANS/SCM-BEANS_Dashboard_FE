import Link from "next/link";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { locationsApi } from "@/apis/locations.api";
import { telemetryApi } from "@/apis/telemetry.api";
import { ButtonBar } from "@/components/button/button-bar";
import { MachineConnectionBadge } from "@/components/machines/machine-connection-badge";
import { MetricCard } from "@/pages/dashboard/shared/customer-screen-common";
import { StatusBadge } from "@/components/status-badge/status-badge";
import { DataTable } from "@/components/table/data-table";
import { TruncatedId } from "@/components/truncated-id/truncated-id";
import { getApiErrorMessage } from "@/lib/api-errors";
import { LocationIdSchema, type LocationMachinePage } from "@/schema/locations.schema";
import type { MachineConnectionState } from "@/components/machines/machine-connection-badge";
import styles from "./location-detail.module.css";
import { TransferMachineAction } from "./transfer-machine-action";

type MachineSummary = LocationMachinePage["content"][number];
type TableVariant = "operations" | "moderator" | "customer";

const machineStatusLabels: Record<string, string> = {
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

function numberLabel(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function wastageLabel(value: number | null): string {
  return value === null ? "—" : `${new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value)}%`;
}

function MachineConnection({ machine }: { machine: MachineSummary }) {
  const heartbeat = useQuery({
    queryKey: ["location-machine-heartbeat", machine.id],
    queryFn: ({ signal }) => telemetryApi.getLatestHeartbeat(machine.id, signal),
    enabled: machine.machineType === "SMART_IOT",
    retry: false,
    staleTime: 3_000,
  });
  const state: MachineConnectionState = machine.machineType !== "SMART_IOT"
    ? "UNKNOWN"
    : heartbeat.isPending ? "loading"
      : heartbeat.isError ? "error"
        : heartbeat.data?.status ?? "UNKNOWN";
  return <MachineConnectionBadge state={state} onRetry={() => void heartbeat.refetch()} />;
}

export function LocationDetailPanel({
  locationId,
  backHref,
  machineDetailHref,
  tableVariant = "operations",
}: {
  locationId: string;
  backHref?: string;
  machineDetailHref: (machineId: string) => string;
  tableVariant?: TableVariant;
}) {
  const validId = LocationIdSchema.safeParse(locationId).success;
  const [page, setPage] = useState(0);
  const [transferSuccessMessage, setTransferSuccessMessage] = useState("");
  const pageSize = 10;
  const stats = useQuery({
    queryKey: ["dolores", "locations", "stats", locationId],
    queryFn: ({ signal }) => locationsApi.getStats(locationId, signal),
    enabled: validId,
    retry: false,
  });
  const machines = useQuery({
    queryKey: ["dolores", "locations", "machines", locationId, page, pageSize],
    queryFn: ({ signal }) => locationsApi.listMachines(locationId, { page, size: pageSize }, signal),
    enabled: validId,
    retry: false,
  });
  useEffect(() => setPage(0), [locationId]);
  const statsData = stats.data;
  const machinePage = machines.data;

  const columns = [
    {
      key: "serial",
      header: "Số sê-ri",
      render: (machine: MachineSummary) => <Link href={machineDetailHref(machine.id)}>
        {machine.serialNumber?.trim() || <TruncatedId value={machine.id} />}
      </Link>,
    },
    {
      key: "status",
      header: "Trạng thái máy",
      render: (machine: MachineSummary) => machine.status
        ? <StatusBadge status={machine.status}>{machineStatusLabels[machine.status] ?? "Chưa xác định"}</StatusBadge>
        : "Chưa có trạng thái",
    },
    {
      key: "connection",
      header: "Kết nối",
      render: (machine: MachineSummary) => <MachineConnection machine={machine} />,
    },
    {
      key: "actions",
      header: "Thao tác",
      render: (machine: MachineSummary) => <TransferMachineAction
        machine={machine}
        currentLocationName={statsData?.locationName}
        onOpen={() => setTransferSuccessMessage("")}
        onSuccess={(targetLocationName) => setTransferSuccessMessage(`Đã chuyển máy tới ${targetLocationName}.`)}
      />,
    },
  ] as const;

  const currentPage = machinePage?.number ?? page;
  const totalPages = machinePage ? Math.max(1, machinePage.totalPages) : 1;

  return <section className={styles.panel} aria-labelledby="location-detail-panel-title">
    <header className={styles.heading}>
      <div>
        <h2 id="location-detail-panel-title">{statsData?.locationName ?? "Chi tiết địa điểm"}</h2>
        {statsData?.ownerName && <p>Owner: {statsData.ownerName}</p>}
      </div>
      {backHref && <ButtonBar href={backHref}>Về danh sách địa điểm</ButtonBar>}
    </header>

    <section aria-labelledby="location-stats-title">
      <div className={styles.sectionHeading}>
        <h3 id="location-stats-title">Thống kê vận hành</h3>
        {stats.isFetching && statsData && <span role="status">Đang cập nhật…</span>}
      </div>
      {stats.isPending && <p className={styles.notice} role="status">Đang tải thống kê địa điểm…</p>}
      {stats.isError && <div className={styles.notice} role="alert">
        <p>{getApiErrorMessage(stats.error)}</p>
        <ButtonBar type="button" disabled={stats.isFetching} onClick={() => void stats.refetch()}>Thử tải lại thống kê</ButtonBar>
      </div>}
      {!validId && <p className={styles.notice} role="alert">Mã địa điểm không hợp lệ.</p>}
      <div className={styles.statGrid}>
        <MetricCard label="Tổng số máy" value={statsData ? numberLabel(statsData.totalMachines) : "—"} />
        <MetricCard label="Đang kết nối" value={statsData ? numberLabel(statsData.onlineMachines) : "—"} />
        <MetricCard label="Mất kết nối" value={statsData ? numberLabel(statsData.offlineMachines) : "—"} />
        <MetricCard label="Ly pha hôm nay" value={statsData ? numberLabel(statsData.todayCupsBrewed) : "—"} />
        <MetricCard label="Ly pha trong 7 ngày" value={statsData ? numberLabel(statsData.weeklyCupsBrewed) : "—"} />
        <MetricCard label="Hao hụt trung bình" value={statsData ? wastageLabel(statsData.averageWastagePct) : "—"} />
      </div>
    </section>

    <section className={styles.tableSection} aria-labelledby="location-machines-title">
      <div className={styles.sectionHeading}>
        <div>
          <h3 id="location-machines-title">Máy tại địa điểm</h3>
          <p>Máy chưa được gán địa điểm được hiển thị là Kho trong trang chi tiết máy.</p>
        </div>
        {machines.isFetching && machinePage && <span role="status">Đang cập nhật…</span>}
      </div>
      {machines.isPending && <p className={styles.notice} role="status">Đang tải danh sách máy…</p>}
      {machines.isError && <div className={styles.notice} role="alert">
        <p>{getApiErrorMessage(machines.error)}</p>
        <ButtonBar type="button" disabled={machines.isFetching} onClick={() => void machines.refetch()}>Thử tải lại danh sách máy</ButtonBar>
      </div>}
      {machinePage && <>
        {transferSuccessMessage && <p className={styles.successNotice} role="status">{transferSuccessMessage}</p>}
        <DataTable
          variant={tableVariant}
          rows={machinePage.content}
          rowKey={(machine) => machine.id}
          columns={columns}
          emptyMessage="Địa điểm này chưa có máy."
        />
        <div className={styles.pagination}>
          <p>Trang {currentPage + 1}/{totalPages} · {numberLabel(machinePage.totalElements)} máy</p>
          <div className={styles.sectionHeading}>
            <ButtonBar type="button" disabled={currentPage <= 0 || machines.isFetching} onClick={() => setPage(Math.max(0, currentPage - 1))}>Trang trước</ButtonBar>
            <ButtonBar type="button" disabled={machinePage.last || machines.isFetching} onClick={() => setPage(currentPage + 1)}>Trang sau</ButtonBar>
          </div>
        </div>
      </>}
    </section>
  </section>;
}
