"use client";

import { DoloresPage } from "./DoloresShell";
import { DoloresButton, DoloresDetails, DoloresMetric, DoloresPanel, DoloresPanelTitle } from "./DoloresUI";
import { MonthlyBars } from "./DoloresOverviewPages";
import styles from "./DoloresShell.module.css";
import { useDemoRecord } from "./demoFlowStore";

const MACHINE_PATH = "/dashboard/machines/S-018";
const dailyCups = [["62", "h-[113.667px]"], ["75", "h-[137.5px]"], ["70", "h-[128.333px]"], ["84", "h-[154px]"], ["68", "h-[124.667px]"], ["72", "h-[132px]"], ["80", "h-[146.667px]"]] as const;

export function CustomerSmartMachinePage({ view, offline }: { view?: string; offline: boolean }) {
  const { record: espresso } = useDemoRecord("customer:S-018:espresso");
  const { record: milk } = useDemoRecord("customer:S-018:fresh-milk");
  const acknowledgedVersion = Math.max(0, ...([[espresso, "espresso", "water"], [milk, "fresh-milk", "milk"]] as const).map(([record, dish, quantity]) => {
    if (!record || record.payload.machine !== "S-018" || record.payload.dish !== dish || (record.status !== "pending" && record.status !== "applied")) return 0;
    const version = Number(record.payload.acknowledgedVersion);
    return Number.isSafeInteger(version) && version > 0 && [record.payload.coffee, record.payload[quantity]].every(value => Number.isFinite(Number(value)) && Number(value) > 0) ? version : 0;
  }));
  const applied = acknowledgedVersion > 0;
  if (offline) return <DoloresPage title="Máy mất kết nối · dữ liệu gần nhất" description="Theo dõi thông tin và thực hiện yêu cầu của cửa hàng." actions={<>
    <DoloresButton href="/dashboard/support/new" className="w-[164.6px]">Báo sự cố kết nối</DoloresButton>
    <DoloresButton href={`${MACHINE_PATH}?view=monitoring`} variant="secondary" className="w-[180.2px]">Xem dữ liệu đã nhận</DoloresButton>
  </>}>
    <DoloresPanel><DoloresPanelTitle>Thông tin chi tiết</DoloresPanelTitle><DoloresDetails fields={[
      ["Máy", "S-018 · Smart IoT"], ["Lần cập nhật cuối", "28/09/2026 · 10:00"], ["Tình trạng dữ liệu", "Chưa nhận số ly mới"], ["Số ly & vị trí hiển thị", "Là dữ liệu đã nhận gần nhất"], ["Khi mạng trở lại", "Máy tự gửi dữ liệu đã lưu"],
    ]} /></DoloresPanel>

  </DoloresPage>;

  if (view === "monitoring") return <DoloresPage title={applied ? "Giám sát Smart IoT · công thức riêng" : "Giám sát máy Smart IoT"} mobileTitle="Giám sát máy Smart IoT" description="Theo dõi thông tin và thực hiện yêu cầu của cửa hàng." actions={<>
    <DoloresButton href={`${MACHINE_PATH}/model`} className="w-[149px]">Xem mô hình máy</DoloresButton>
    <DoloresButton href="/dashboard/machines/substitute" variant="secondary" className="w-[156.8px]">Xem máy thay thế</DoloresButton>
    <DoloresButton href={`${MACHINE_PATH}?state=offline`} variant="secondary" className="w-[219.2px]">Mất kết nối / dữ liệu cũ</DoloresButton>
    <DoloresButton href={applied ? "/dashboard/menu" : MACHINE_PATH} variant="secondary" className="w-[149px]">{applied ? "Xem công thức riêng đã áp dụng" : "Về chi tiết máy"}</DoloresButton>
  </>}>
    <div className="dl-metrics grid grid-cols-4 gap-4"><DoloresMetric label="Máy chính S-018" value="1.840 ly" /><DoloresMetric label="Máy thay S-022" value="160 ly" /><DoloresMetric label="Tổng ly C-204" value="2.000 ly" /><DoloresMetric label="Phí theo ly" value="2.000.000 đ" /></div>
    <DoloresPanel className="dl-customer-chart"><DoloresPanelTitle>Số ly hợp lệ theo ngày</DoloresPanelTitle><p className="text-sm text-[#706561]">24–30/09/2026 · Đơn vị: ly đã bán thành công</p><MonthlyBars data={dailyCups} labels={["24/9", "25/9", "26/9", "27/9", "28/9", "29/9", "30/9"]} maxLabel="84" middleLabel="42" insetAxis /></DoloresPanel>
    <DoloresPanel><DoloresPanelTitle>Thông tin chi tiết</DoloresPanelTitle><DoloresDetails fields={[["Vị trí hợp đồng", "Cà phê Mộc · Quận 3"], ["Vị trí GPS gần nhất", "Quận 3 · 01/10/2026 09:42"], [<span key="menu-label"><span className={styles.desktopOnlyContent}>Menu hiện tại</span><span className={styles.mobileOnlyContent}>Menu của tôi</span></span>, applied ? `Công thức riêng · v${acknowledgedVersion}` : "Global Menu mùa hè · v3"], ["Giới hạn mất kết nối", "Theo hợp đồng C-204: 5 ngày"]]} /></DoloresPanel>
  </DoloresPage>;

  return <DoloresPage title="Chi tiết máy Smart IoT" description="S-018 · Hợp đồng C-204 · Dữ liệu máy đồng bộ và lịch sử sử dụng." actions={<>
    <DoloresButton href={`${MACHINE_PATH}?view=monitoring`} className="w-[188px]">Xem dữ liệu vận hành</DoloresButton>
    <DoloresButton href={`${MACHINE_PATH}/model`} variant="secondary" className="w-[149px]">Xem mô hình máy</DoloresButton>
    <DoloresButton href="/dashboard/support/new" variant="secondary" className="w-[124px]">Báo sự cố</DoloresButton>
    <DoloresButton href="/dashboard/machines/substitute" variant="secondary" className="w-[124px]">Máy thay thế</DoloresButton>
  </>}>
    <div className="dl-metrics grid grid-cols-4 gap-4"><DoloresMetric label="Ly hợp lệ kỳ này" value="2.000 ly" /><DoloresMetric label="Phí cơ bản" value="750.000 đ" /><DoloresMetric label="Phí theo ly" value="2.000.000 đ" /><DoloresMetric label="Lần cập nhật cuối" value="09:42" /></div>
    <DoloresPanel><DoloresPanelTitle>Thông tin & theo dõi</DoloresPanelTitle><DoloresDetails fields={[["Hợp đồng", "C-204 · 01/04–31/10/2026"], ["Vị trí hợp đồng", "Cửa hàng Quận 3"], ["Vị trí đang giám sát", "GPS · Cập nhật lúc 09:42"], ["Ngưỡng mất kết nối", "Theo điều khoản C-204"], ["Máy thay thế", "S-022 · Smart IoT · 160 ly cùng hợp đồng"], ["Cập nhật ly mất kết nối", "Máy lưu dữ liệu; tự đồng bộ khi có mạng"]]} /></DoloresPanel>
    <DoloresPanel><DoloresPanelTitle>Lịch sử máy</DoloresPanelTitle><div className={styles.overviewTimeline}><div><h3>Đồng bộ dữ liệu</h3><p>Hôm nay 09:42 · 160 ly mới được nhận từ hệ thống.</p></div><div><h3>Thay linh kiện</h3><p>12/08/2026 · Lịch sử và chi phí theo hồ sơ.</p></div><div><h3>Bảo trì</h3><p>10/07/2026 · Ghi nhận trên hợp đồng.</p></div></div></DoloresPanel>

  </DoloresPage>;
}
