'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { DoloresPage } from '@/app/_shell/dolores/DoloresShell';
import {
  DoloresButton,
  DoloresField,
  DoloresFieldGrid,
  DoloresNotice,
  DoloresPanel,
  DoloresPanelTitle,
  DoloresTable,
} from '@/app/_ui/dolores/DoloresUI';
import { PATH_MODERATOR } from '@/routes/path';
import { isMachineId, useMachineDetail, useMachineInventory, useMachineMaintenanceSchedule, useMachineMaintenanceTickets } from '@/hooks/dolores/useMachines';
import { useTenants } from '@/hooks/dolores/useTenants';
import { useLocationById, usePlatformLocations } from '@/hooks/dolores/usePlatformLocations';
import { useInstallationWorkOrderById, usePlatformInstallationWorkOrders } from '@/hooks/dolores/useInstallationWorkOrders';
import { useMachineTelemetryPoints, type TelemetryPointsRange } from '@/hooks/dolores/useTelemetry';
import type { InstallationWorkOrderDetails, InstallationWorkOrderSummary } from '@/types/dolores/installationWorkOrders';
import type { MachineInventoryItem, MachineDetail, MaintenanceTicket } from '@/types/dolores/machines';

type QueryState<T> = {
  data: T | undefined;
  isPending: boolean;
  isError: boolean;
  isFetching: boolean;
  error: unknown;
  refetch: () => Promise<unknown>;
};

type TableRow = ReactNode[];

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}:\d{2}))?/.exec(value);
  if (!match) return value;
  const [, year, month, day, time] = match;
  return `${day}/${month}/${year}${time ? ` ${time}` : ''}`;
}

function apiErrorMessage(error: unknown, subject: string) {
  const status = error && typeof error === 'object' && 'status' in error && typeof error.status === 'number'
    ? error.status
    : undefined;
  if (status === 401) return 'Dolores trả về 401: phiên đăng nhập hoặc token chưa được xác thực.';
  if (status === 403) return 'Dolores trả về 403: tài khoản hiện tại không có quyền hoặc scope để đọc dữ liệu này.';
  if (status === 404) return `Dolores trả về 404: không tìm thấy ${subject} theo ID hiện tại.`;
  if (status !== undefined) return `Dolores trả về lỗi HTTP ${status}. Vui lòng thử lại sau khi kiểm tra API.`;
  return 'Không thể kết nối hoặc đọc dữ liệu từ Dolores. Vui lòng thử lại.';
}

function ApiReadStatus<T>({ query, subject }: { query: QueryState<T>; subject: string }) {
  const hasData = query.data !== undefined;
  if (query.isPending && !hasData) {
    return <div role="status" aria-live="polite"><DoloresNotice title={`Đang tải ${subject}`}>Đang lấy dữ liệu mới nhất từ Dolores.</DoloresNotice></div>;
  }
  if (query.isError) {
    return <div role="alert" aria-live="assertive"><DoloresNotice title={hasData ? `Không thể cập nhật ${subject}` : `Không thể tải ${subject}`}>
      <p>{apiErrorMessage(query.error, subject)}</p>
      <DoloresButton onClick={() => { void query.refetch(); }} variant="secondary">Thử lại</DoloresButton>
    </DoloresNotice></div>;
  }
  if (query.isFetching && hasData) return <div role="status" aria-live="polite"><DoloresNotice title={`Đang cập nhật ${subject}`}>Đang kiểm tra dữ liệu mới từ Dolores.</DoloresNotice></div>;
  return null;
}

function Unavailable({ title, detail }: { title: string; detail: string }) {
  return <DoloresPage title={title} description={detail} actions={<DoloresButton href={PATH_MODERATOR.machines} variant="secondary">Về danh sách máy</DoloresButton>}>
    <DoloresNotice title="Màn hình chưa khả dụng">Route hoặc thao tác mẫu chưa có API đọc tương ứng đã xác nhận. Không có yêu cầu ghi dữ liệu nào được gửi.</DoloresNotice>
  </DoloresPage>;
}

