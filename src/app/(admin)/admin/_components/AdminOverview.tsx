"use client";

import { DashboardOverview } from "@/app/_features/dashboard/DashboardOverview";
import { DoloresEmptyState, DoloresLoadingState } from "@/app/_ui/dolores/DoloresApiState";
import { DoloresButton, DoloresPanel, DoloresPanelTitle, DoloresTable } from "@/app/_ui/dolores/DoloresUI";
import { useDashboardOverview } from "@/hooks/dolores/useDashboardOverview";
import { PATH_ADMIN } from "@/routes/path";

export function AdminOverview() {
  const overview = useDashboardOverview();
  const metrics = overview.data?.operationalMetrics;
  const vnd = overview.data?.financialMetrics?.find((item) => item.currency?.toUpperCase() === "VND");
  const count = (value: number | null | undefined) => value == null ? "—" : new Intl.NumberFormat("vi-VN").format(value);
  const money = (value: number | null | undefined) => value == null ? "—" : new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
  const days = metrics?.dailyAcceptedCupUsage ?? [];

  return (
    <DashboardOverview
      title="Tổng quan vận hành"
      description="Theo dõi hồ sơ và xử lý công việc trong phạm vi được giao."
      actions={
        <>
          <DoloresButton href={PATH_ADMIN.reports}>Báo cáo doanh thu</DoloresButton>
          <DoloresButton href={PATH_ADMIN.iot} variant="secondary">Giám sát theo khách hàng</DoloresButton>
          <DoloresButton href={PATH_ADMIN.machines} variant="secondary">Xem kho máy</DoloresButton>
        </>
      }
      metrics={overview.data ? [
        { label: "Khách hàng", value: count(metrics?.totalTenants) },
        { label: "Ly hợp lệ trong kỳ", value: count(metrics?.cupsInSelectedPeriod) },
        { label: "Phiếu bảo trì mở", value: count(metrics?.openMaintenanceTickets) },
        { label: "Lệnh lắp đặt mở", value: count(metrics?.openInstallationWorkOrders) },
      ] : undefined}
      beforeMetrics={
        <>
          {overview.isPending && <DoloresLoadingState />}
          {overview.isError && !overview.data && <DoloresEmptyState message="Dữ liệu tổng quan hiện chưa có để hiển thị." />}
          {overview.data && !metrics && <DoloresEmptyState message="API chưa trả về số liệu vận hành cho phạm vi tài khoản này." />}
        </>
      }
    >
      {overview.data && <>
        <DoloresPanel className="dl-admin-chart">
          <DoloresPanelTitle>Ly hợp lệ theo ngày</DoloresPanelTitle>
          <p className="-mt-2 mb-3 text-sm leading-[1.45] text-[#706561]">{overview.data.usagePeriodStart ?? "—"} đến {overview.data.usagePeriodEnd ?? "—"} · cập nhật {overview.data.asOfDate ?? "—"}</p>
          {days.length ? <DoloresTable headers={["Ngày", "Số ly hợp lệ"]} rows={days.map((day) => [day.date ?? "—", count(day.cups)])} /> : <DoloresEmptyState message="Không có số ly theo ngày trong khoảng được trả về." />}
        </DoloresPanel>
        <DoloresPanel>
          <DoloresPanelTitle>Tài chính · VND</DoloresPanelTitle>
          {!vnd && <p className="text-sm text-[#706561]">API chưa cung cấp số liệu tài chính VND cho phạm vi tài khoản này.</p>}
          {vnd &&
            <div className="grid grid-cols-2 gap-x-4 gap-y-5">
              <div><p className="text-[13px] text-[#706561]">Đã phát hành</p><p className="mt-1 text-sm font-semibold">{money(vnd.amountIssued)}</p></div>
              <div><p className="text-[13px] text-[#706561]">Đã thu</p><p className="mt-1 text-sm font-semibold">{money(vnd.amountCollected)}</p></div>
              <div><p className="text-[13px] text-[#706561]">Còn phải thu</p><p className="mt-1 text-sm font-semibold">{money(vnd.outstandingBalance)}</p></div>
              <div><p className="text-[13px] text-[#706561]">Quá hạn</p><p className="mt-1 text-sm font-semibold">{money(vnd.overdueBalance)}</p></div>
            </div>
          }
        </DoloresPanel>
      </>}
    </DashboardOverview>
  );
}
