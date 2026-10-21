"use client";

import type { CSSProperties } from "react";
import { DashboardOverview } from "@/app/_features/dashboard/DashboardOverview";
import { DoloresButton, DoloresPanel, DoloresPanelTitle } from "@/app/_ui/dolores/DoloresUI";
import { PATH_DASHBOARD } from "@/routes/path";

const customerMonths = [
  ["1600", "h-[123.2px]"],
  ["1820", "h-[140.14px]"],
  ["1750", "h-[134.75px]"],
  ["1900", "h-[146.3px]"],
  ["1880", "h-[144.76px]"],
  ["2000", "h-[154px]"],
] as const;

function MonthlyBars({
  data,
  labels,
  maxLabel,
  middleLabel,
}: {
  data: readonly (readonly [string, string])[];
  labels: string[];
  maxLabel: string;
  middleLabel: string;
}) {
  return (
    <div className="dl-monthly-bars flex h-[220px] items-end gap-4">
      <div className="flex h-[220px] w-[55px] shrink-0 flex-col justify-between text-xs leading-[1.45] text-[#706561]">
        <span>{maxLabel}</span>
        <span>{middleLabel}</span>
        <span>0</span>
      </div>
      <div className="flex h-[220px] min-w-0 flex-1 items-end justify-between gap-4">
        {data.map(([value, height], index) => (
          <div className="flex h-full min-w-0 flex-1 flex-col items-start justify-end gap-1.5" key={labels[index]}>
            <span className="text-sm font-semibold leading-[1.45] text-[#302927]">{value}</span>
            <div className={"dl-month-bar w-full rounded-[5px] bg-[#F4EAE3] " + height} style={{ "--mobile-chart-height": `${Number.parseFloat(height.match(/[\d.]+/)?.[0] ?? "0") * 0.779}px` } as CSSProperties} />
            <span className="w-full text-xs leading-[1.45] text-[#706561]">{labels[index]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CustomerOverview() {
  return (
    <DashboardOverview
      title="Tổng quan của cửa hàng"
      description="Theo dõi máy, hợp đồng, hóa đơn và các thông báo cần xử lý."
      actions={
        <>
          <DoloresButton href={PATH_DASHBOARD.machines}>Xem máy của tôi</DoloresButton>
          <DoloresButton href={PATH_DASHBOARD.invoices} variant="secondary">Xem hóa đơn</DoloresButton>
        </>
      }
      metrics={[
        { label: "Hợp đồng đang thuê", value: "2" },
        { label: "Máy đang sử dụng", value: "2" },
        { label: "Hóa đơn tháng 09", value: "4.250.000 đ" },
        { label: "Ly Smart hợp lệ", value: "2.000 ly" },
      ]}
    >
      <DoloresPanel className="dl-customer-chart">
        <DoloresPanelTitle>Số ly đã bán thành công</DoloresPanelTitle>
        <p className="-mt-2 mb-3 text-sm leading-[1.45] text-[#706561]">Tháng 04–09/2026 · Đơn vị: ly</p>
        <MonthlyBars data={customerMonths} labels={["T4", "T5", "T6", "T7", "T8", "T9"]} maxLabel="2000" middleLabel="1000" />
        <p className="dl-chart-note mt-3 text-[13px] leading-[1.45] text-[#706561]">Số ly hợp lệ đã nhận · máy Smart chính và máy thay thế theo thời gian thuê</p>
      </DoloresPanel>
      <DoloresPanel>
        <DoloresPanelTitle>Cần theo dõi</DoloresPanelTitle>
        <p className="text-sm font-semibold">Hóa đơn tháng 9</p>
        <p className="mt-1 text-sm text-[#706561]">Hạn thanh toán còn 4 ngày · Còn phải trả 2.750.000 đ</p>
        <div className="mt-4 flex gap-4">
          <a className="text-sm font-medium text-[#B81724] underline" href={PATH_DASHBOARD.invoices}>Xem hóa đơn</a>
          <a className="text-sm font-medium text-[#B81724] underline" href={PATH_DASHBOARD.machines}>Xem máy</a>
        </div>
      </DoloresPanel>
    </DashboardOverview>
  );
}
