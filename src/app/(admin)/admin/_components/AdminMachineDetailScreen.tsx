'use client';

import { useState, type FormEvent } from 'react';
import {
  DoloresApiErrorState,
  DoloresEmptyState,
  DoloresLoadingState,
} from '@/app/_ui/dolores/DoloresApiState';
import { DoloresApiError } from '@/apis/dolores/client';
import {
  DoloresButton,
  DoloresNotice,
  DoloresPanel,
  DoloresPanelTitle,
  DoloresStatCard,
  DoloresTable,
} from '@/app/_ui/dolores/DoloresUI';
import { DoloresPage } from '@/app/_shell/dolores/DoloresShell';
import { MachineDetailField as DetailField } from '@/app/_features/machines/MachinePresentation';
import {
  useMachineDetail,
  useMachineHeartbeat,
  useMachineMaintenanceSchedule,
  useMachineMaintenanceTickets,
  isMachineId,
} from '@/hooks/dolores/useMachines';
import { useMachineTelemetryPoints, type TelemetryPointsRange } from '@/hooks/dolores/useTelemetry';
import { PATH_ADMIN } from '@/routes/path';
import type { MaintenanceTicket } from '@/schemas/dolores/machines';

const MACHINE_STATUS_LABELS: Record<string, string> = {
  IN_WAREHOUSE: 'Trong kho',
  PENDING_ACTIVATION: 'Chờ kích hoạt',
  DEPLOYED_CONTRACT_OWNER: 'Đang triển khai · chủ hợp đồng',
  DEPLOYED_STORE_OWNER: 'Đang triển khai · chủ cửa hàng',
  UNDER_MAINTENANCE: 'Đang bảo trì',
  REFURBISHING: 'Đang tân trang',
  PENDING_QA: 'Chờ kiểm định',
  AVAILABLE_FOR_RENT: 'Sẵn sàng cho thuê',
  RETIRED: 'Đã ngừng sử dụng',
};

const TICKET_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ xử lý',
  ASSIGNED: 'Đã phân công',
  IN_PROGRESS: 'Đang thực hiện',
  RESOLVED: 'Đã hoàn tất',
};

const HEARTBEAT_STATUS_HELP: Record<string, string> = {
  ONLINE: 'Liveness được máy chủ nhận trong vòng 10 giây gần nhất.',
  OFFLINE: 'Lần nhận liveness gần nhất đã cũ hơn 10 giây.',
  UNKNOWN: 'Chưa có liveness được lưu hoặc chưa có mapping thiết bị hoạt động.',
};

