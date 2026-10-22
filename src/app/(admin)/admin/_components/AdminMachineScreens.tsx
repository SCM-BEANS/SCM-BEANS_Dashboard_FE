'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  DoloresEmptyState,
  DoloresLoadingState,
  DoloresApiErrorState,
} from '@/app/_ui/dolores/DoloresApiState';
import { DoloresButton, DoloresNotice, DoloresPanel, DoloresPanelTitle, DoloresStatCard, DoloresTable } from '@/app/_ui/dolores/DoloresUI';
import { DoloresPage } from '@/app/_shell/dolores/DoloresShell';
import { useInventorySummary, useMachineInventory } from '@/hooks/dolores/useMachines';
import type { AdminMachineView } from '@/routes/query';
import { PATH_ADMIN } from '@/routes/path';
import type { MachineInventoryItem } from '@/types/dolores/machines';

const MACHINE_STATUSES = [
  'IN_WAREHOUSE',
  'PENDING_ACTIVATION',
  'DEPLOYED_CONTRACT_OWNER',
  'DEPLOYED_STORE_OWNER',
  'UNDER_MAINTENANCE',
  'REFURBISHING',
  'PENDING_QA',
  'AVAILABLE_FOR_RENT',
  'RETIRED',
] as const;

type MachineStatus = typeof MACHINE_STATUSES[number];
type StatusFilter = 'ALL' | MachineStatus;

const STATUS_LABELS: Record<MachineStatus, string> = {
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

function statusLabel(status: MachineInventoryItem['status']): string {
  return status ? STATUS_LABELS[status] : 'Chưa có trạng thái';
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(parsed);
}

function formatContractPeriod(start: string | null | undefined, end: string | null | undefined): string {
  if (!start && !end) return '—';
  return `${formatDate(start)} → ${formatDate(end)}`;
}

export default function AdminMachineScreens({ initialView = 'inventory' }: { initialView?: AdminMachineView }) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const inventory = useMachineInventory();
  const summary = useInventorySummary();

  const refresh = () => {
    void Promise.all([inventory.refetch(), summary.refetch()]);
  };

  const filteredMachines = (inventory.data ?? []).filter((machine) =>
    statusFilter === 'ALL' || machine.status === statusFilter
  );
  const statusCounts = summary.data?.statusCounts;
  const sumStatusCounts = (...statuses: MachineStatus[]) => {
    if (!statusCounts || statuses.some((status) => statusCounts[status] === undefined)) return null;
    return statuses.reduce((total, status) => total + (statusCounts[status] ?? 0), 0);
  };

  return (
    <DoloresPage
      title="Máy & tồn kho"
      description="Danh sách và trạng thái máy lấy từ Dolores. UUID là định danh hồ sơ; serial chỉ dùng để hiển thị."
      actions={
        <>
          <DoloresButton href={PATH_ADMIN.iot} variant="secondary">Giám sát Smart IoT</DoloresButton>
          <DoloresButton onClick={refresh}>Làm mới</DoloresButton>
        </>
      }
    >
      {initialView !== 'inventory' && (
        <DoloresNotice title="Mục lịch sử chưa có API tương ứng">
          Màn hình cũ hiển thị dữ liệu minh họa cho kho theo luồng, máy thay và lịch sử sửa chữa. Hiện tại danh sách máy, lịch bảo trì và vé bảo trì sẽ dùng dữ liệu API thật khi có endpoint phù hợp.
        </DoloresNotice>
      )}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <DoloresStatCard label="Tổng số máy" value={summary.data?.totalMachines?.toString() ?? '—'} />
        <DoloresStatCard label="Trong kho" value={sumStatusCounts('IN_WAREHOUSE')?.toString() ?? '—'} />
        <DoloresStatCard
          label="Đang triển khai"
          value={sumStatusCounts('DEPLOYED_CONTRACT_OWNER', 'DEPLOYED_STORE_OWNER')?.toString() ?? '—'}
        />
        <DoloresStatCard
          label="Bảo trì / tân trang / kiểm định"
          value={sumStatusCounts('UNDER_MAINTENANCE', 'REFURBISHING', 'PENDING_QA')?.toString() ?? '—'}
        />
      </div>

      {summary.isError && (
        <DoloresApiErrorState error={summary.error} onRetry={() => { void summary.refetch(); }} />
      )}

      <div className="flex w-fit max-w-full flex-wrap gap-1 rounded-[10px] border border-[#E9E2DC] bg-white p-1">
        <button
          aria-pressed={statusFilter === 'ALL'}
          className={`rounded-[7px] px-3 py-2 text-sm ${statusFilter === 'ALL' ? 'bg-[#F9E9EA] font-medium text-[#B81724]' : 'text-[#706561] hover:bg-[#F7F5F3]'}`}
          onClick={() => setStatusFilter('ALL')}
          type="button"
        >
          Tất cả
        </button>
        {MACHINE_STATUSES.map((status) => (
          <button
            aria-pressed={statusFilter === status}
            className={`rounded-[7px] px-3 py-2 text-sm ${statusFilter === status ? 'bg-[#F9E9EA] font-medium text-[#B81724]' : 'text-[#706561] hover:bg-[#F7F5F3]'}`}
            key={status}
            onClick={() => setStatusFilter(status)}
            type="button"
          >
            {STATUS_LABELS[status]}
          </button>
        ))}
      </div>

      <DoloresPanel>
        <DoloresPanelTitle>Danh sách máy</DoloresPanelTitle>
        <p className="-mt-2 mb-4 text-sm leading-[1.45] text-[#706561]">
          Chi tiết, lịch bảo trì và telemetry được tải theo từng UUID khi mở hồ sơ.
        </p>
        {inventory.isPending ? (
          <DoloresLoadingState />
        ) : inventory.isError ? (
          <DoloresApiErrorState error={inventory.error} onRetry={() => { void inventory.refetch(); }} />
        ) : (inventory.data ?? []).length === 0 ? (
          <DoloresEmptyState message="Backend chưa trả về máy nào trong phạm vi tài khoản này." />
        ) : filteredMachines.length === 0 ? (
          <DoloresEmptyState message="Không có máy ở trạng thái đã chọn." />
        ) : (
          <DoloresTable
            headers={['ID máy (UUID)', 'Serial', 'Trạng thái', 'Tenant ID', 'Khu vực', 'Chủ sở hữu', 'Thời hạn hợp đồng', 'Triển khai']}
            rows={filteredMachines.map((machine) => [
              <Link className="break-all font-mono text-xs font-semibold text-[#B81724] hover:underline" href={PATH_ADMIN.machineDetail(machine.id)} key={machine.id}>
                {machine.id}
              </Link>,
              machine.serialNumber ?? '—',
              statusLabel(machine.status),
              <span className="break-all font-mono text-xs" key={`${machine.id}-tenant`}>{machine.tenantId ?? '—'}</span>,
              machine.region ?? '—',
              machine.ownerType ?? '—',
              formatContractPeriod(machine.contractStartDate, machine.contractEndDate),
              formatDate(machine.deployedAt),
            ])}
          />
        )}
      </DoloresPanel>
    </DoloresPage>
  );
}
