'use client';

import Link from 'next/link';
import {
  DoloresApiErrorState,
  DoloresEmptyState,
  DoloresLoadingState,
} from '@/app/_ui/dolores/DoloresApiState';
import { DoloresButton, DoloresPanel, DoloresPanelTitle, DoloresStatCard, DoloresTable } from '@/app/_ui/dolores/DoloresUI';
import { DoloresPage } from '@/app/_shell/dolores/DoloresShell';
import { useMachineInventory } from '@/hooks/dolores/useMachines';
import { PATH_ADMIN } from '@/routes/path';

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(parsed);
}

export default function AdminIoTScreens() {
  const inventory = useMachineInventory();
  const machines = inventory.data ?? [];

  return (
    <DoloresPage
      title="Chọn máy để giám sát IoT"
      description="Mở hồ sơ theo UUID để xác nhận loại máy và xem heartbeat nếu đó là Smart IoT."
      actions={
        <>
          <DoloresButton href={PATH_ADMIN.machines} variant="secondary">Danh sách máy</DoloresButton>
          <DoloresButton onClick={() => { void inventory.refetch(); }}>Làm mới</DoloresButton>
        </>
      }
    >
      <DoloresStatCard label="Tổng máy trong danh sách Dolores" value={inventory.data ? machines.length.toString() : '—'} />
      <DoloresPanel>
        <DoloresPanelTitle>Chọn hồ sơ máy</DoloresPanelTitle>
        <p className="-mt-2 mb-4 text-sm leading-[1.45] text-[#706561]">
          Danh sách API không bao gồm machineType. Mở hồ sơ để xác nhận loại máy; heartbeat chỉ được yêu cầu khi loại máy là SMART_IOT.
        </p>
        {inventory.isPending ? (
          <DoloresLoadingState />
        ) : inventory.isError ? (
          <DoloresApiErrorState error={inventory.error} onRetry={() => { void inventory.refetch(); }} />
        ) : machines.length === 0 ? (
          <DoloresEmptyState message="Backend chưa trả về máy nào trong phạm vi tài khoản này." />
        ) : (
          <DoloresTable
            headers={['ID máy (UUID)', 'Serial', 'Trạng thái', 'Khu vực', 'Triển khai', 'Hồ sơ']}
            rows={machines.map((machine) => [
              <span className="break-all font-mono text-xs" key={`${machine.id}-uuid`}>{machine.id}</span>,
              machine.serialNumber ?? '—',
              machine.status ?? '—',
              machine.region ?? '—',
              formatDate(machine.deployedAt),
              <Link className="font-semibold text-[#B81724] hover:underline" href={PATH_ADMIN.machineDetail(machine.id)} key={`${machine.id}-detail`}>
                Mở hồ sơ
              </Link>,
            ])}
          />
        )}
      </DoloresPanel>
    </DoloresPage>
  );
}
