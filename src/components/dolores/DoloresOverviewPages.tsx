import { DoloresPage } from "@/components/dolores/DoloresShell";
import { DoloresButton, DoloresMetric, DoloresPanel, DoloresPanelTitle } from "@/components/dolores/DoloresUI";

const adminMonths = [
  ["132", "h-[109.056px]"],
  ["145", "h-[119.796px]"],
  ["158", "h-[130.536px]"],
  ["162", "h-[133.841px]"],
  ["175", "h-[144.582px]"],
  ["186.4", "h-[154px]"],
] as const;

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
    <div className="flex h-[220px] items-end gap-4">
      <div className="flex h-[220px] w-[55px] shrink-0 flex-col justify-between text-xs leading-[1.45] text-[#706561]">
        <span>{maxLabel}</span>
        <span>{middleLabel}</span>
        <span>0</span>
      </div>
      <div className="flex h-[220px] min-w-0 flex-1 items-end justify-between gap-4">
        {data.map(([value, height], index) => (
          <div className="flex h-full min-w-0 flex-1 flex-col items-start justify-end gap-1.5" key={labels[index]}>
            <span className="text-sm font-semibold leading-[1.45] text-[#302927]">{value}</span>
            <div className={"w-full rounded-[5px] bg-[#F4EAE3] " + height} />
            <span className="w-full text-xs leading-[1.45] text-[#706561]">{labels[index]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminOverviewPage() {
  return (
    <DoloresPage
      title="Tổng quan vận hành"
      description="Theo dõi hồ sơ và xử lý công việc trong phạm vi được giao."
      actions={
        <>
          <DoloresButton href="/admin/reports">Báo cáo doanh thu</DoloresButton>
          <DoloresButton href="/admin/iot" variant="secondary">Giám sát theo khách hàng</DoloresButton>
          <DoloresButton href="/admin/machines" variant="secondary">Xem kho máy</DoloresButton>
        </>
      }
    >
      <div className="grid grid-cols-4 gap-4">
        <DoloresMetric label="Doanh thu gộp · đã thu" value="196.400.000 đ" />
        <DoloresMetric label="Doanh thu thực tế · loại cọc" value="186.400.000 đ" />
        <DoloresMetric label="Tiền cọc thu trong kỳ" value="10.000.000 đ" />
        <DoloresMetric label="Smart đang kết nối" value="54 / 56 máy" />
      </div>
      <DoloresPanel>
        <DoloresPanelTitle>Doanh thu thực tế theo tháng</DoloresPanelTitle>
        <p className="-mt-2 mb-3 text-sm leading-[1.45] text-[#706561]">04–09/2026 · Triệu đồng · Không bao gồm tiền cọc</p>
        <MonthlyBars data={adminMonths} labels={["T4", "T5", "T6", "T7", "T8", "T9"]} maxLabel="186.4" middleLabel="93" />
        <p className="mt-3 text-[13px] leading-[1.45] text-[#706561]">Dữ liệu minh họa · 86 khách hàng · 98 máy đang thuê · 48.600 ly Smart trong tháng 09</p>
      </DoloresPanel>
      <DoloresPanel>
        <DoloresPanelTitle>Thông tin chi tiết</DoloresPanelTitle>
        <div className="grid grid-cols-2 gap-x-4 gap-y-5">
          <div><p className="text-[13px] text-[#706561]">Tổng máy đang thuê</p><p className="mt-1 text-sm font-semibold">98 máy · 56 Smart IoT + 42 máy thường</p></div>
          <div><p className="text-[13px] text-[#706561]">Máy Smart có kết nối</p><p className="mt-1 text-sm font-semibold">54 máy · 2 máy mất kết nối</p></div>
          <div><p className="text-[13px] text-[#706561]">Máy Smart sẵn sàng trong kho</p><p className="mt-1 text-sm font-semibold">11 máy</p></div>
          <div><p className="text-[13px] text-[#706561]">Tổng ly đã bán thành công</p><p className="mt-1 text-sm font-semibold">48.600 ly · chỉ các máy Smart có dữ liệu</p></div>
        </div>
      </DoloresPanel>
    </DoloresPage>
  );
}

export function CustomerOverviewPage() {
  return (
    <DoloresPage
      title="Tổng quan của cửa hàng"
      description="Theo dõi máy, hợp đồng, hóa đơn và các thông báo cần xử lý."
      actions={
        <>
          <DoloresButton href="/dashboard/machines">Xem máy của tôi</DoloresButton>
          <DoloresButton href="/dashboard/invoices" variant="secondary">Xem hóa đơn</DoloresButton>
        </>
      }
    >
      <div className="grid grid-cols-4 gap-4">
        <DoloresMetric label="Hợp đồng đang thuê" value="2" />
        <DoloresMetric label="Máy đang sử dụng" value="2" />
        <DoloresMetric label="Hóa đơn tháng 09" value="4.250.000 đ" />
        <DoloresMetric label="Ly Smart hợp lệ" value="2.000 ly" />
      </div>
      <DoloresPanel>
        <DoloresPanelTitle>Số ly đã bán thành công</DoloresPanelTitle>
        <p className="-mt-2 mb-3 text-sm leading-[1.45] text-[#706561]">Tháng 04–09/2026 · Đơn vị: ly</p>
        <MonthlyBars data={customerMonths} labels={["T4", "T5", "T6", "T7", "T8", "T9"]} maxLabel="2000" middleLabel="1000" />
        <p className="mt-3 text-[13px] leading-[1.45] text-[#706561]">Số ly hợp lệ đã nhận · máy Smart chính và máy thay thế theo thời gian thuê</p>
      </DoloresPanel>
      <DoloresPanel>
        <DoloresPanelTitle>Cần theo dõi</DoloresPanelTitle>
        <p className="text-sm font-semibold">Hóa đơn tháng 9</p>
        <p className="mt-1 text-sm text-[#706561]">Hạn thanh toán còn 4 ngày · Còn phải trả 2.750.000 đ</p>
        <div className="mt-4 flex gap-4">
          <a className="text-sm font-medium text-[#B81724] underline" href="/dashboard/invoices">Xem hóa đơn</a>
          <a className="text-sm font-medium text-[#B81724] underline" href="/dashboard/machines">Xem máy</a>
        </div>
      </DoloresPanel>
    </DoloresPage>
  );
}
