import { DoloresButton, DoloresNotice, DoloresPanel, DoloresPanelTitle, DoloresStatCard, DoloresTable } from "@/components/dolores/DoloresUI";
import { DoloresPage } from "@/components/dolores/DoloresShell";
import AdminCustomerScreens from "@/components/dolores/AdminCustomerScreens";

export default function AdminIoTScreens({ showCustomerMachines = false }: { showCustomerMachines?: boolean }) {
  if (showCustomerMachines) return <AdminCustomerScreens initialView="machines" />;

  return (
    <DoloresPage
      title="Giám sát Smart IoT · theo khách hàng"
      description="Theo dõi hồ sơ và xử lý công việc trong phạm vi được giao."
      actions={<><DoloresButton href="/admin/iot?view=machines">Xem máy của Nguyễn Minh Anh</DoloresButton><DoloresButton href="/admin/machines" variant="secondary">Kho máy</DoloresButton></>}
    >
      <div className="grid grid-cols-4 gap-3">
        <DoloresStatCard label="Khách hàng Dolores" value="86" />
        <DoloresStatCard label="Smart IoT đang thuê" value="56 máy" />
        <DoloresStatCard label="Smart đang kết nối" value="54 máy" />
        <DoloresStatCard label="Ly toàn hệ thống · tháng 09" value="48.600 ly" />
      </div>
      <DoloresPanel>
        <DoloresPanelTitle>Danh sách</DoloresPanelTitle>
        <DoloresTable
          headers={["Khách hàng", "Cửa hàng", "Tổng máy", "Smart / thường", "Ly Smart tháng 09"]}
          rows={[
            [<a className="font-semibold hover:text-[#B81724]" href="/admin/iot?view=machines" key="minh-anh">Nguyễn Minh Anh</a>, "Cà phê Mộc", "2", "1 / 1", "2.000"],
            ["Trần Minh Tâm", "Góc Phố", "3", "2 / 1", "3.100"],
            ["Lê Hải Nam", "Bếp Nhà", "1", "0 / 1", "Không có dữ liệu số ly"],
          ]}
        />
      </DoloresPanel>
      <DoloresNotice title="Chọn khách hàng → chọn máy → xem dữ liệu">
        Tổng số ly chỉ cộng máy Smart gửi dữ liệu bán thành công. Máy thường có hồ sơ, không có telemetry hoặc số ly.
      </DoloresNotice>
    </DoloresPage>
  );
}
