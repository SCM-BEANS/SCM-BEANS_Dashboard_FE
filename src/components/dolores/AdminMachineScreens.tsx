"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  DoloresButton,
  DoloresNotice,
  DoloresPanel,
  DoloresPanelTitle,
  DoloresStatCard,
  DoloresTable,
  DoloresIconView,
} from "@/components/dolores/DoloresUI";
import { useRouteView } from "@/components/dolores/useRouteView";
import { DoloresPage } from "@/components/dolores/DoloresShell";

type MachineView = "inventory" | "stock" | "loan-history" | "s022" | "standard" | "mb017" | "repair-history" | "s018" | "repair-history-s018";
type InventoryFilter = "Tất cả máy" | "Smart IoT" | "Máy thường" | "Trong kho";
type InventoryRow = {
  machineType: "Smart IoT" | "Máy thường";
  inStock: boolean;
  cells: ReactNode[];
};

function MachineStatus({ children, tone = "neutral" }: { children: ReactNode; tone?: "green" | "amber" | "neutral" }) {
  const toneClass = tone === "green"
    ? "bg-[#ECF6EF] text-[#2F7658]"
    : tone === "amber"
      ? "bg-[#FFF2E6] text-[#9B672E]"
      : "bg-[#F7F5F3] text-[#706561]";
  return <span className={`inline-flex max-w-max items-center rounded-full px-2.5 py-1 text-xs ${toneClass}`}>{children}</span>;
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-[46px] flex-col gap-1">
      <span className="text-[13px] leading-[19px] text-[#706561]">{label}</span>
      <strong className="text-sm font-semibold leading-[21px] text-[#302927]">{value}</strong>
    </div>
  );
}