function formatTimestamp(value: string | null | undefined): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const parsed = new Date(value + (value.length === 10 ? 'T00:00:00' : ''));
  if (Number.isNaN(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(parsed);
}

function formatNumber(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : new Intl.NumberFormat('vi-VN').format(value);
}

function toDateTimeLocalInput(value: Date): string {
  const localDate = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function formatTelemetryValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(value);
  if (typeof value === 'boolean') return value ? 'Có' : 'Không';

  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

function formatTicketStatus(status: MaintenanceTicket['status']): string {
  return status ? TICKET_STATUS_LABELS[status] : 'Chưa có trạng thái';
}

export default function AdminMachineDetailScreen({ machineId }: { machineId: string }) {
  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput] = useState('');
  const [submittedRange, setSubmittedRange] = useState<TelemetryPointsRange | null>(null);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const validId = isMachineId(machineId);
  const machineQuery = useMachineDetail(machineId);
  const scheduleQuery = useMachineMaintenanceSchedule(machineId);
  const ticketQuery = useMachineMaintenanceTickets(validId && machineQuery.isSuccess);
  const machine = machineQuery.data;
  const isSmartIot = machine?.machineType === 'SMART_IOT';
  const heartbeatQuery = useMachineHeartbeat(machineId, isSmartIot);
  const pointsQuery = useMachineTelemetryPoints(machineId, submittedRange, isSmartIot && submittedRange !== null);
  const telemetryPoints = pointsQuery.data?.pages.flatMap((page) => page) ?? [];
  const machineTickets = (ticketQuery.data ?? []).filter((ticket) => ticket.machineId === machine?.id);

  const refresh = () => {
    const requests: Array<Promise<unknown>> = [machineQuery.refetch(), scheduleQuery.refetch()];
    if (machineQuery.isSuccess) requests.push(ticketQuery.refetch());
    if (isSmartIot) requests.push(heartbeatQuery.refetch());
    if (isSmartIot && submittedRange) requests.push(pointsQuery.refetch());
    void Promise.all(requests);
  };

  const handleTelemetryRangeSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const from = new Date(fromInput);
    const to = new Date(toInput);

    if (!fromInput || !toInput || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      setRangeError('Hãy chọn thời điểm bắt đầu và kết thúc hợp lệ.');
      return;
    }
    if (from >= to) {
      setRangeError('Thời điểm bắt đầu phải trước thời điểm kết thúc.');
      return;
    }

    setRangeError(null);
    setSubmittedRange({ from: from.toISOString(), to: to.toISOString() });
  };

  const loadLast24Hours = () => {
    const to = new Date();
    const from = new Date(to.getTime() - 24 * 60 * 60 * 1000);
    setFromInput(toDateTimeLocalInput(from));
    setToInput(toDateTimeLocalInput(to));
    setRangeError(null);
    setSubmittedRange({ from: from.toISOString(), to: to.toISOString() });
  };

  if (!validId) {
    return (
      <DoloresPage
        title="Hồ sơ máy"
        description="Mở hồ sơ máy bằng UUID Dolores."
        actions={<DoloresButton href={PATH_ADMIN.machines} variant="secondary">Về danh sách máy</DoloresButton>}
      >
        <DoloresNotice title="Đường dẫn này không dùng UUID">
          Liên kết cũ có thể chứa serial. Serial chỉ dùng để hiển thị; hãy mở hồ sơ bằng UUID trong danh sách máy để tải dữ liệu API.
        </DoloresNotice>
      </DoloresPage>
    );
  }

  const pageActions = (
    <>
      <DoloresButton href={PATH_ADMIN.iot} variant="secondary">Giám sát Smart IoT</DoloresButton>
      <DoloresButton href={PATH_ADMIN.machines} variant="secondary">Danh sách máy</DoloresButton>
      <DoloresButton onClick={refresh}>Làm mới</DoloresButton>
    </>
  );

  if (machineQuery.isPending) {
    return (
      <DoloresPage title="Hồ sơ máy" description="Đang tải dữ liệu từ Dolores." actions={pageActions}>
        <DoloresLoadingState />
      </DoloresPage>
    );
  }

  if (machineQuery.isError) {
    if (machineQuery.error instanceof DoloresApiError && machineQuery.error.kind === 'not_found') {
      return (
        <DoloresPage title="Hồ sơ máy" description="Không tìm thấy hồ sơ theo UUID đã chọn." actions={pageActions}>
          <DoloresEmptyState message="Máy không tồn tại hoặc không nằm trong phạm vi tài khoản Dolores hiện tại." />
        </DoloresPage>
      );
    }

    return (
      <DoloresPage title="Hồ sơ máy" description="Không tải được dữ liệu từ Dolores." actions={pageActions}>
        <DoloresApiErrorState error={machineQuery.error} onRetry={() => { void machineQuery.refetch(); }} />
      </DoloresPage>
    );
  }

  if (!machine) {
    return (
      <DoloresPage title="Hồ sơ máy" description="Không có dữ liệu máy." actions={pageActions}>
        <DoloresEmptyState message="API không trả về hồ sơ máy cho UUID này." />
      </DoloresPage>
    );
  }

  const heartbeat = heartbeatQuery.data;
  const health = heartbeat?.health;

  return (
    <DoloresPage
      title={machine.serialNumber ? `Hồ sơ máy · ${machine.serialNumber}` : 'Hồ sơ máy'}
      description="Thông tin máy, lịch bảo trì và dữ liệu vận hành được tải theo UUID."
      actions={pageActions}
    >
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <DoloresStatCard label="Trạng thái máy" value={machine.status ? MACHINE_STATUS_LABELS[machine.status] : '—'} />
        <DoloresStatCard label="Loại máy" value={machine.machineType === 'SMART_IOT' ? 'Smart IoT' : machine.machineType === 'CONVENTIONAL' ? 'Máy thường' : 'Chưa được phân loại'} />
        <DoloresStatCard label="Ly từ lần xả cặn gần nhất" value={formatNumber(machine.cupsServedSinceLastDescale)} />
        <DoloresStatCard label="Bảo trì phòng ngừa tiếp theo" value={formatDate(scheduleQuery.data?.nextPreventiveMaintenanceAt ?? machine.nextPreventiveMaintenanceAt)} />
      </div>

      <DoloresPanel>
        <DoloresPanelTitle>Thông tin máy</DoloresPanelTitle>
        <div className="grid grid-cols-2 gap-x-4 gap-y-7">
          <DetailField label="UUID máy" value={<span className="break-all font-mono text-xs">{machine.id}</span>} />
          <DetailField label="Serial" value={machine.serialNumber ?? '—'} />
          <DetailField label="Tenant UUID" value={<span className="break-all font-mono text-xs">{machine.tenantId ?? '—'}</span>} />
          <DetailField label="Khu vực" value={machine.region ?? '—'} />
          <DetailField label="Location UUID" value={<span className="break-all font-mono text-xs">{machine.locationId ?? '—'}</span>} />
          <DetailField label="Ngày triển khai" value={formatTimestamp(machine.deployedAt)} />
          <DetailField label="Ngày phân loại máy" value={formatTimestamp(machine.machineTypeMappedAt)} />
          <DetailField label="Loại máy được ghi nhận bởi" value={machine.machineTypeMappedBy ?? '—'} />
          <DetailField label="Lý do phân loại máy" value={machine.machineTypeMappingReason ?? '—'} />
        </div>
      </DoloresPanel>

      <DoloresPanel>
        <DoloresPanelTitle>Lịch bảo trì phòng ngừa</DoloresPanelTitle>
        {scheduleQuery.isPending ? (
          <DoloresLoadingState />
        ) : scheduleQuery.isError ? (
          <DoloresApiErrorState error={scheduleQuery.error} onRetry={() => { void scheduleQuery.refetch(); }} />
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-7">
            <DetailField label="Lần bảo trì tiếp theo" value={formatTimestamp(scheduleQuery.data?.nextPreventiveMaintenanceAt)} />
            <DetailField label="Ly từ lần xả cặn gần nhất" value={formatNumber(scheduleQuery.data?.cupsServedSinceLastDescale)} />
          </div>
        )}
      </DoloresPanel>

      {machine.machineType === 'SMART_IOT' ? (
        <>
          <DoloresPanel>
            <DoloresPanelTitle>Heartbeat mới nhất</DoloresPanelTitle>
          {heartbeatQuery.isPending ? (
            <DoloresLoadingState />
          ) : heartbeatQuery.isError ? (
            <DoloresApiErrorState error={heartbeatQuery.error} onRetry={() => { void heartbeatQuery.refetch(); }} />
          ) : heartbeat ? (
            <>
              <p className="-mt-2 mb-5 text-sm text-[#706561]">
                {heartbeat.status}: {HEARTBEAT_STATUS_HELP[heartbeat.status]}
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-7">
                <DetailField label="Đánh giá lúc" value={formatTimestamp(heartbeat.evaluatedAt)} />
                <DetailField label="Máy chủ nhận liveness gần nhất" value={formatTimestamp(heartbeat.lastSeenAt)} />
                <DetailField label="Thời điểm máy báo liveness" value={formatTimestamp(heartbeat.deviceReportedAt)} />
                <DetailField label="Health được nhận lúc" value={formatTimestamp(heartbeat.healthReportedAt)} />
                <DetailField label="Load trung bình 1 phút" value={health?.osLoadAvg1m ?? '—'} />
                <DetailField label="RAM đã dùng / tổng (MB)" value={health ? `${formatNumber(health.ramUsedMb)} / ${formatNumber(health.ramTotalMb)}` : '—'} />
                <DetailField label="Độ trễ WireGuard (ms)" value={formatNumber(health?.netbirdWireguardLatencyMs)} />
                <DetailField label="Wi-Fi RSSI (dBm)" value={formatNumber(health?.wifiRssiDbm)} />
                <DetailField label="Firmware" value={health?.firmwareVersion ?? '—'} />
                <DetailField label="Edge app" value={health?.edgeAppVersion ?? '—'} />
                <DetailField label="UART nhận / CRC lỗi / frame rơi" value={health?.uartStats ? `${formatNumber(health.uartStats.packetsRx)} / ${formatNumber(health.uartStats.crcErrors)} / ${formatNumber(health.uartStats.droppedFrames)}` : '—'} />
              </div>
              {!health && <DoloresNotice title="Chưa có health metrics">Backend chưa trả về health metrics cho heartbeat này.</DoloresNotice>}
            </>
          ) : (
            <DoloresEmptyState message="Backend chưa trả về heartbeat cho máy này." />
          )}
          </DoloresPanel>
          <DoloresPanel>
            <DoloresPanelTitle>Telemetry points</DoloresPanelTitle>
          <p className="-mt-2 mb-5 text-sm text-[#706561]">
            Chọn khoảng thời gian để tải dữ liệu time-series theo máy. Kết quả chỉ tải khi bạn yêu cầu và không phải dữ liệu realtime.
          </p>
          <form onSubmit={handleTelemetryRangeSubmit} className="mb-5 flex flex-col gap-4">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] md:items-end">
              <label className="flex flex-col gap-2 text-sm font-medium text-[#302927]">
                Từ
                <input
                  className="h-12 rounded-[10px] border border-[#E9E2DC] bg-white px-3 text-sm"
                  type="datetime-local"
                  required
                  value={fromInput}
                  onChange={(event) => {
                    setFromInput(event.currentTarget.value);
                    setSubmittedRange(null);
                    setRangeError(null);
                  }}
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-[#302927]">
                Đến
                <input
                  className="h-12 rounded-[10px] border border-[#E9E2DC] bg-white px-3 text-sm"
                  type="datetime-local"
                  required
                  value={toInput}
                  onChange={(event) => {
                    setToInput(event.currentTarget.value);
                    setSubmittedRange(null);
                    setRangeError(null);
                  }}
                />
              </label>
              <DoloresButton type="button" variant="secondary" onClick={loadLast24Hours}>
                24 giờ qua
              </DoloresButton>
              <DoloresButton type="submit">Truy vấn</DoloresButton>
            </div>
            <p className="text-xs text-[#706561]">Thời gian nhập theo múi giờ của trình duyệt.</p>
          </form>
          {rangeError && <p className="mb-4 text-sm text-[#B81724]" role="alert">{rangeError}</p>}
          {!submittedRange ? (
            <DoloresEmptyState message="Chọn khoảng thời gian hoặc bấm “24 giờ qua” để truy vấn telemetry." />
          ) : pointsQuery.isPending ? (
            <DoloresLoadingState />
          ) : pointsQuery.isError ? (
            <DoloresApiErrorState error={pointsQuery.error} onRetry={() => { void pointsQuery.refetch(); }} />
          ) : telemetryPoints.length === 0 ? (
            <DoloresEmptyState message="Không có telemetry point trong khoảng thời gian đã chọn." />
          ) : (
            <>
              <p className="mb-3 text-sm text-[#706561]">Đã tải {formatNumber(telemetryPoints.length)} điểm.</p>
              <DoloresTable
                headers={['Thời điểm', 'Trường', 'Giá trị', 'Trạng thái phụ']}
                rows={telemetryPoints.map((point, index) => [
                  formatTimestamp(point.timestamp),
                  <span className="font-mono text-xs" key={`field-${index}`}>{point.field}</span>,
                  <span className="break-all" key={`value-${index}`}>{formatTelemetryValue(point.value)}</span>,
                  point.subState ?? '—',
                ])}
              />
              {pointsQuery.hasNextPage && (
                <div className="mt-4">
                  <DoloresButton
                    variant="secondary"
                    onClick={() => { void pointsQuery.fetchNextPage(); }}
                    disabled={pointsQuery.isFetchingNextPage}
                  >
                    {pointsQuery.isFetchingNextPage ? 'Đang tải…' : 'Tải thêm'}
                  </DoloresButton>
                </div>
              )}
            </>
          )}
          <p className="mt-4 text-xs text-[#706561]">
            Mỗi lần tải tối đa 100 điểm; kết quả được phân trang theo thời gian tăng dần.
          </p>
          </DoloresPanel>
        </>
      ) : machine.machineType === 'CONVENTIONAL' ? (
        <DoloresNotice title="Máy thường">Heartbeat và telemetry không được truy vấn cho loại máy này.</DoloresNotice>
      ) : (
        <DoloresNotice title="Chưa có phân loại máy">Không gọi heartbeat cho đến khi backend xác nhận machineType là SMART_IOT.</DoloresNotice>
      )}

      <DoloresPanel>
        <DoloresPanelTitle>Vé bảo trì</DoloresPanelTitle>
        {ticketQuery.isPending ? (
          <DoloresLoadingState />
        ) : ticketQuery.isError ? (
          <DoloresApiErrorState error={ticketQuery.error} onRetry={() => { void ticketQuery.refetch(); }} />
        ) : machineTickets.length === 0 ? (
          <DoloresEmptyState message="Không có vé bảo trì nào được trả về cho máy này." />
        ) : (
          <DoloresTable
            headers={['ID vé', 'Nguồn', 'Trạng thái', 'Phụ trách', 'Bắt đầu', 'Chẩn đoán / kết quả']}
            rows={machineTickets.map((ticket, index) => [
              <span className="break-all font-mono text-xs" key={ticket.id ?? `ticket-${index}`}>{ticket.id ?? '—'}</span>,
              ticket.source ?? '—',
              formatTicketStatus(ticket.status),
              ticket.assignedTo ?? '—',
              formatTimestamp(ticket.startedAt ?? ticket.acknowledgedAt),
              ticket.resolutionResult ?? ticket.diagnosis ?? ticket.notes ?? '—',
            ])}
          />
        )}
      </DoloresPanel>
    </DoloresPage>
  );
}