function ActionLinks({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-3">{children}</div>;
}

function MachineTable({ machines, emptyMessage }: { machines: MachineInventoryItem[]; emptyMessage?: string }) {
  const rows: TableRow[] = machines.map((machine) => [
    <Link key={`machine-${machine.id}`} href={PATH_MODERATOR.machineDetail(machine.id)} className="font-medium underline">{machine.serialNumber || machine.id}</Link>,
    machine.id,
    machine.status ?? '—',
    machine.tenantId ?? '—',
    machine.region ?? '—',
    formatDate(machine.deployedAt),
  ]);
  return <DoloresTable headers={['Mã hiển thị', 'ID API', 'Trạng thái', 'Tenant ID', 'Khu vực', 'Triển khai']} rows={rows} emptyMessage={machines.length === 0 ? emptyMessage : undefined} />;
}

function MaintenanceTable({ tickets, machineId, showEmpty = true }: { tickets: MaintenanceTicket[]; machineId?: string; showEmpty?: boolean }) {
  const visibleTickets = machineId ? tickets.filter((ticket) => ticket.machineId === machineId) : tickets;
  const rows: TableRow[] = visibleTickets.map((ticket) => [
    ticket.id ?? '—',
    ticket.machineId ? <Link key={ticket.id ?? ticket.machineId} href={PATH_MODERATOR.machineDetail(ticket.machineId)}>{ticket.machineId}</Link> : '—',
    ticket.status ?? '—',
    ticket.source ?? '—',
    formatDate(ticket.startedAt ?? ticket.acknowledgedAt),
    ticket.resolutionResult ?? ticket.notes ?? ticket.diagnosis ?? '—',
  ]);
  return <DoloresTable headers={['Ticket ID', 'Machine ID', 'Trạng thái', 'Nguồn', 'Ngày', 'Ghi nhận']} rows={rows} emptyMessage={showEmpty && visibleTickets.length === 0 ? 'Dolores không trả về ticket bảo trì phù hợp.' : undefined} />;
}

function MachineDetailPanel({ machine }: { machine: MachineDetail }) {
  const machineId = machine.id;
  const locationQuery = useLocationById(machine.locationId ?? undefined);
  const scheduleQuery = useMachineMaintenanceSchedule(machineId);
  const ticketQuery = useMachineMaintenanceTickets(true);
  const ticketCount = ticketQuery.data?.filter((ticket) => ticket.machineId === machineId).length;
  return <>
    <DoloresPanel>
      <DoloresPanelTitle>Thông tin máy từ Dolores</DoloresPanelTitle>
      <DoloresFieldGrid>
        <DoloresField label="Mã hiển thị" value={machine.serialNumber ?? '—'} />
        <DoloresField label="Machine ID" value={machine.id} />
        <DoloresField label="Tenant ID" value={machine.tenantId ?? '—'} />
        <DoloresField label="Loại máy" value={machine.machineType ?? '—'} />
        <DoloresField label="Trạng thái" value={machine.status ?? '—'} />
        <DoloresField label="Địa điểm" value={locationQuery.data?.name ?? machine.locationId ?? '—'} />
        <DoloresField label="Triển khai" value={formatDate(machine.deployedAt)} />
        <DoloresField label="Khu vực" value={machine.region ?? '—'} />
      </DoloresFieldGrid>
      {machine.locationId && <ApiReadStatus query={locationQuery} subject="địa điểm của máy" />}
    </DoloresPanel>
    <DoloresPanel>
      <DoloresPanelTitle>Lịch bảo trì</DoloresPanelTitle>
      <ApiReadStatus query={scheduleQuery} subject="lịch bảo trì" />
      {scheduleQuery.data && <DoloresFieldGrid>
        <DoloresField label="Bảo trì tiếp theo" value={formatDate(scheduleQuery.data.nextPreventiveMaintenanceAt)} />
        <DoloresField label="Ly từ lần tẩy cặn gần nhất" value={scheduleQuery.data.cupsServedSinceLastDescale?.toLocaleString('vi-VN') ?? '—'} />
      </DoloresFieldGrid>}
    </DoloresPanel>
    <DoloresPanel>
      <DoloresPanelTitle>Ticket bảo trì</DoloresPanelTitle>
      <ApiReadStatus query={ticketQuery} subject="ticket bảo trì" />
      {ticketQuery.data && <>
        <p className="mb-4 text-sm text-[#706561]">{ticketCount ?? 0} ticket cho machine ID này.</p>
        <MaintenanceTable tickets={ticketQuery.data} machineId={machineId} showEmpty={!ticketQuery.isError} />
      </>}
    </DoloresPanel>
  </>;
}

export function ModeratorMachinesScreen({ path }: { path: string }) {
  const inventoryQuery = useMachineInventory();
  const machineId = path.startsWith('machines/') ? path.slice('machines/'.length) : '';
  const isMachineDetail = Boolean(machineId) && !['list', 'stock', 'customer', 'loans', 'repair-history', 'substitute', 'substitute/return'].includes(machineId);
  const detailQuery = useMachineDetail(machineId);
  const historyQuery = useMachineMaintenanceTickets(path === 'machines/repair-history');
  const inventory = inventoryQuery.data ?? [];

  if (path === 'machines/loans' || path === 'machines/substitute' || path === 'machines/substitute/return') {
    return <Unavailable title="Máy cho mượn / máy thay" detail="Backend hiện không có endpoint đọc lịch sử máy cho mượn hoặc máy thay cho Moderator." />;
  }

  if (isMachineDetail) {
    if (!isMachineId(machineId)) return <Unavailable title="ID máy mẫu cũ" detail={`Mã ${machineId} không phải UUID máy từ API.`} />;
    return <DoloresPage title={`Hồ sơ máy ${machineId}`} description="Thông tin và lịch bảo trì đọc từ Dolores bằng machine UUID." actions={<ActionLinks><DoloresButton href={PATH_MODERATOR.machines} variant="secondary">Danh sách máy</DoloresButton><DoloresButton href={PATH_MODERATOR.machineRepairHistory} variant="secondary">Ticket bảo trì</DoloresButton></ActionLinks>}>
      <ApiReadStatus query={detailQuery} subject="hồ sơ máy" />
      {detailQuery.data && <MachineDetailPanel machine={detailQuery.data} />}
    </DoloresPage>;
  }

  const isStock = path === 'machines/stock';
  const isCustomer = path === 'machines/customer';
  const isHistory = path === 'machines/repair-history';
  const title = isStock ? 'Máy trong kho' : isCustomer ? 'Máy gắn với tenant' : isHistory ? 'Ticket bảo trì máy' : 'Máy & tồn kho';
  const visibleMachines = isStock
    ? inventory.filter(({ status }) => ['IN_WAREHOUSE', 'PENDING_ACTIVATION', 'AVAILABLE_FOR_RENT'].includes(status ?? ''))
    : isCustomer ? inventory.filter(({ tenantId: value }) => Boolean(value)) : inventory;
  return <DoloresPage title={title} description="Danh sách máy lấy từ GET /machines. Serial chỉ dùng để hiển thị; mọi liên kết hồ sơ dùng machine UUID." actions={<ActionLinks>
    <DoloresButton href={PATH_MODERATOR.machines} variant="secondary">Tất cả máy</DoloresButton>
    <DoloresButton href={PATH_MODERATOR.machineStock} variant="secondary">Máy trong kho</DoloresButton>
    <DoloresButton href={PATH_MODERATOR.machineCustomer} variant="secondary">Máy theo tenant</DoloresButton>
    <DoloresButton href={PATH_MODERATOR.machineRepairHistory} variant="secondary">Ticket bảo trì</DoloresButton>
  </ActionLinks>}>
    {isHistory ? <>
      <ApiReadStatus query={historyQuery} subject="ticket bảo trì" />
      {historyQuery.data && <MaintenanceTable tickets={historyQuery.data} showEmpty={!historyQuery.isError} />}
    </> : <>
      <ApiReadStatus query={inventoryQuery} subject="danh sách máy" />
      {inventoryQuery.data && <DoloresPanel><DoloresPanelTitle>{title}</DoloresPanelTitle><MachineTable machines={visibleMachines} emptyMessage={!inventoryQuery.isError ? (isStock ? 'Dolores không trả về máy có trạng thái sẵn sàng trong kho.' : 'Dolores không trả về máy nào.') : undefined} /></DoloresPanel>}
    </>}
  </DoloresPage>;
}

function TelemetryRangePanel({ machineId }: { machineId: string }) {
  const [range, setRange] = useState<TelemetryPointsRange | null>(null);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const query = useMachineTelemetryPoints(machineId, range, range !== null);
  const points = query.data?.pages.flat() ?? [];

  const submitRange = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const fromValue = String(form.get('from') ?? '');
    const toValue = String(form.get('to') ?? '');
    const fromDate = new Date(fromValue);
    const toDate = new Date(toValue);
    if (!fromValue || !toValue || Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime()) || fromDate >= toDate) {
      setRangeError('Chọn khoảng thời gian hợp lệ, thời điểm bắt đầu phải trước thời điểm kết thúc.');
      setRange(null);
      return;
    }
    setRangeError(null);
    setRange({ from: fromDate.toISOString(), to: toDate.toISOString() });
  };

  return <DoloresPanel>
    <DoloresPanelTitle>Telemetry theo khoảng thời gian</DoloresPanelTitle>
    <p className="mb-4 text-sm text-[#706561]">Chọn khoảng thời gian để truy vấn dữ liệu tối đa 100 điểm mỗi trang. Không tự động polling.</p>
    <form onSubmit={submitRange} className="mb-4 flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-xs">Từ <input className="rounded border p-2 text-sm" type="datetime-local" name="from" required /></label>
      <label className="flex flex-col gap-1 text-xs">Đến <input className="rounded border p-2 text-sm" type="datetime-local" name="to" required /></label>
      <DoloresButton type="submit">Truy vấn telemetry</DoloresButton>
    </form>
    {rangeError && <div role="alert"><DoloresNotice title="Khoảng thời gian không hợp lệ">{rangeError}</DoloresNotice></div>}
    {!range && <div role="status" aria-live="polite"><DoloresNotice title="Chọn khoảng thời gian">Dolores chưa được gọi cho đến khi bạn gửi khoảng thời gian hợp lệ.</DoloresNotice></div>}
    {range && <>
      <ApiReadStatus query={query} subject="telemetry" />
      {query.data && points.length === 0 && !query.isError && <div role="status" aria-live="polite"><DoloresNotice title="Không có telemetry">Dolores không trả về điểm telemetry trong khoảng đã chọn.</DoloresNotice></div>}
      {query.data && points.length > 0 && <DoloresTable headers={['Thời điểm', 'Trường', 'Giá trị', 'Substate']} rows={points.map((point) => [formatDate(point.timestamp), point.field, typeof point.value === 'string' ? point.value : JSON.stringify(point.value), point.subState ?? '—'])} />}
      {query.hasNextPage && <DoloresButton onClick={() => { void query.fetchNextPage(); }} disabled={query.isFetchingNextPage} variant="secondary">{query.isFetchingNextPage ? 'Đang tải…' : 'Tải thêm điểm'}</DoloresButton>}
    </>}
  </DoloresPanel>;
}

