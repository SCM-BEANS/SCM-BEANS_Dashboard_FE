import {
  DoloresButton,
  DoloresNotice,
  DoloresPanel,
  DoloresPanelTitle,
  DoloresStatCard,
  DoloresTable,
} from "@/components/dolores/DoloresUI";
import { DoloresPage } from "@/components/dolores/DoloresShell";
import { BodyModelViewer } from "@/components/features/digital-twin/BodyModelViewer";
import { AdminMachineFocusView } from "@/components/dolores/AdminMachineFocusView";
import { PATH_ADMIN } from "@/routes/path";
import { buildRouteUrl } from "@/routes/query";

type MachineKind = "smart" | "standard";

type MachineRecord = {
  id: string;
  kind: MachineKind;
  contract: string;
  customer: string;
  location: string;
  status: string;
  history: string;
};

const ADMIN_MACHINE_BODY_ROTATION_Y = Math.PI / 4;
const ADMIN_MACHINE_HIDDEN_NODE_NAMES = ["CV02_Matphai-1"] as const;

const MACHINE_RECORDS: Record<string, MachineRecord> = {
  "S-018": {
    id: "S-018",
    kind: "smart",
    contract: "DL-IOT-2026-0042",
    customer: "Nguyễn Minh Anh · Cà phê Mộc",
    location: "Cà phê Mộc · Quận 3, TP. Hồ Chí Minh",
    status: "Sắp hết hạn",
    history: "Bàn giao, kích hoạt và gắn Global Menu",
  },
  "S-022": {
    id: "S-022",
    kind: "smart",
    contract: "DL-IOT-2026-0042",
    customer: "Nguyễn Minh Anh · Cà phê Mộc",
    location: "Gắn với hợp đồng chính C-204",
    status: "Đã trả máy thay",
    history: "Thay tạm S-018 trong thời gian sửa chữa",
  },
  "C-031": {
    id: "C-031",
    kind: "standard",
    contract: "DL-R-2026-0041",
    customer: "Nguyễn Minh Anh · Cà phê Mộc",
    location: "Cà phê Mộc · Quận 3, TP. Hồ Chí Minh",
    status: "Sắp hết hạn",
    history: "Bàn giao máy thường theo hợp đồng",
  },
  "CF-STD-026": {
    id: "CF-STD-026",
    kind: "standard",
    contract: "DL-R-2026-0038",
    customer: "Phạm Hoài Nam · Góc Phố",
    location: "Góc Phố · Bình Thạnh, TP. Hồ Chí Minh",
    status: "Sắp hết hạn",
    history: "Bàn giao máy thường theo hợp đồng",
  },
  "MB-017": {
    id: "MB-017",
    kind: "standard",
    contract: "MB-2026-017",
    customer: "Nguyễn Minh Anh · hồ sơ thu mua",
    location: "Kho Dolores",
    status: "Đang tân trang / kiểm thử",
    history: "Đã thu gom theo thỏa thuận mua máy",
  },
};

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-[46px] flex-col gap-1">
      <span className="text-[13px] leading-[19px] text-[#706561]">{label}</span>
      <strong className="text-sm font-semibold leading-[21px] text-[#302927]">{value}</strong>
    </div>
  );
}

