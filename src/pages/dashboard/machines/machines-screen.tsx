import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useQueries, useQuery } from "@tanstack/react-query";
import { DataTable } from "@/components/table/data-table";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import { MachineDetailView } from "@/components/machines/machine-detail-view";
import { MachineListView } from "@/components/machines/machine-list-view";
import { MachineConnectionBadge, type MachineConnectionState } from "@/components/machines/machine-connection-badge";
import { MachineHeartbeatPanel } from "@/components/machines/machine-heartbeat-panel";
import { staggerHeartbeatRequest, usePageVisibility, useVisibleMachineIds } from "@/components/machines/machine-heartbeat-visibility";
import { createTelemetryRange, TelemetryHistoryPanel, type TelemetryRange } from "@/components/machines/telemetry-history-panel";
import { SmartIotPanel } from "@/components/machines/smart-iot-panel";
import machineStyles from "@/components/machines/machines.module.css";
import type { BackButtonDestination } from "@/components/navigation/back-button";
import { contractsApi } from "@/apis/contracts.api";
import { machinesApi } from "@/apis/machines.api";
import { maintenanceRequestsApi } from "@/apis/maintenance-requests.api";
import { telemetryApi, TELEMETRY_POINTS_PAGE_SIZE } from "@/apis/telemetry.api";
import { MachineIdSchema } from "@/schema/machines.schema";
import { getApiErrorMessage } from "@/lib/api-errors";
import { PATH_CUSTOMER } from "@/routes/path";
import { CUSTOMER_MESSAGES } from "@/text/customer/customer-messages";
import { DetailItem, formatDate, QueryFeedback, statusLabel } from "../shared/customer-screen-common";
import styles from "../customer-shell.module.css";

const messages = CUSTOMER_MESSAGES.READ_SCREENS;

const maintenanceTicketStatusLabels: Record<string, string> = {
  PENDING: "Đang chờ",
  ASSIGNED: "Đã phân công",
  IN_PROGRESS: "Đang xử lý",
  RESOLVED: "Đã xử lý",
};

const maintenanceRequestStatusLabels: Record<string, string> = {
  REQUESTED: "Đã gửi",
  TRIAGED: "Đang xem xét",
  RESCHEDULE_REQUESTED: "Đề nghị đổi lịch",
  CONFIRMED: "Đã xác nhận",
  IN_PROGRESS: "Đang xử lý",
  COMPLETED: "Đã hoàn tất",
  CLOSED: "Đã đóng",
  OVERDUE_REVIEW: "Chờ xem xét quá hạn",
  CANCELLED: "Đã hủy",
};