export default function AdminMachineScreens({ initialView = "inventory" }: { initialView?: MachineView }) {
  const [view, setView] = useRouteView<MachineView>(initialView);
  const [inventoryFilter, setInventoryFilter] = useState<InventoryFilter>("Tất cả máy");

  const inventoryRows: InventoryRow[] = [
    {
      machineType: "Smart IoT",
      inStock: true,
      cells: [
        <Link className="font-semibold text-[#B81724] hover:underline" href="/admin/machines/S-022" key="s022">S-022 ›</Link>,
        "Smart IoT",
        "—",
        "Kho Dolores",
        "Chờ đồng bộ · Cloud đến 29/30",
        <MachineStatus key="status" tone="green">Sẵn sàng</MachineStatus>,
      ],
    },
    {
      machineType: "Smart IoT",
      inStock: true,
      cells: [
        <span className="font-semibold" key="s040">S-040</span>,
        "Smart IoT",
        "—",
        "Kho Dolores",
        "Chờ đồng bộ · Cloud đến 29/30",
        <MachineStatus key="status" tone="green">Sẵn sàng</MachineStatus>,
      ],
    },
    {
      machineType: "Smart IoT",
      inStock: false,
      cells: [
        <span className="font-semibold" key="s042">S-042</span>,
        "Smart IoT · máy thay",
        "C-210",
        "Gắn với hợp đồng chính",
        "160 ly tính vào hợp đồng",
        <MachineStatus key="status" tone="amber">Đang cho mượn</MachineStatus>,
      ],
    },
    {
      machineType: "Máy thường",
      inStock: false,
      cells: [
        <Link className="font-semibold text-[#B81724] hover:underline" href="/admin/machines/C-031" key="c031">C-031 ›</Link>,
        "Máy thường",
        "C-205",
        "Cà phê Mộc · Quận 3",
        "Theo hồ sơ · không theo dõi GPS",
        <MachineStatus key="status" tone="green">Đang cho thuê</MachineStatus>,
      ],
    },
    {
      machineType: "Máy thường",
      inStock: true,
      cells: [
        <Link className="font-semibold text-[#B81724] hover:underline" href="/admin/machines/MB-017" key="mb017">MB-017 ›</Link>,
        "Máy thường",
        "—",
        "Kho Dolores",
        "Theo hồ sơ · không theo dõi GPS",
        <MachineStatus key="status" tone="amber">Tân trang / kiểm thử</MachineStatus>,
      ],
    },
  ];

  const visibleInventoryRows = inventoryRows.filter((row) => {
    if (inventoryFilter === "Trong kho") return row.inStock;
    if (inventoryFilter === "Tất cả máy") return true;
    return row.machineType === inventoryFilter;
  });

  if (view === "s018") {
    return (
      <DoloresPage
        title="Máy Smart S-018 · giám sát & hồ sơ"
        description="Theo dõi hồ sơ và xử lý công việc trong phạm vi được giao."
        actions={<><DoloresButton href="/admin/contracts?view=c204">Xem hợp đồng</DoloresButton><DoloresButton onClick={() => setView("repair-history-s018")} variant="secondary">Lịch sử sửa chữa</DoloresButton><DoloresButton href="/admin/menu?machine=S-018" variant="secondary">Menu máy</DoloresButton><DoloresButton href="/admin/iot?view=machines" variant="secondary">Về máy của khách</DoloresButton></>}
      >
        <div className="grid grid-cols-4 gap-4">
          <DoloresStatCard label="Ly máy chính" value="1.840 ly" />
          <DoloresStatCard label="Ly máy thay" value="160 ly" />
          <DoloresStatCard label="Tổng C-204" value="2.000 ly" />
          <DoloresStatCard label="Kết nối gần nhất" value="09:42" />
        </div>
        <DoloresPanel>
          <DoloresPanelTitle>Thông tin chi tiết</DoloresPanelTitle>
          <div className="grid grid-cols-2 gap-x-4 gap-y-7">
            <DetailField label="Khách hàng" value="Nguyễn Minh Anh · Cà phê Mộc" />
            <DetailField label="Vị trí hợp đồng" value="Quận 3, TP. HCM" />
            <DetailField label="Vị trí GPS đã nhận" value="Quận 3 · 01/10/2026 09:42" />
            <DetailField label="Menu đang áp dụng" value="Global Menu mùa hè · v3" />
          </div>
        </DoloresPanel>
      </DoloresPage>
    );
  }

  if (view === "repair-history-s018") {
    return (
      <DoloresPage
        title="Lịch sử máy S-018"
        description="Theo dõi hồ sơ và xử lý công việc trong phạm vi được giao."
        actions={<><DoloresButton onClick={() => setView("s018")}>Về hồ sơ máy</DoloresButton><DoloresButton onClick={() => setView("loan-history")} variant="secondary">Lịch sử cho mượn</DoloresButton></>}
      >
        <DoloresPanel>
          <DoloresPanelTitle>Thông tin chi tiết</DoloresPanelTitle>
          <div className="grid grid-cols-2 gap-x-4 gap-y-7">
            <DetailField label="Máy / serial" value="S-018 / C-204" />
            <DetailField label="Lần xử lý" value="12/09/2026" />
            <DetailField label="Technician" value="Nguyễn Văn Nam" />
            <DetailField label="Công việc" value="Thay van cấp nước" />
            <DetailField label="Linh kiện / số lượng" value="Van cấp nước / 1 chiếc" />
            <DetailField label="Chi phí lưu hồ sơ" value="350.000 đ" />
            <DetailField label="Kết quả" value="Đã thay, kiểm tra vận hành bình thường" />
          </div>
        </DoloresPanel>
        <DoloresPanel>
          <DoloresPanelTitle>Lịch sử xử lý</DoloresPanelTitle>
          <div className="space-y-3 text-sm">
            <div><p className="font-semibold">10/09 · Nhận máy thay</p><p className="mt-1 text-[#706561]">S-022 thay tạm S-018; cùng loại Smart IoT.</p></div>
            <div><p className="font-semibold">12/09 · Hoàn tất sửa chữa</p><p className="mt-1 text-[#706561]">Thay van cấp nước. Hồ sơ chi phí và tình trạng đã lưu.</p></div>
            <div><p className="font-semibold">12/09 · Bàn giao lại máy chính</p><p className="mt-1 text-[#706561]">S-018 trở lại C-204; kết thúc khoảng dùng S-022.</p></div>
          </div>
        </DoloresPanel>
      </DoloresPage>
    );
  }

  if (view === "stock") {
    return (
      <DoloresPage
        title="Máy trong kho · chưa cho thuê"
        description="Theo dõi hồ sơ và xử lý công việc trong phạm vi được giao."
        actions={<><DoloresButton onClick={() => setView("s022")}>Xem máy S-022</DoloresButton><DoloresButton onClick={() => setView("inventory")} variant="secondary">Về tổng kho</DoloresButton></>}
      >
        <div className="grid grid-cols-3 gap-4">
          <DoloresStatCard label="Smart sẵn sàng" value="11 máy" />
          <DoloresStatCard label="Máy thường sẵn sàng" value="4 máy" />
          <DoloresStatCard label="Chờ tân trang / kiểm thử" value="3 máy" />
        </div>
        <DoloresPanel>
          <DoloresPanelTitle>Danh sách</DoloresPanelTitle>
          <DoloresTable
            headers={["Mã máy / serial", "Loại", "Tình trạng kho", "Cho thuê được", "Lịch sử"]}
            rows={[
              [<button className="font-semibold" key="s022" onClick={() => setView("s022")}>S-022 / SN022</button>, "Smart IoT", "Đã trả máy thay", "Sẵn sàng", "Có sửa chữa / cho mượn"],
              [<span className="font-semibold" key="s040">S-040 / SN040</span>, "Smart IoT", "Chưa cho thuê", "Sẵn sàng", "Chưa phát sinh"],
              [<span className="font-semibold" key="c044">C-044 / SN044</span>, "Máy thường", "Trong kho", "Sẵn sàng", "Có bảo trì"],
              [<button className="font-semibold" key="mb017" onClick={() => setView("mb017")}>MB-017 / OWN017</button>, "Máy thường", "Tân trang / kiểm thử", "Chưa sẵn sàng", "Máy thu mua"],
            ]}
          />
        </DoloresPanel>
        <DoloresNotice title="Tồn kho theo từng máy">
          Điều kiện sẵn sàng phụ thuộc loại máy, tình trạng và hồ sơ sửa chữa. Máy thu mua chỉ sẵn sàng cho thuê sau khi Technician tân trang và kiểm thử đạt.
        </DoloresNotice>
      </DoloresPage>
    );
  }

  if (view === "loan-history") {
    return (
      <DoloresPage
        title="Máy cho mượn & lịch sử sử dụng"
        description="Theo dõi thời gian sử dụng máy thay thế gắn với hợp đồng chính."
        actions={<><DoloresButton onClick={() => setView("s022")}>Xem S-022 và lịch sử máy</DoloresButton><DoloresButton onClick={() => setView("inventory")} variant="secondary">Về kho</DoloresButton></>}
      >
        <DoloresPanel>
          <DoloresPanelTitle>Danh sách</DoloresPanelTitle>
          <DoloresTable
            headers={["Máy thay", "Máy chính", "Hợp đồng", "Khoảng sử dụng", "Trạng thái"]}
            rows={[
              ["S-042", "S-030", "C-210", "28/09 → chưa kết thúc", "Đang cho mượn"],
              [<button className="font-semibold" key="s022" onClick={() => setView("s022")}>S-022</button>, "S-018", "C-204", "10/09 09:00 → 12/09 17:00", "Đã trả · 160 ly"],
              ["C-044", "C-031", "C-205", "05/08 → 07/08", "Đã trả · máy thường"],
            ]}
          />
        </DoloresPanel>
        <DoloresNotice title="Gắn máy tạm theo thời gian">
          Máy thay bắt buộc cùng loại; không tạo hợp đồng thuê mới. Ly Smart được ghi vào hợp đồng chính theo khoảng sử dụng.
        </DoloresNotice>
      </DoloresPage>
    );
  }

  if (view === "s022") {
    return (
      <DoloresPage
        title="Hồ sơ máy S-022"
        description="Theo dõi hồ sơ và xử lý công việc trong phạm vi được giao."
        actions={<><DoloresButton onClick={() => setView("repair-history")}>Lịch sử linh kiện & sửa chữa</DoloresButton><DoloresButton onClick={() => setView("loan-history")} variant="secondary">Lịch sử cho mượn</DoloresButton><DoloresButton onClick={() => setView("inventory")} variant="secondary">Về kho</DoloresButton></>}
      >
        <DoloresPanel>
          <DoloresPanelTitle>Thông tin chi tiết</DoloresPanelTitle>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8">
            <DetailField label="Mã máy / serial" value="S-022 / SN022 · Smart IoT" />
            <DetailField label="Hiện trạng" value="Trong kho · sẵn sàng" />
            <DetailField label="Hợp đồng hiện tại" value="Không có hợp đồng thuê đang gắn" />
            <DetailField label="Lần cho mượn gần nhất" value="C-204 · thay S-018 · 10–12/09/2026" />
            <DetailField label="Số ly trong lần cho mượn" value="160 ly · thuộc C-204" />
            <DetailField label="Linh kiện đã thay" value="Van cấp nước · 1 chiếc · 350.000 đ" />
          </div>
        </DoloresPanel>
        <DoloresPanel>
          <DoloresPanelTitle>Lịch sử xử lý</DoloresPanelTitle>
          <div className="space-y-3 text-sm">
            <div><p className="font-semibold">12/09 · Nhận trả máy thay</p><p className="mt-1 text-[#706561]">Kết thúc khoảng dùng tạm C-204 lúc 17:00. Máy đã về kho.</p></div>
            <div><p className="font-semibold">10/09 · Cho mượn thay máy chính</p><p className="mt-1 text-[#706561]">S-018 đi sửa. S-022 cùng loại Smart IoT.</p></div>
            <div><p className="font-semibold">20/08 · Thay linh kiện</p><p className="mt-1 text-[#706561]">Van cấp nước · 350.000 đ · đã lưu kết quả kiểm tra.</p></div>
            <div><p className="font-semibold">10/07 · Bảo trì</p><p className="mt-1 text-[#706561]">Vệ sinh và kiểm tra. Không thay linh kiện.</p></div>
          </div>
        </DoloresPanel>
      </DoloresPage>
    );
  }

  if (view === "standard") {
    return (
      <DoloresPage title="Hồ sơ máy thường C-031" description="Theo dõi hồ sơ và xử lý công việc trong phạm vi được giao." actions={<><DoloresButton href="/admin/contracts?view=c205">Xem hợp đồng</DoloresButton><DoloresButton href="/admin/businesses?view=customer" variant="secondary">Về khách hàng</DoloresButton></>}>
        <DoloresPanel><DoloresPanelTitle>Thông tin chi tiết</DoloresPanelTitle><div className="grid grid-cols-2 gap-x-4 gap-y-8"><DetailField label="Máy / serial" value="C-031 / SN031 · máy thường" /><DetailField label="Hiện trạng" value="Đang cho thuê" /><DetailField label="Khách hàng / hợp đồng" value="Nguyễn Minh Anh / C-205" /><DetailField label="Địa điểm lắp đặt" value="Cà phê Mộc · Quận 3" /><DetailField label="Lần sửa gần nhất" value="21/08/2026 · Thay bơm · 1 linh kiện · 350.000 đ" /></div></DoloresPanel>
      </DoloresPage>
    );
  }

  if (view === "mb017") {
    return (
      <DoloresPage title="Hồ sơ máy thu mua MB-017" description="Theo dõi hồ sơ và xử lý công việc trong phạm vi được giao." actions={<><DoloresButton onClick={() => setView("inventory")}>Xem hợp đồng</DoloresButton><DoloresButton onClick={() => setView("stock")} variant="secondary">Về khách hàng</DoloresButton></>}>
        <DoloresPanel><DoloresPanelTitle>Thông tin chi tiết</DoloresPanelTitle><div className="grid grid-cols-2 gap-x-4 gap-y-8"><DetailField label="Mã máy / serial" value="MB-017 / OWN017 · máy thường" /><DetailField label="Hiện trạng" value="Đang tân trang / kiểm thử" /><DetailField label="Hồ sơ thu mua" value="MB-2026-017 · mua của khách đang thuê" /><DetailField label="Trạng thái bàn giao" value="Đã thu gom theo thỏa thuận" /><DetailField label="Điều kiện cho thuê" value="Technician tân trang và kiểm thử đạt trước khi sẵn sàng" /></div></DoloresPanel>
      </DoloresPage>
    );
  }

  if (view === "repair-history") {
    return (
      <DoloresPage title="Lịch sử sửa chữa, bảo trì & linh kiện" description="Theo dõi hồ sơ và xử lý công việc trong phạm vi được giao." actions={<><DoloresButton onClick={() => setView("s022")}>Về hồ sơ máy</DoloresButton><DoloresButton onClick={() => setView("loan-history")} variant="secondary">Lịch sử cho mượn</DoloresButton></>}>
        <DoloresPanel><DoloresPanelTitle>Thông tin chi tiết</DoloresPanelTitle><div className="grid grid-cols-2 gap-x-4 gap-y-8"><DetailField label="Máy / serial" value="S-022 / SN022" /><DetailField label="Lần xử lý" value="20/08/2026" /><DetailField label="Technician" value="Nguyễn Văn Nam" /><DetailField label="Công việc" value="Thay van cấp nước" /><DetailField label="Linh kiện / số lượng" value="Van cấp nước / 1 chiếc" /><DetailField label="Chi phí lưu hồ sơ" value="350.000 đ" /><DetailField label="Kết quả" value="Đã thay, kiểm tra vận hành bình thường" /></div></DoloresPanel>
        <DoloresPanel><DoloresPanelTitle>Lịch sử xử lý</DoloresPanelTitle><div className="space-y-3 text-sm"><div><p className="font-semibold">10/07 · Bảo trì</p><p className="mt-1 text-[#706561]">Vệ sinh và kiểm tra. Không thay linh kiện.</p></div><div><p className="font-semibold">20/08 · Sửa chữa</p><p className="mt-1 text-[#706561]">Thay van cấp nước · 1 chiếc · 350.000 đ · đã kiểm tra vận hành.</p></div></div></DoloresPanel>
      </DoloresPage>
    );
  }

  return (
    <DoloresPage
      title="Máy & tồn kho"
      description="Danh sách máy đang thuê, máy trong kho và lịch sử sử dụng."
      actions={<><DoloresButton href="/admin/iot">Giám sát máy Smart IoT</DoloresButton><DoloresButton href="/admin/machines/S-018" variant="secondary">Lịch sử máy</DoloresButton></>}
    >
      <div className="grid grid-cols-4 gap-4">
        <DoloresStatCard label="Smart IoT trong kho" value="12 máy" />
        <DoloresStatCard label="Máy đang cho thuê" value="98 máy" />
        <DoloresStatCard label="Máy đang được thay" value="2 máy" />
        <DoloresStatCard label="Đang tân trang" value="3 máy" />
      </div>
      <div className="flex w-fit max-w-full flex-wrap gap-1 rounded-[10px] border border-[#E9E2DC] bg-white p-1">
        {(["Tất cả máy", "Smart IoT", "Máy thường", "Trong kho"] as const).map((filter) => (
          <button
            aria-pressed={inventoryFilter === filter}
            className={`rounded-[7px] px-3 py-2 text-sm transition-colors ${inventoryFilter === filter ? "bg-[#F9E9EA] font-medium text-[#B81724]" : "text-[#706561] hover:bg-[#F7F5F3]"}`}
            key={filter}
            onClick={() => setInventoryFilter(filter)}
            type="button"
          >
            {filter}
          </button>
        ))}
      </div>
      <DoloresPanel>
        <DoloresPanelTitle>Máy, tồn kho & vị trí</DoloresPanelTitle>
        <p className="-mt-2 mb-4 text-sm leading-[1.45] text-[#706561]">Vị trí hợp đồng hiển thị cho mọi máy; GPS giám sát trực tiếp chỉ có với Smart IoT.</p>
        <DoloresTable
          headers={["Mã máy", "Loại máy", "Hợp đồng", "Vị trí hợp đồng", "Kết nối / theo dõi", "Trạng thái"]}
          rows={visibleInventoryRows.map((row) => row.cells)}
        />
        {visibleInventoryRows.length === 0 && <p className="mt-4 text-sm text-[#706561]">Không có máy trong nhóm này.</p>}
        <div className="mt-4 flex items-start gap-3 rounded-[10px] bg-[#FFF2E6] p-4 text-sm leading-[1.45] text-[#302927]">
          <DoloresIconView className="h-5 w-5 shrink-0" icon="coffee" />
          <div><strong className="font-medium">Quản lý máy thay</strong><p className="mt-1">Máy thay bắt buộc cùng loại với máy chính. Máy Smart IoT thay thế ghi vào cùng hợp đồng theo thời gian sử dụng; máy thường không có dữ liệu số ly.</p></div>
        </div>
      </DoloresPanel>
      <DoloresPanel>
        <DoloresPanelTitle>Máy có thể điều phối</DoloresPanelTitle>
        <p className="-mt-2 mb-4 text-sm leading-[1.45] text-[#706561]">Số lượng Smart IoT khả dụng trong kho.</p>
        <div className="flex flex-wrap items-center gap-4 rounded-[10px] bg-[#FBF7F4] px-4 py-4">
          <span className="text-[34px] font-semibold leading-none text-[#B81724]">12</span>
          <div className="min-w-[220px] flex-1">
            <strong className="text-sm font-medium text-[#302927]">Máy Smart IoT sẵn sàng</strong>
            <p className="mt-1 text-sm text-[#706561]">8 máy sẵn sàng · 2 máy đang bảo trì · 2 máy đang tân trang</p>
          </div>
          <DoloresButton onClick={() => setView("stock")} variant="secondary">Xem kho</DoloresButton>
        </div>
      </DoloresPanel>
    </DoloresPage>
  );
}
