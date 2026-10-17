"use client";

import { useEffect, useState } from "react";
import { DoloresButton, DoloresMetric, DoloresPanel, DoloresPanelTitle, DoloresStatCard, DoloresTable } from "@/components/dolores/DoloresUI";
import { useRouteView } from "@/components/dolores/useRouteView";
import { DoloresPage } from "@/components/dolores/DoloresShell";
import { adminMonths, MonthlyBars } from "@/components/dolores/DoloresOverviewPages";
import { DoloresDialog } from "@/components/dolores/DoloresDialog";
import styles from "./DoloresShell.module.css";

type ReportView = "overview" | "customers";

export default function AdminReportScreens({ initialView = "overview" }: { initialView?: ReportView }) {
  const [view, setView] = useRouteView<ReportView>(initialView);
  const [filterOpen, setFilterOpen] = useState(false);
  useEffect(() => { setFilterOpen(false); }, [initialView]);

  if (filterOpen) {
    return (
      <DoloresDialog labelledBy="report-filter-title" onClose={() => setFilterOpen(false)}>
        <section className="w-full max-w-[580px] rounded-[20px] bg-white p-8 shadow-xl">
          <p className="text-[11px] font-medium leading-4 text-[#706561]">Xác nhận thông tin</p>
          <h1 id="report-filter-title" className="mt-3 text-xl font-semibold leading-7 text-[#302927]">Chọn kỳ báo cáo</h1>
          <p className="mt-3 text-[13px] leading-5 text-[#302927]">Chọn kỳ dữ liệu muốn xem.</p>
          <div data-dialog-actions>
            <DoloresButton onClick={() => setFilterOpen(false)}>Tháng 09/2026</DoloresButton>
            <DoloresButton variant="secondary" onClick={() => { setFilterOpen(false); setView("customers"); }}>Chi tiết theo khách hàng</DoloresButton>
            <DoloresButton variant="secondary" onClick={() => setFilterOpen(false)}>Đóng</DoloresButton>
          </div>
        </section>
      </DoloresDialog>
    );
  }

  if (view === "customers") {
    return (
      <DoloresPage title="Chi tiết báo cáo theo khách hàng" description="Theo dõi hồ sơ và xử lý công việc trong phạm vi được giao." actions={<DoloresButton onClick={() => setView("overview")}>Quay lại báo cáo</DoloresButton>} showMobileActionsMenu={false}>
        <div className="dl-metrics-grid grid grid-cols-4 gap-4">
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
      <div className="dl-metrics grid grid-cols-4 gap-4">
        <DoloresMetric label="Doanh thu gộp · đã thu" value="196.400.000 đ" mobileSize="compact" />
        <DoloresMetric label="Doanh thu thực tế · loại cọc" value="186.400.000 đ" mobileSize="compact" />
        <DoloresMetric label="Tiền cọc thu trong kỳ" value="10.000.000 đ" mobileSize="compact" />
        <DoloresMetric label="Smart đang kết nối" value="54 / 56 máy" />
      </div>
      <DoloresPanel className="dl-admin-chart">
        <DoloresPanelTitle>Doanh thu thực tế — không gồm cọc</DoloresPanelTitle>
        <p className="text-sm leading-[1.45] text-[#706561]">Tháng 04–09/2026 · Triệu đồng</p>
        <MonthlyBars data={adminMonths} labels={["T4", "T5", "T6", "T7", "T8", "T9"]} maxLabel="186.4" middleLabel="93" />

      </DoloresPanel>
      <DoloresPanel>
        <DoloresPanelTitle>Thông tin chi tiết</DoloresPanelTitle>
        <div className={styles.overviewDetails}>
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
