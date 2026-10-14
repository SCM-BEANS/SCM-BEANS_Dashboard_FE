import { DoloresButton, DoloresMetric, DoloresPanel, DoloresPanelTitle, DoloresStatCard, DoloresTable } from "@/components/dolores/DoloresUI";
import { DoloresPage } from "@/components/dolores/DoloresShell";

type CustomerView = "list" | "customer" | "machines";

export default function AdminCustomerScreens({ initialView = "list" }: { initialView?: CustomerView }) {
  if (initialView === "machines") {
    return (
      <DoloresPage title="Máy của Nguyễn Minh Anh" description="Theo dõi hồ sơ và xử lý công việc trong phạm vi được giao." actions={<><DoloresButton href="/admin/machines?view=s018">Xem dữ liệu S-018</DoloresButton><DoloresButton href="/admin/iot" variant="secondary">Về khách hàng</DoloresButton></>}>
        <div className="grid grid-cols-4 gap-3"><DoloresStatCard label="Máy đang thuê" value="2" /><DoloresStatCard label="Smart / thường" value="1 / 1" /><DoloresStatCard label="Hợp đồng" value="2" /><DoloresStatCard label="Ly tháng 09" value="2.000 ly" /></div>
        <DoloresPanel><DoloresPanelTitle>Danh sách</DoloresPanelTitle><DoloresTable headers={["Máy", "Loại", "Hợp đồng", "Kết nối cuối / theo dõi", "Mở chi tiết"]} rows={[
          [<a className="font-semibold hover:text-[#B81724]" href="/admin/machines?view=s018" key="s018">S-018</a>, "Smart IoT", "C-204", "01/10/2026 · 09:42", "Dữ liệu vận hành"],
          [<a className="font-semibold hover:text-[#B81724]" href="/admin/machines?view=standard" key="c031">C-031</a>, "Máy thường", "C-205", "Theo hồ sơ hợp đồng", "Hồ sơ và lịch sử"],
        ]} /></DoloresPanel>
      </DoloresPage>
    );
  }

  if (initialView === "customer") {
    return (
      <DoloresPage title="Khách hàng Nguyễn Minh Anh" description="Theo dõi hồ sơ và xử lý công việc trong phạm vi được giao." actions={<><DoloresButton href="/admin/contracts">Danh sách hợp đồng</DoloresButton><DoloresButton href="/admin/iot?view=machines" variant="secondary">Xem máy của khách</DoloresButton><DoloresButton href="/admin/users?view=tenant" variant="secondary">Quản lý tài khoản</DoloresButton></>}>
        <div className="grid grid-cols-4 gap-3"><DoloresMetric label="Cửa hàng" value="1" /><DoloresMetric label="Máy đang thuê" value="2" /><DoloresMetric label="Smart IoT" value="1 máy" /><DoloresMetric label="Ly tháng 09" value="2.000 ly" /></div>
        <DoloresPanel><DoloresPanelTitle>Danh sách</DoloresPanelTitle><DoloresTable headers={["Máy", "Loại", "Hợp đồng", "Theo dõi"]} rows={[
          [<a className="font-semibold hover:text-[#B81724]" href="/admin/machines?view=s018" key="s018">S-018</a>, "Smart IoT", "C-204", "2.000 ly theo hợp đồng"],
          [<a className="font-semibold hover:text-[#B81724]" href="/admin/machines?view=standard" key="c031">C-031</a>, "Máy thường", "C-205", "Hồ sơ và lịch sử"],
        ]} /></DoloresPanel>
        <DoloresPanel><DoloresPanelTitle>Thông tin chi tiết</DoloresPanelTitle><div className="grid grid-cols-2 gap-x-4 gap-y-7">
          <div><p className="text-[11px] leading-4 text-[#706561]">Khách hàng / tài khoản</p><p className="mt-1 text-[13px] font-semibold leading-5">Nguyễn Minh Anh · đang hoạt động</p></div>
          <div><p className="text-[11px] leading-4 text-[#706561]">Cửa hàng</p><p className="mt-1 text-[13px] font-semibold leading-5">Cà phê Mộc · Quận 3</p></div>
          <div><p className="text-[11px] leading-4 text-[#706561]">Hợp đồng Smart</p><p className="mt-1 text-[13px] font-semibold leading-5">C-204 / S-018 · đến 31/10/2026</p></div>
          <div><p className="text-[11px] leading-4 text-[#706561]">Hợp đồng máy thường</p><p className="mt-1 text-[13px] font-semibold leading-5">C-205 / C-031 · đến 14/11/2026</p></div>
        </div></DoloresPanel>
      </DoloresPage>
    );
  }

  return (
    <DoloresPage title="Khách hàng & cửa hàng" description="Theo dõi hồ sơ và xử lý công việc trong phạm vi được giao." actions={<><DoloresButton href="/admin/businesses?view=customer">Mở khách hàng Minh Anh</DoloresButton><DoloresButton href="/admin/users?view=create-customer" variant="secondary">Tạo tài khoản khách</DoloresButton></>}>
      <div className="grid grid-cols-4 gap-3"><DoloresStatCard label="Khách hàng" value="86" /><DoloresStatCard label="Máy đang thuê" value="98" /><DoloresStatCard label="Smart IoT" value="56" /><DoloresStatCard label="Máy thường" value="42" /></div>
      <DoloresPanel><DoloresPanelTitle>Danh sách</DoloresPanelTitle><DoloresTable headers={["Khách hàng", "Cửa hàng", "Máy đang thuê", "Smart / thường", "Hợp đồng hiệu lực"]} rows={[
        [<a className="font-semibold hover:text-[#B81724]" href="/admin/businesses?view=customer" key="minh-anh">Nguyễn Minh Anh</a>, "Cà phê Mộc", "2", "1 / 1", "2"],
        ["Trần Minh Tâm", "Góc Phố", "3", "2 / 1", "3"],
      ]} /></DoloresPanel>
    </DoloresPage>
  );
}