export function ModeratorIoTScreen({ path }: { path: string }) {
  const tenantsQuery = useTenants();
  const locationsState = usePlatformLocations(tenantsQuery.data);
  const inventoryQuery = useMachineInventory();
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const machineList = inventoryQuery.data ?? [];
  const selectedMachine = machineList.find(({ id }) => id === selectedMachineId) ?? machineList[0];
  const selectedDetailQuery = useMachineDetail(selectedMachine?.id ?? '');
  const locationQuery = useLocationById(selectedDetailQuery.data?.locationId ?? undefined);
  const isLocationsView = path === 'iot/customer';

  if (isLocationsView) {
    const rows = locationsState.locations.map(({ tenant, location }) => [tenant.name, location.name, location.address ?? '—', location.city ?? '—', location.active === false ? 'Không hoạt động' : 'Hoạt động', location.machineCount ?? '—']);
    return <DoloresPage title="Địa điểm vận hành" description="Địa điểm được tải theo từng tenant bằng tenantId UUID; không có dữ liệu mẫu." actions={<DoloresButton href={PATH_MODERATOR.iotMachines} variant="secondary">Máy & telemetry</DoloresButton>}>
      <ApiReadStatus query={tenantsQuery} subject="danh sách tenant" />
      {tenantsQuery.data && locationsState.isLoading && <div role="status" aria-live="polite"><DoloresNotice title="Đang tải địa điểm">Đang đọc địa điểm của các tenant.</DoloresNotice></div>}
      {locationsState.failedTenants.length > 0 && <div role="alert"><DoloresNotice title="Một số tenant chưa tải được địa điểm">{locationsState.failedTenants.map(({ tenant: value, error }) => <p key={value.id}>{value.name}: {apiErrorMessage(error, 'địa điểm')}</p>)}<DoloresButton onClick={locationsState.retryFailed} variant="secondary">Thử lại</DoloresButton></DoloresNotice></div>}
      {tenantsQuery.data && !tenantsQuery.isError && !locationsState.isLoading && (rows.length > 0 || locationsState.failedTenants.length === 0) && <DoloresPanel><DoloresPanelTitle>Địa điểm ({locationsState.locations.length})</DoloresPanelTitle><DoloresTable headers={['Tenant', 'Địa điểm', 'Địa chỉ', 'Thành phố', 'Trạng thái', 'Số máy']} rows={rows} emptyMessage={rows.length === 0 ? 'Dolores không trả về địa điểm cho tenant nào.' : undefined} /></DoloresPanel>}
    </DoloresPage>;
  }

  return <DoloresPage title="Giám sát máy & Smart IoT" description="Chọn máy từ danh sách API. Chỉ truy vấn telemetry khi hồ sơ xác nhận máy là SMART_IOT và đã chọn khoảng thời gian." actions={<ActionLinks><DoloresButton href={PATH_MODERATOR.iot} variant="secondary">Giám sát IoT</DoloresButton><DoloresButton href={PATH_MODERATOR.iotCustomer} variant="secondary">Địa điểm</DoloresButton><DoloresButton href={PATH_MODERATOR.machines} variant="secondary">Danh sách máy</DoloresButton></ActionLinks>}>
    <ApiReadStatus query={inventoryQuery} subject="danh sách máy" />
    {inventoryQuery.data && <DoloresPanel>
      <DoloresPanelTitle>Chọn máy</DoloresPanelTitle>
      {machineList.length > 0 ? <label className="flex max-w-xl flex-col gap-1 text-xs">Machine ID / serial
        <select value={selectedMachine?.id ?? ''} onChange={(event) => { setSelectedMachineId(event.currentTarget.value); }} className="rounded border p-2 text-sm">
          {machineList.map((machineValue) => <option key={machineValue.id} value={machineValue.id}>{machineValue.serialNumber || machineValue.id} · {machineValue.id}</option>)}
        </select>
      </label> : !inventoryQuery.isError && <div role="status" aria-live="polite"><DoloresNotice title="Không có máy">Dolores không trả về máy để giám sát.</DoloresNotice></div>}
    </DoloresPanel>}
    {selectedMachine && <>
      <ApiReadStatus query={selectedDetailQuery} subject="hồ sơ máy" />
      {selectedDetailQuery.data && <DoloresPanel>
        <DoloresPanelTitle>Trạng thái máy</DoloresPanelTitle>
        <DoloresFieldGrid>
          <DoloresField label="Mã hiển thị" value={selectedDetailQuery.data.serialNumber ?? '—'} />
          <DoloresField label="Machine ID" value={selectedDetailQuery.data.id} />
          <DoloresField label="Loại máy" value={selectedDetailQuery.data.machineType ?? '—'} />
          <DoloresField label="Trạng thái" value={selectedDetailQuery.data.status ?? '—'} />
          <DoloresField label="Địa điểm" value={locationQuery.data?.name ?? selectedDetailQuery.data.locationId ?? '—'} />
          <DoloresField label="Khu vực" value={selectedDetailQuery.data.region ?? '—'} />
        </DoloresFieldGrid>
        {selectedDetailQuery.data.locationId && <ApiReadStatus query={locationQuery} subject="địa điểm của máy" />}
      </DoloresPanel>}
      {selectedDetailQuery.data?.machineType === 'SMART_IOT'
        ? <TelemetryRangePanel machineId={selectedMachine.id} />
        : selectedDetailQuery.data?.machineType === 'CONVENTIONAL'
          ? <DoloresNotice title="Máy thường không có telemetry Smart IoT">Hồ sơ API xác nhận đây là máy CONVENTIONAL.</DoloresNotice>
          : selectedDetailQuery.data && <DoloresNotice title="Chưa xác định loại máy">Dolores chưa phân loại máy này. Không suy đoán loại máy hoặc gửi truy vấn telemetry.</DoloresNotice>}
    </>}
  </DoloresPage>;
}