export function MachinesScreen({ sectionPath, back }: { sectionPath: string; back?: BackButtonDestination | null }) {
  const [machineTypeFilter, setMachineTypeFilter] = useState<"ALL" | "SMART_IOT" | "CONVENTIONAL">("ALL");
  const [telemetryRange, setTelemetryRange] = useState<TelemetryRange | null>(null);
  const candidate = sectionPath.startsWith("machines/") ? sectionPath.slice("machines/".length) : "";
  const machineId = MachineIdSchema.safeParse(candidate).success ? candidate : null;
  const isHistory = sectionPath === "machines/history";
  const isList = sectionPath === "machines" || isHistory;
  const isPageVisible = usePageVisibility();
  const heartbeatTableRef = useRef<HTMLDivElement>(null);
  const list = useQuery({
    queryKey: ["owner-machines"],
    queryFn: ({ signal }) => machinesApi.list(signal),
    enabled: isList || Boolean(machineId),
  });
  const detail = useQuery({
    queryKey: ["owner-machine", machineId],
    queryFn: ({ signal }) => machinesApi.getById(machineId!, signal),
    enabled: Boolean(machineId),
  });
  const schedule = useQuery({
    queryKey: ["owner-machine-maintenance-schedule", machineId],
    queryFn: ({ signal }) => machinesApi.getMaintenanceSchedule(machineId!, signal),
    enabled: Boolean(machineId),
  });
  const contractHistory = useQuery({
    queryKey: ["owner-machine-contract-history", machineId],
    queryFn: ({ signal }) => contractsApi.getMachineHistory(machineId!, signal),
    enabled: Boolean(machineId),
  });
  const maintenanceRequests = useQuery({
    queryKey: ["owner-machine-maintenance-requests", machineId],
    queryFn: ({ signal }) => maintenanceRequestsApi.listByMachine(machineId!, signal),
    enabled: Boolean(machineId),
  });
  const maintenanceTickets = useQuery({
    queryKey: ["owner-machine-maintenance-tickets", machineId],
    queryFn: ({ signal }) => machinesApi.listMaintenanceTickets({ machineId: machineId!, page: 0, size: 100 }, signal),
    enabled: Boolean(machineId),
  });
  const visibleMachines = (list.data ?? []).filter((machine) => machineTypeFilter === "ALL" || machine.machineType === machineTypeFilter);
  const smartIotMachines = isList ? visibleMachines.filter((machine) => machine.machineType === "SMART_IOT") : [];
  const visibleMachineIds = useVisibleMachineIds(heartbeatTableRef, smartIotMachines.map((machine) => machine.id));
  const visibleHeartbeatMachines = smartIotMachines.filter((machine) => visibleMachineIds.has(machine.id));
  const listHeartbeats = useQueries({
    queries: visibleHeartbeatMachines.map((machine, index) => ({
      queryKey: ["owner-machine-heartbeat", machine.id],
      queryFn: async ({ signal }: { signal: AbortSignal }) => {
        await staggerHeartbeatRequest(index, signal);
        return telemetryApi.getLatestHeartbeat(machine.id, signal);
      },
      enabled: isPageVisible,
      retry: false,
      staleTime: 3_000,
      refetchInterval: isPageVisible ? 5_000 : false,
      refetchIntervalInBackground: false,
    })),
  });
  const heartbeatByMachineId = new Map<string, (typeof listHeartbeats)[number]>();
  visibleHeartbeatMachines.forEach((machine, index) => heartbeatByMachineId.set(machine.id, listHeartbeats[index]!));
  const scopedMachine = list.data?.find((machine) => machine.id === machineId && machine.machineType === "SMART_IOT");
  const isSmartIot = Boolean(machineId && scopedMachine && detail.data?.machineType === "SMART_IOT");
  const heartbeat = useQuery({
    queryKey: ["owner-machine-heartbeat", machineId],
    queryFn: ({ signal }) => telemetryApi.getLatestHeartbeat(machineId!, signal),
    enabled: Boolean(isSmartIot && isPageVisible),
    retry: false,
    refetchInterval: isPageVisible ? 5_000 : false,
    refetchIntervalInBackground: false,
  });
  useEffect(() => {
    if (isSmartIot && telemetryRange === null) setTelemetryRange(createTelemetryRange("24h"));
  }, [isSmartIot, telemetryRange]);
  const points = useInfiniteQuery({
    queryKey: ["owner-machine-telemetry-points", machineId, telemetryRange?.from, telemetryRange?.to],
    queryFn: ({ signal, pageParam }) => {
      if (!telemetryRange) throw new Error("A telemetry time range is required.");
      return telemetryApi.listMachinePoints(machineId!, telemetryRange, pageParam, signal);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const nextOffset = allPages.length * TELEMETRY_POINTS_PAGE_SIZE;
      return lastPage.length === TELEMETRY_POINTS_PAGE_SIZE && nextOffset <= 100_000 ? nextOffset : undefined;
    },
    enabled: Boolean(isSmartIot && telemetryRange),
    retry: false,
  });
  const telemetryPoints = useMemo(() => points.data?.pages.flatMap((page) => page) ?? [], [points.data]);

  return (
    <section className={styles.pageContent} aria-labelledby="customer-screen-title">
      <BackButtonHeading
        back={back ?? null}
        title={machineId ? messages.MACHINE_DETAIL_TITLE : isHistory ? messages.MACHINE_HISTORY_TITLE : messages.MACHINES_TITLE}
        titleId="customer-screen-title"
        description={isHistory ? "Chọn máy để xem lịch sử hợp đồng, bảo trì và yêu cầu hỗ trợ." : messages.MACHINES_DESCRIPTION}
        className={styles.pageHeading}
      />
      {machineId ? (
        <MachineDetailView summary={detail.data ? [
          { label: messages.FIELD_STATUS, value: statusLabel(detail.data.status) },
          { label: messages.FIELD_MACHINE_TYPE, value: detail.data.machineType ?? "—" },
          { label: "Số ly từ lần vệ sinh gần nhất", value: typeof schedule.data?.cupsServedSinceLastDescale === "number" ? schedule.data.cupsServedSinceLastDescale.toLocaleString("vi-VN") : "—" },
          { label: messages.FIELD_NEXT_MAINTENANCE, value: formatDate(schedule.data?.nextPreventiveMaintenanceAt ?? detail.data.nextPreventiveMaintenanceAt) },
        ] : []}>
          <QueryFeedback loading={detail.isPending} failed={detail.isError} empty={!detail.data} emptyText={messages.NO_MACHINES} />
          {detail.data ? (
            <>
              <section className={styles.dataPanel} aria-labelledby="owner-machine-profile">
                <h2 id="owner-machine-profile">Thông tin & theo dõi</h2>
                <dl className={styles.detailGrid}>
                  <DetailItem label={messages.FIELD_MACHINE_ID} value={detail.data.id} />
                  <DetailItem label={messages.FIELD_SERIAL} value={detail.data.serialNumber} />
                  <DetailItem label={messages.FIELD_REGION} value={detail.data.region} />
                  <DetailItem label={messages.FIELD_DEPLOYED_AT} value={formatDate(detail.data.deployedAt)} />
                  <DetailItem label={messages.FIELD_CONTRACT_END} value={formatDate(detail.data.contractEndDate)} />
                </dl>
                <Link className={styles.secondaryLink} href={PATH_CUSTOMER.MACHINE_OPERATIONAL_OVERVIEW(machineId)}>
                  Xem dữ liệu vận hành
                </Link>
              </section>
              <section className={styles.dataPanel} aria-labelledby="owner-machine-history-contracts">
                <h2 id="owner-machine-history-contracts">Lịch sử hợp đồng</h2>
                {contractHistory.isPending ? <p className={styles.loadingNotice} role="status">Đang tải lịch sử hợp đồng…</p> : null}
                {contractHistory.isError ? <p className={styles.errorNotice} role="alert">Không tải được lịch sử hợp đồng của máy.</p> : null}
                {contractHistory.data?.length ? contractHistory.data.map((contract) => (
                  <article className={styles.recordCard} key={contract.id}>
                    <div>
                      <h3>{statusLabel(contract.status)}</h3>
                      <p>{formatDate(contract.startDate)} – {formatDate(contract.endDate)}</p>
                    </div>
                    <Link className={styles.secondaryLink} href={PATH_CUSTOMER.CONTRACT_DETAIL(contract.id)}>Xem hợp đồng</Link>
                  </article>
                )) : contractHistory.isSuccess ? <p className={styles.emptyNotice}>Chưa có lịch sử hợp đồng.</p> : null}
              </section>
              <section className={styles.dataPanel} aria-labelledby="owner-machine-history-maintenance">
                <h2 id="owner-machine-history-maintenance">Bảo trì và hỗ trợ</h2>
                {schedule.isError || maintenanceTickets.isError || maintenanceRequests.isError ? (
                  <p className={styles.errorNotice} role="alert">Không tải được một phần lịch sử bảo trì hoặc hỗ trợ.</p>
                ) : null}
                {schedule.isPending || maintenanceTickets.isPending || maintenanceRequests.isPending ? (
                  <p className={styles.loadingNotice} role="status">Đang tải lịch sử bảo trì…</p>
                ) : null}
                <p>Lịch bảo trì tiếp theo: {formatDate(schedule.data?.nextPreventiveMaintenanceAt ?? detail.data.nextPreventiveMaintenanceAt)}</p>
                {typeof schedule.data?.cupsServedSinceLastDescale === "number" ? (
                  <p>Số ly từ lần vệ sinh gần nhất: {schedule.data.cupsServedSinceLastDescale.toLocaleString("vi-VN")}</p>
                ) : null}
                {maintenanceTickets.data?.map((ticket) => (
                  <article className={styles.recordCard} key={ticket.id ?? `${ticket.status}-${ticket.scheduledDueAt}`}>
                    <div>
                      <h3>Phiếu bảo trì · {maintenanceTicketStatusLabels[ticket.status ?? ""] ?? statusLabel(ticket.status)}</h3>
                      <p>{formatDate(ticket.scheduledDueAt ?? ticket.completedAt)}</p>
                      {ticket.preventiveSubtype || ticket.source ? <p>{ticket.preventiveSubtype ?? ticket.source}</p> : null}
                    </div>
                  </article>
                ))}
                {maintenanceRequests.data?.map((request) => (
                  <article className={styles.recordCard} key={request.id}>
                    <div>
                      <h3>{request.requestType === "REPAIR" ? "Yêu cầu sửa chữa" : "Yêu cầu bảo trì"} · {maintenanceRequestStatusLabels[request.status] ?? statusLabel(request.status)}</h3>
                      <p>{request.issueDescription?.trim() || "Không có mô tả"}</p>
                    </div>
                    <Link className={styles.secondaryLink} href={`${PATH_CUSTOMER.SUPPORT}/${request.id}`}>Xem yêu cầu</Link>
                  </article>
                ))}
                {maintenanceTickets.isSuccess && maintenanceRequests.isSuccess
                  && maintenanceTickets.data.length === 0 && maintenanceRequests.data.length === 0 ? (
                  <p className={styles.emptyNotice}>Chưa có phiếu bảo trì hoặc yêu cầu hỗ trợ.</p>
                ) : null}
              </section>
              {isSmartIot ? <>
                <MachineHeartbeatPanel
                  title="Heartbeat mới nhất"
                  heartbeat={heartbeat.data}
                  loading={heartbeat.isPending}
                  error={heartbeat.isError ? getApiErrorMessage(heartbeat.error) : undefined}
                  onRetry={() => void heartbeat.refetch()}
                />
                <SmartIotPanel title="Lịch sử telemetry" description="Dữ liệu vận hành của máy trong khoảng thời gian đã chọn.">
                  <TelemetryHistoryPanel
                    range={telemetryRange}
                    onRangeChange={setTelemetryRange}
                    points={telemetryPoints}
                    loading={points.isPending && Boolean(telemetryRange)}
                    error={points.isError ? getApiErrorMessage(points.error) : undefined}
                    onRetry={() => void points.refetch()}
                    hasMore={points.hasNextPage}
                    loadingMore={points.isFetchingNextPage}
                    onLoadMore={() => void points.fetchNextPage()}
                  />
                </SmartIotPanel>
              </> : null}
            </>
          ) : null}
        </MachineDetailView>
      ) : (
        <MachineListView
          labelledBy="customer-screen-title"
          summary={list.data ? <div className={machineStyles.machineListCount}>
            <strong>{new Intl.NumberFormat("vi-VN").format(visibleMachines.length)}</strong>
            <span>{messages.MACHINES_TITLE.toLowerCase()}</span>
          </div> : null}
          controls={<div className={machineStyles.machineListFilterGroup} role="group" aria-label="Lọc máy theo loại">
            {([
              ["ALL", "Tất cả máy"],
              ["SMART_IOT", "Smart IoT"],
              ["CONVENTIONAL", "Thông thường"],
            ] as const).map(([value, label]) => (
              <button
                className={machineStyles.machineListFilterButton}
                type="button"
                key={value}
                aria-pressed={machineTypeFilter === value}
                onClick={() => setMachineTypeFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>}
        >
          <QueryFeedback
            loading={list.isPending}
            failed={list.isError}
            empty={Boolean(list.data && visibleMachines.length === 0)}
            emptyText={machineTypeFilter === "ALL" ? messages.NO_MACHINES : "Không có máy phù hợp với bộ lọc."}
          />
              {visibleMachines.length > 0 && <div ref={heartbeatTableRef}>
                <DataTable
                  variant="operations"
                  rows={visibleMachines}
                  rowKey={(machine) => machine.id}
                  rowProps={(machine) => machine.machineType === "SMART_IOT" ? { "data-machine-heartbeat-id": machine.id } : {}}
                  columns={[
                    { key: "machine-id", header: messages.FIELD_MACHINE_ID, align: "center", render: (machine) => machine.id.slice(0, 8).toUpperCase(), cellProps: (machine) => ({ title: machine.id }) },
                    { key: "serial", header: messages.FIELD_SERIAL, render: (machine) => machine.serialNumber ?? messages.MACHINE_NO_SERIAL },
                    { key: "type", header: messages.FIELD_MACHINE_TYPE, render: (machine) => machine.machineType === "SMART_IOT" ? "Smart IoT" : machine.machineType === "CONVENTIONAL" ? "Thông thường" : "—" },
                    { key: "status", header: messages.FIELD_STATUS, render: (machine) => statusLabel(machine.status) },
                    { key: "connection", header: "Kết nối", render: (machine) => {
                      if (machine.machineType !== "SMART_IOT") return "—";
                      const query = heartbeatByMachineId.get(machine.id);
                      const state: MachineConnectionState = query?.isError ? "error" : query?.isPending ? "loading" : query?.data?.status ?? "not-requested";
                      return <MachineConnectionBadge state={state} onRetry={query ? () => void query.refetch() : undefined} />;
                    } },
                    { key: "region", header: messages.FIELD_REGION, render: (machine) => machine.region ?? "—" },
                    { key: "contract-end", header: messages.FIELD_CONTRACT_END, align: "center", render: (machine) => formatDate(machine.contractEndDate) },
                    { key: "actions", header: "Thao tác", render: (machine) => <Link className={styles.secondaryLink} href={PATH_CUSTOMER.MACHINE_DETAIL(machine.id)}>{isHistory ? "Xem lịch sử máy" : messages.VIEW_DETAILS}</Link> },
                  ]}
                />
              </div>}
        </MachineListView>
      )}
    </section>
  );
}
