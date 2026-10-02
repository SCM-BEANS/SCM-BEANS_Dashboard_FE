"use client";

import { useState } from "react";
import { DoloresButton, DoloresPanel, DoloresPanelTitle, DoloresStatCard, DoloresTable } from "@/components/dolores/DoloresUI";
import { DoloresPage } from "@/components/dolores/DoloresShell";

type ReportView = "overview" | "customers";

const MONTHS = [
  { label: "T4", value: "132" },
  { label: "T5", value: "145" },
  { label: "T6", value: "158" },
  { label: "T7", value: "162" },
  { label: "T8", value: "175" },
  { label: "T9", value: "186.4" },
];

export default function AdminReportScreens({ initialView = "overview" }: { initialView?: ReportView }) {
  const [view, setView] = useState<ReportView>(initialView);
  const [filterOpen, setFilterOpen] = useState(false);

  if (filterOpen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#302927]/25 px-6" role="dialog" aria-modal="true" aria-labelledby="report-filter-title">
        <section className="w-full max-w-[580px] rounded-[20px] bg-white p-8 shadow-xl">
          <p className="text-[11px] font-medium leading-4 text-[#706561]">Kiểm tra trước khi tiếp tục</p>
          <h1 id="report-filter-title" className="mt-3 text-xl font-semibold leading-7 text-[#302927]">Chọn kỳ báo cáo</h1>
          <p className="mt-3 text-[13px] leading-5 text-[#302927]">Chọn kỳ dữ liệu muốn xem.</p>
          <div className="mt-5 grid gap-5">
            <button className="flex h-12 w-full items-center justify-center rounded-[10px] bg-[#B81724] px-4 py-3 text-sm font-medium text-white" onClick={() => setFilterOpen(false)}>Tháng 09/2026</button>
            <button className="flex h-12 w-full items-center justify-center rounded-[10px] border border-[#E9E2DC] px-4 py-3 text-sm font-medium text-[#302927] hover:bg-[#F7F5F3]" onClick={() => { setFilterOpen(false); setView("customers"); }}>Chi tiết theo khách hàng</button>
            <button className="flex h-12 w-full items-center justify-center rounded-[10px] border border-[#E9E2DC] px-4 py-3 text-sm font-medium text-[#302927] hover:bg-[#F7F5F3]" onClick={() => setFilterOpen(false)}>Đóng</button>
          </div>
        </section>
      </div>
    );
  }

  if (view === "customers") {
    return (
      <DoloresPage title="Chi tiết báo cáo theo khách hàng" description="Theo dõi hồ sơ và xử lý công việc trong phạm vi được giao." actions={<DoloresButton onClick={() => setView("overview")}>Quay lại báo cáo</DoloresButton>}>
        <div className="grid grid-cols-4 gap-4">
          <DoloresStatCard label="Kỳ xem" value="09/2026" />
          <DoloresStatCard label="Đang hiệu lực" value="98" />
          <DoloresStatCard label="Sắp hết hạn" value="7" />
          <DoloresStatCard label="Đã hết hạn" value="19" />
        </div>
        <DoloresPanel>
          <DoloresPanelTitle>Danh sách</DoloresPanelTitle>
          <DoloresTable
            headers={["Khách hàng / shop", "Hợp đồng", "Loại máy", "Hiệu lực", "Đã ghi nhận"]}
            rows={[
              [<a className="font-medium hover:text-[#B81724]" href="/admin/businesses?view=customer" key="c204">Minh Anh / Mộc ›</a>, "C-204", "Smart IoT", "Đến 31/10/2026", "2.750.000 đ"],
              [<a className="font-medium hover:text-[#B81724]" href="/admin/businesses?view=customer" key="c205">Minh Anh / Mộc ›</a>, "C-205", "Máy thường", "Đến 14/11/2026", "1.500.000 đ"],
            ]}
          />
        </DoloresPanel>
      </DoloresPage>
    );
  }

  return (
    <DoloresPage
      title="Báo cáo doanh thu & vận hành"
      description="Theo dõi hồ sơ và xử lý công việc trong phạm vi được giao."
      actions={<><DoloresButton onClick={() => setView("customers")}>Chi tiết khách hàng</DoloresButton><DoloresButton href="/admin/contracts" variant="secondary">Hợp đồng & lịch sử</DoloresButton><DoloresButton href="/admin/iot" variant="secondary">Giám sát số ly toàn hệ thống</DoloresButton><DoloresButton onClick={() => setFilterOpen(true)} variant="secondary">Lọc kỳ báo cáo</DoloresButton></>}
    >
      <div className="grid grid-cols-4 gap-1">
        <DoloresStatCard label="Doanh thu gộp · đã thu" value="196.400.000 đ" />
        <DoloresStatCard label="Doanh thu thực tế · loại cọc" value="186.400.000 đ" />
        <DoloresStatCard label="Tiền cọc thu trong kỳ" value="10.000.000 đ" />
        <DoloresStatCard label="Smart đang kết nối" value="54 / 56 máy" />
      </div>
      <DoloresPanel className="px-6 py-5">
        <DoloresPanelTitle>Doanh thu thực tế — không gồm cọc</DoloresPanelTitle>
        <p className="-mt-3 mb-3 text-xs leading-[18px] text-[#706561]">Tháng 04–09/2026 · Triệu đồng</p>
        <div className="flex h-[205px] gap-3">
          <div className="flex flex-col justify-between pb-5 text-[10px] leading-3 text-[#706561]">
            <span>186.4</span><span>93</span><span>0</span>
          </div>
          <div className="grid min-w-0 flex-1 grid-cols-6 gap-3 border-b border-[#F0ECE8]">
            {MONTHS.map((month, index) => {
              const height = [78, 86, 94, 97, 105, 111][index];
              return (
                <div className="flex min-w-0 flex-col items-center justify-end gap-1 pb-0.5" key={month.label}>
                  <span className="text-[11px] font-medium leading-4 text-[#302927]">{month.value}</span>
                  <div className="w-full rounded-t-[4px] bg-[#F5ECE7]" style={{ height: height + "px" }} />
                  <span className="-mb-4 text-[10px] leading-3 text-[#706561]">{month.label}</span>
                </div>
              );
            })}
          </div>
        </div>
        <p className="mt-7 text-[11px] leading-4 text-[#706561]">Doanh thu gộp gồm tất cả tiền đã thu; doanh thu thực tế loại tiền cọc theo cách gọi đã chốt.</p>
      </DoloresPanel>
      <DoloresPanel>
        <DoloresPanelTitle>Thông tin chi tiết</DoloresPanelTitle>
        <div className="grid grid-cols-2 gap-x-4 gap-y-5">
          <div><p className="text-[11px] text-[#706561]">Doanh thu gộp trong kỳ</p><p className="mt-1 text-sm font-semibold">196.400.000 đ</p></div>
          <div><p className="text-[11px] text-[#706561]">Trừ tiền cọc thu trong kỳ</p><p className="mt-1 text-sm font-semibold">10.000.000 đ</p></div>
          <div><p className="text-[11px] text-[#706561]">Doanh thu thực tế</p><p className="mt-1 text-sm font-semibold">186.400.000 đ</p></div>
          <div><p className="text-[11px] text-[#706561]">Hợp đồng</p><p className="mt-1 text-sm font-semibold">124 tổng · 98 hiệu lực · 19 hết hạn · 7 chưa hiệu lực</p></div>
          <div><p className="text-[11px] text-[#706561]">Còn một tháng</p><p className="mt-1 text-sm font-semibold">7 hợp đồng trong nhóm đang hiệu lực</p></div>
          <div><p className="text-[11px] text-[#706561]">Tổng ly bán thành công</p><p className="mt-1 text-sm font-semibold">48.600 ly Smart IoT / tháng 09</p></div>
        </div>
      </DoloresPanel>
    </DoloresPage>
  );
}
