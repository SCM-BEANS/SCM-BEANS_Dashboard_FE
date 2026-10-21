'use client';

import { useState } from 'react';
import { DoloresApiErrorState, DoloresEmptyState, DoloresLoadingState } from '@/app/_ui/dolores/DoloresApiState';
import {
  DoloresButton,
  DoloresNotice,
  DoloresPanel,
  DoloresPanelTitle,
  DoloresTable,
} from '@/app/_ui/dolores/DoloresUI';
import { DoloresPage } from '@/app/_shell/dolores/DoloresShell';
import { PATH_ADMIN } from '@/routes/path';
import { useAlerts } from '@/hooks/dolores/useAlerts';
import { describeDoloresError } from '@/hooks/dolores/queryPolicy';
import { useMarkNotificationRead, useNotifications } from '@/hooks/dolores/useNotifications';

function formatNotificationDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value.replace('T', ' ')
    : date.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

function formatAlertTimestamp(value: string): string {
  return value.replace('T', ' ');
}

export default function AdminNotificationScreens() {
  const notifications = useNotifications();
  const alerts = useAlerts();
  const markAsRead = useMarkNotificationRead();
  const [readFeedback, setReadFeedback] = useState<string | null>(null);
  const unreadCount = notifications.data?.filter((notification) => !notification.read).length;
  const activeAlerts = alerts.data?.filter((alert) => !alert.acknowledged) ?? [];

  function markNotificationAsRead(id: string) {
    setReadFeedback(null);
    markAsRead.mutate(id, {
      onSuccess: () => setReadFeedback('Đã đánh dấu thông báo là đã đọc.'),
    });
  }

  function retryMarkAsRead() {
    const id = markAsRead.variables;
    if (id) markNotificationAsRead(id);
  }

  function refreshAll() {
    void notifications.refetch();
    void alerts.refetch();
  }

  return (
    <DoloresPage
      title="Thông tin vận hành cần chú ý"
      description="Theo dõi thông báo và cảnh báo vận hành trong phạm vi API cho phép."
      actions={
        <div className="flex flex-wrap gap-3">
          <DoloresButton href={PATH_ADMIN.reports}>Xem báo cáo</DoloresButton>
          <DoloresButton
            variant="secondary"
            onClick={refreshAll}
            disabled={notifications.isFetching || alerts.isFetching}
          >
            Tải lại
          </DoloresButton>
        </div>
      }
    >
      <div className="space-y-6">
        <DoloresPanel>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <DoloresPanelTitle>Thông báo</DoloresPanelTitle>
            {unreadCount !== undefined && (
              <p className="text-sm text-[#706561]">{unreadCount} chưa đọc</p>
            )}
          </div>

          {notifications.isPending && !notifications.data && <DoloresLoadingState />}
          {notifications.isError && (
            <DoloresApiErrorState error={notifications.error} onRetry={() => void notifications.refetch()} />
          )}
          {markAsRead.isError && (
            <DoloresNotice title="Không thể đánh dấu đã đọc" tone="warning">
              <p>{describeDoloresError(markAsRead.error)} Trạng thái chưa được xác nhận là đã thay đổi.</p>
              <div className="mt-3">
                <DoloresButton variant="secondary" onClick={retryMarkAsRead} disabled={markAsRead.isPending}>
                  Thử lại thao tác
                </DoloresButton>
              </div>
            </DoloresNotice>
          )}
          {readFeedback && <DoloresNotice title="Đã cập nhật" tone="success">{readFeedback}</DoloresNotice>}
          {notifications.data?.length === 0 && (
            <DoloresEmptyState message="Backend chưa trả về thông báo nào trong phạm vi tài khoản này." />
          )}
          {notifications.data && notifications.data.length > 0 && (
            <DoloresTable
              headers={["Nội dung", "Loại", "Phạm vi", "Trạng thái", "Thời gian", "Thao tác"]}
              rows={notifications.data.map((notification) => [
                <div className="max-w-xl" key={notification.id}>
                  <p className="font-semibold">{notification.title}</p>
                  <p className="mt-1 whitespace-pre-wrap text-[#706561]">{notification.message}</p>
                </div>,
                notification.type,
                notification.tenantId ? 'Tenant ' + notification.tenantId.slice(0, 8) : 'Toàn nền tảng',
                notification.read ? 'Đã đọc' : 'Chưa đọc',
                notification.createdAt ? formatNotificationDate(notification.createdAt) : '—',
                notification.read ? (
                  <span className="text-[#706561]">—</span>
                ) : (
                  <DoloresButton
                    variant="secondary"
                    onClick={() => markNotificationAsRead(notification.id)}
                    disabled={markAsRead.isPending}
                  >
                    {markAsRead.isPending && markAsRead.variables === notification.id ? 'Đang cập nhật…' : 'Đánh dấu đã đọc'}
                  </DoloresButton>
                ),
              ])}
            />
          )}
        </DoloresPanel>

        <DoloresPanel>
          <DoloresPanelTitle>Cảnh báo chưa xác nhận</DoloresPanelTitle>
          {alerts.isPending && !alerts.data && <DoloresLoadingState />}
          {alerts.isError && <DoloresApiErrorState error={alerts.error} onRetry={() => void alerts.refetch()} />}
          {alerts.data && activeAlerts.length === 0 && (
            <DoloresEmptyState message="Không có cảnh báo nào đang chờ xác nhận." />
          )}
          {activeAlerts.length > 0 && (
            <DoloresTable
              headers={["Mức độ", "Máy", "Nội dung", "Thời gian", "Trạng thái"]}
              rows={activeAlerts.map((alert) => [
                alert.level,
                alert.machineId ? alert.machineId.slice(0, 8) : '—',
                alert.message,
                formatAlertTimestamp(alert.ts),
                'Chưa xác nhận',
              ])}
            />
          )}
        </DoloresPanel>
      </div>
    </DoloresPage>
  );
}
