import { DoloresButton, DoloresPanel, DoloresPanelTitle, DoloresTable } from "@/components/dolores/DoloresUI";
import { DoloresPage } from "@/components/dolores/DoloresShell";

export default function AdminNotificationScreens() {
  return (
    <DoloresPage title="Thông tin vận hành cần chú ý" description="Theo dõi hồ sơ và xử lý công việc trong phạm vi được giao." actions={<DoloresButton href="/admin/reports">Xem báo cáo</DoloresButton>}>
      <DoloresPanel>
        <DoloresPanelTitle>Danh sách</DoloresPanelTitle>
        <DoloresTable headers={["Nội dung", "Số lượng", "Thao tác"]} rows={[
          [<a className="font-semibold hover:text-[#B81724]" href="/admin/reports?view=customers" key="expiring">Hợp đồng còn một tháng ›</a>, "7", <a className="hover:text-[#B81724]" href="/admin/reports?view=customers" key="list">Xem danh sách</a>],
          [<a className="font-semibold hover:text-[#B81724]" href="/admin/reports?view=customers" key="expired">Hợp đồng đã hết hạn ›</a>, "19", <a className="hover:text-[#B81724]" href="/admin/reports?view=customers" key="report">Xem báo cáo</a>],
        ]} />
      </DoloresPanel>
    </DoloresPage>
  );
}