function SmartMachineDetail({ machine }: { machine: MachineRecord }) {
  const isReplacement = machine.id === "S-022";
  return (
    <DoloresPage
      title="Lịch sử máy"
      description="Hợp đồng, lịch sử bảo trì, sửa chữa, thay thế và vị trí máy."
      actions={<DoloresButton href={PATH_ADMIN.machines} variant="secondary">Về danh sách máy</DoloresButton>}
    >
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <DoloresStatCard label="Ly hợp lệ kỳ này" value={isReplacement ? "160 ly" : "2.160 ly"} />
        <DoloresStatCard label="Phí cơ bản" value="750.000 đ" />
        <DoloresStatCard label="Phí theo ly" value={isReplacement ? "160.000 đ" : "2.160.000 đ"} />
        <DoloresStatCard label="Đồng bộ gần nhất" value="Cloud đến ngày 29" />
      </div>
      <AdminMachineFocusView
        information={
          <DoloresPanel>
            <DoloresPanelTitle>Thông tin & theo dõi</DoloresPanelTitle>
            <p className="-mt-2 mb-5 text-sm text-[#706561]">{machine.id} · Smart IoT</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-7">
              <DetailField label="Hợp đồng" value={`${machine.contract} · 01/04/2026–31/10/2026`} />
              <DetailField label="Vị trí hợp đồng" value={machine.location} />
              <DetailField label="Vị trí giám sát GPS" value="Vị trí máy gửi gần nhất · dữ liệu minh họa" />
              <DetailField label="Trạng thái kết nối" value="Mất kết nối · Cloud đã nhận đến ngày 29" />
              <DetailField label="Giới hạn offline trong hợp đồng" value="Không quá 5 ngày/tháng · có thể thương lượng khác" />
              <DetailField label="Máy thay thế" value={isReplacement ? "S-022 · máy thay cùng loại · 160 ly tính vào hợp đồng" : "S-022 · cùng loại Smart IoT · đã trả 12/09/2026"} />
              <DetailField label="Offline" value="Máy Edge lưu dữ liệu và gửi lại khi có kết nối; ngày thiếu được xử lý theo kỳ hóa đơn." />
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <DoloresButton href={buildRouteUrl(PATH_ADMIN.iot, { "view": "machines" })}>Xem dữ liệu vận hành</DoloresButton>
              <DoloresButton href={buildRouteUrl(PATH_ADMIN.contracts, { "view": "c204" })} variant="secondary">Xem hợp đồng</DoloresButton>
            </div>
          </DoloresPanel>
        }
        model={
          <DoloresPanel>
            <DoloresPanelTitle>Mô hình máy</DoloresPanelTitle>
            <p className="-mt-2 mb-4 text-sm text-[#706561]">Mô hình thân máy 3D · Smart IoT</p>
            <BodyModelViewer
              interactive={false}
              modelRotationY={ADMIN_MACHINE_BODY_ROTATION_Y}
              excludedNodeNames={ADMIN_MACHINE_HIDDEN_NODE_NAMES}
            />
          </DoloresPanel>
        }
      />
      <DoloresPanel>
        <DoloresPanelTitle>Menu hiện tại</DoloresPanelTitle>
        <p className="-mt-2 mb-4 text-sm text-[#706561]">Global Menu Dolores và công thức riêng được quản lý riêng biệt.</p>
        <DoloresTable
          headers={["Món", "Công thức gốc", "Công thức riêng", "Trạng thái"]}
          rows={[
            [<strong key="espresso">Espresso</strong>, "18 g cà phê · 40 ml nước", "18 g cà phê · 40 ml nước", "Theo Global Menu"],
            [<strong key="milk">Cà phê sữa tươi</strong>, "18 g cà phê · 120 ml sữa", "18 g cà phê · 120 ml sữa", "Theo Global Menu"],
            [<strong key="americano">Americano</strong>, "18 g cà phê · 120 ml nước", "18 g cà phê · 120 ml nước", "Theo Global Menu"],
          ]}
        />
        <DoloresButton href={PATH_ADMIN.menu} variant="secondary">Mở menu quản lý</DoloresButton>
      </DoloresPanel>
    </DoloresPage>
  );
}

function StandardMachineDetail({ machine }: { machine: MachineRecord }) {
  const isBuyback = machine.id === "MB-017";
  return (
    <DoloresPage
      title="Lịch sử máy"
      description="Hợp đồng, lịch sử bảo trì, sửa chữa, thay thế và vị trí máy."
      actions={<DoloresButton href={PATH_ADMIN.machines} variant="secondary">Về danh sách máy</DoloresButton>}
    >
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <DoloresStatCard label="Phí thuê máy thường" value="1.500.000 đ / tháng" />
        <DoloresStatCard label="Hợp đồng" value={machine.contract} />
        <DoloresStatCard label="Trạng thái máy" value={machine.status} />
        <DoloresStatCard label="Vị trí hợp đồng" value={machine.location} />
      </div>
      <DoloresPanel>
        <DoloresPanelTitle>Chi tiết máy thường · {machine.id}</DoloresPanelTitle>
        <p className="-mt-2 mb-5 text-sm text-[#706561]">{machine.contract} · {machine.customer}</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-7">
          <DetailField label="Vị trí lắp đặt theo hợp đồng" value={machine.location} />
          <DetailField label="Lịch sử máy" value={machine.history} />
          <DetailField label="Theo dõi từ xa" value="Máy thường không có telemetry, số ly, GPS giám sát hoặc digital twin." />
          <DetailField label="Menu Dolores" value="Máy thường không nhận Global Menu Dolores." />
          {isBuyback && <DetailField label="Điều kiện cho thuê lại" value="Chỉ sẵn sàng sau khi Technician tân trang và kiểm thử đạt." />}
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <DoloresButton href={buildRouteUrl(PATH_ADMIN.contracts, { "view": "c205" })} variant="secondary">Xem hợp đồng</DoloresButton>
        </div>
      </DoloresPanel>
      <DoloresNotice title="Máy thường">
        Giao diện chỉ lưu địa điểm hợp đồng và lịch sử máy; không ghi nhận vị trí GPS trực tiếp hoặc trạng thái online/offline.
      </DoloresNotice>
    </DoloresPage>
  );
}

export default function AdminMachineDetailScreen({ machineId }: { machineId: string }) {
  const machine = MACHINE_RECORDS[machineId];

  if (!machine) {
    return (
      <DoloresPage
        title="Lịch sử máy"
        description="Hợp đồng, lịch sử bảo trì, sửa chữa, thay thế và vị trí máy."
        actions={<DoloresButton href={PATH_ADMIN.machines} variant="secondary">Về danh sách máy</DoloresButton>}
      >
        <DoloresNotice title="Không tìm thấy máy">
          Máy này không thuộc hồ sơ hiện tại hoặc chưa có dữ liệu trong kho Dolores.
        </DoloresNotice>
      </DoloresPage>
    );
  }

  return machine.kind === "smart"
    ? <SmartMachineDetail machine={machine} />
    : <StandardMachineDetail machine={machine} />;
}