function workOrderRows(records: { tenant: { name: string }; workOrder: InstallationWorkOrderSummary }[]): TableRow[] {
  return records.map(({ tenant, workOrder }) => [
    'Installation work order',
    <Link key={workOrder.id} href={PATH_MODERATOR.technicalRequestDetail(workOrder.id)}>{workOrder.id}</Link>,
    workOrder.machineId,
    tenant.name,
    workOrder.status,
    formatDate(workOrder.scheduledFor),
    workOrder.failureReason ?? '—',
  ]);
}

function ticketRows(tickets: MaintenanceTicket[]): TableRow[] {
  return tickets.map((ticket) => [
    'Maintenance ticket',
    ticket.id ?? '—',
    ticket.machineId ? <Link key={ticket.id ?? ticket.machineId} href={PATH_MODERATOR.machineDetail(ticket.machineId)}>{ticket.machineId}</Link> : '—',
    ticket.tenantId ?? '—',
    ticket.status ?? '—',
    formatDate(ticket.startedAt ?? ticket.acknowledgedAt),
    ticket.resolutionResult ?? ticket.notes ?? ticket.diagnosis ?? '—',
  ]);
}

function WorkOrderDetail({ details }: { details: InstallationWorkOrderDetails }) {
  const workOrder = details.workOrder;
  return <>
    <DoloresPanel>
      <DoloresPanelTitle>Installation work order</DoloresPanelTitle>
      <DoloresFieldGrid>
        <DoloresField label="Work order ID" value={workOrder.id} />
        <DoloresField label="Trạng thái" value={workOrder.status} />
        <DoloresField label="Tenant ID" value={workOrder.tenantId} />
        <DoloresField label="Contract ID" value={workOrder.contractId} />
        <DoloresField label="Machine ID" value={workOrder.machineId} />
        <DoloresField label="Loại máy" value={workOrder.machineType} />
        <DoloresField label="Technician ID" value={workOrder.assignedTechnicianId ?? '—'} />
        <DoloresField label="Lịch hẹn" value={formatDate(workOrder.scheduledFor)} />
        <DoloresField label="Bắt đầu" value={formatDate(workOrder.startedAt)} />
        <DoloresField label="Hoàn tất" value={formatDate(workOrder.completedAt)} />
        <DoloresField label="Người nhận bàn giao" value={workOrder.handoverRecipient ?? '—'} />
        <DoloresField label="Lý do thất bại" value={workOrder.failureReason ?? '—'} />
      </DoloresFieldGrid>
    </DoloresPanel>
    <DoloresPanel><DoloresPanelTitle>Checklist ({details.checklistItems.length})</DoloresPanelTitle><DoloresTable headers={['Mã', 'Hạng mục', 'Bắt buộc', 'Kết quả', 'Ghi chú']} rows={details.checklistItems.map((item) => [item.itemCode, item.label, item.required ? 'Có' : 'Không', item.result, item.notes ?? '—'])} emptyMessage={details.checklistItems.length === 0 ? 'Work order chưa có checklist.' : undefined} /></DoloresPanel>
    <DoloresPanel><DoloresPanelTitle>Phụ kiện ({details.accessories.length})</DoloresPanelTitle><DoloresTable headers={['Tên phụ kiện', 'Số lượng', 'Serial', 'Ghi chú']} rows={details.accessories.map((item) => [item.accessoryName, item.quantity, item.serialNumber ?? '—', item.notes ?? '—'])} emptyMessage={details.accessories.length === 0 ? 'Work order chưa ghi nhận phụ kiện.' : undefined} /></DoloresPanel>
    <DoloresPanel><DoloresPanelTitle>Metadata chứng cứ ({details.evidence.length})</DoloresPanelTitle><DoloresTable headers={['Tên tệp', 'Loại nội dung', 'Kích thước', 'SHA-256', 'Thời điểm tải lên']} rows={details.evidence.map((item) => [item.originalFilename, item.contentType ?? '—', `${item.sizeBytes} bytes`, item.sha256 ?? '—', formatDate(item.uploadedAt)])} emptyMessage={details.evidence.length === 0 ? 'Work order chưa có metadata chứng cứ.' : undefined} /></DoloresPanel>
  </>;
}

export function ModeratorTechnicalScreen({ path }: { path: string }) {
  const isMachineHistory = path === 'machine-history' || path.startsWith('machine-history/');
  const isWorkOrderList = path === 'technical-requests' || path === 'technical-requests/list';
  const workOrderId = path.startsWith('technical-requests/') ? path.slice('technical-requests/'.length) : '';
  const isWorkOrderDetail = Boolean(workOrderId) && !['list', 'new'].includes(workOrderId) && !workOrderId.startsWith('new/');
  const isUnsupportedWrite = path === 'technical-requests/new' || path.startsWith('technical-requests/new/');
  const historyMachineId = path.startsWith('machine-history/') ? path.slice('machine-history/'.length) : '';
  const validHistoryMachineId = !historyMachineId || isMachineId(historyMachineId);
  const ticketsQuery = useMachineMaintenanceTickets(isWorkOrderList || isMachineHistory);
  const tenantsQuery = useTenants(isWorkOrderList);
  const workOrdersState = usePlatformInstallationWorkOrders(tenantsQuery.data, isWorkOrderList);
  const detailQuery = useInstallationWorkOrderById(workOrderId, isWorkOrderDetail);

  if (isUnsupportedWrite) return <DoloresPage title="Yêu cầu kỹ thuật chưa khả dụng" description="Tạo hoặc gửi yêu cầu là thao tác ghi, được hoãn sang phase sau." actions={<DoloresButton href={PATH_MODERATOR.technicalRequests} variant="secondary">Danh sách yêu cầu</DoloresButton>}><DoloresNotice title="Chỉ bật luồng đọc">Phase 3 không gửi ticket hoặc installation work order mới.</DoloresNotice></DoloresPage>;

  if (isWorkOrderDetail) {
    if (!isMachineId(workOrderId)) return <Unavailable title="ID yêu cầu mẫu cũ" detail={`Mã ${workOrderId} không phải UUID installation work order từ API.`} />;
    return <DoloresPage title={`Work order ${workOrderId}`} description="Chi tiết, checklist, phụ kiện và metadata chứng cứ từ GET /installation-work-orders/{id}." actions={<DoloresButton href={PATH_MODERATOR.technicalRequests} variant="secondary">Danh sách công việc</DoloresButton>}>
      <ApiReadStatus query={detailQuery} subject="installation work order" />
      {detailQuery.data && <WorkOrderDetail details={detailQuery.data} />}
    </DoloresPage>;
  }

  if (isMachineHistory) {
    if (!validHistoryMachineId) return <Unavailable title="ID máy mẫu cũ" detail={`Mã ${historyMachineId} không phải UUID máy từ API.`} />;
    return <DoloresPage title={historyMachineId ? 'Lịch sử ticket của máy' : 'Ticket bảo trì & lịch sử máy'} description="Dữ liệu lấy từ collection GET /maintenance-tickets; API không có route detail theo ticket ID." actions={<DoloresButton href={PATH_MODERATOR.technicalRequests} variant="secondary">Yêu cầu & work order</DoloresButton>}>
      <ApiReadStatus query={ticketsQuery} subject="ticket bảo trì" />
      {ticketsQuery.data && <DoloresPanel><DoloresPanelTitle>Ticket bảo trì</DoloresPanelTitle><MaintenanceTable tickets={ticketsQuery.data} machineId={historyMachineId || undefined} showEmpty={!ticketsQuery.isError} /></DoloresPanel>}
    </DoloresPage>;
  }

  if (!isWorkOrderList) return <Unavailable title="Chi tiết chưa khả dụng" detail="Chỉ installation work order có UUID server mới có màn hình chi tiết đọc." />;

  const rows = [...ticketRows(ticketsQuery.data ?? []), ...workOrderRows(workOrdersState.workOrders)];
  const hasReadError = ticketsQuery.isError || tenantsQuery.isError || workOrdersState.failedTenants.length > 0;
  return <DoloresPage title="Yêu cầu kỹ thuật & công việc vận hành" description="Hiển thị maintenance ticket và installation work order từ các endpoint đọc được xác nhận. Không có thao tác điều phối hoặc chuyển trạng thái." actions={<DoloresButton href={PATH_MODERATOR.machines} variant="secondary">Danh sách máy</DoloresButton>}>
    <ApiReadStatus query={ticketsQuery} subject="ticket bảo trì" />
    <ApiReadStatus query={tenantsQuery} subject="danh sách tenant" />
    {workOrdersState.isLoading && <div role="status" aria-live="polite"><DoloresNotice title="Đang tải installation work order">Đang truy vấn theo tenantId.</DoloresNotice></div>}
    {workOrdersState.failedTenants.length > 0 && <div role="alert"><DoloresNotice title="Một số tenant chưa tải được work order">{workOrdersState.failedTenants.map(({ tenant, error }) => <p key={tenant.id}>{tenant.name}: {apiErrorMessage(error, 'installation work order')}</p>)}<DoloresButton onClick={workOrdersState.retryFailed} variant="secondary">Thử lại</DoloresButton></DoloresNotice></div>}
    {ticketsQuery.data !== undefined && tenantsQuery.data !== undefined && !ticketsQuery.isError && !tenantsQuery.isError && !workOrdersState.isLoading && (rows.length > 0 || !hasReadError) && <DoloresPanel><DoloresPanelTitle>Công việc ({rows.length})</DoloresPanelTitle><DoloresTable headers={['Loại', 'ID', 'Machine ID', 'Tenant', 'Trạng thái', 'Ngày', 'Ghi nhận']} rows={rows} emptyMessage={rows.length === 0 ? 'Dolores không trả về ticket hoặc work order.' : undefined} /></DoloresPanel>}
  </DoloresPage>;
}
