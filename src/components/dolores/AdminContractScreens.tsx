"use client";

import { useState } from "react";
import { DoloresButton, DoloresPanel, DoloresPanelTitle, DoloresTable } from "@/components/dolores/DoloresUI";
import { DoloresPage } from "@/components/dolores/DoloresShell";

type ContractView = "list" | "c204" | "c205" | "history";

function ContractField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-[46px] flex-col gap-1">
      <span className="text-[11px] leading-4 text-[#706561]">{label}</span>
      <strong className="text-[13px] font-semibold leading-5 text-[#302927]">{value}</strong>
    </div>
  );
}

export default function AdminContractScreens({ initialView = "list" }: { initialView?: ContractView }) {
  const [view, setView] = useState<ContractView>(initialView);
  const [previewOpen, setPreviewOpen] = useState(false);

  if (previewOpen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#302927]/25 px-6" role="dialog" aria-modal="true" aria-labelledby="contract-preview-title">
        <section className="w-full max-w-[580px] rounded-[20px] bg-white p-8 shadow-xl">
          <p className="text-[11px] leading-4 text-[#706561]">Tài liệu trong hồ sơ</p>
          <h1 id="contract-preview-title" className="mt-3 text-xl font-semibold leading-7 text-[#302927]">Hợp đồng C-204</h1>
          <p className="mt-3 text-[13px] leading-5 text-[#302927]">Bản hợp đồng ký bên ngoài, được lưu trong hồ sơ khách hàng.</p>
          <div className="mt-3 rounded-[10px] bg-[#F5EEE9] p-4">
            <p className="text-sm font-semibold leading-5 text-[#302927]">C-204-signed.pdf</p>
            <p className="mt-2 text-xs leading-[18px] text-[#302927]">Bản xem mẫu: chưa có ảnh/PDF gốc được cung cấp trong dữ liệu thiết kế.</p>
          </div>
          <button className="mt-5 flex h-12 w-full items-center justify-center rounded-[10px] border border-[#E9E2DC] px-4 py-3 text-sm font-medium text-[#302927] hover:bg-[#F7F5F3]" onClick={() => setPreviewOpen(false)}>Đóng</button>
        </section>
      </div>
    );
  }

  if (view === "history") {
    return (
      <DoloresPage
        title="Lịch sử hợp đồng của khách"
        description="Theo dõi hồ sơ và xử lý công việc trong phạm vi được giao."
        actions={<><DoloresButton onClick={() => setView("c204")}>Xem hợp đồng hiện tại</DoloresButton><DoloresButton href="/admin/businesses?view=customer" variant="secondary">Về khách hàng</DoloresButton></>}
      >
        <DoloresPanel>
          <DoloresPanelTitle>Lịch sử xử lý</DoloresPanelTitle>
          <div className="space-y-3 text-[13px] leading-5">
            <div><p className="font-semibold">C-180 · đã kết thúc 31/03/2026</p><p className="text-xs leading-[18px] text-[#706561]">Máy S-011 được thu hồi, Technician đánh giá và Moderator quyết toán.</p></div>
            <div><p className="font-semibold">C-204 · hợp đồng mới từ 01/04/2026</p><p className="text-xs leading-[18px] text-[#706561]">Máy S-018 · hợp đồng độc lập; không gia hạn C-180.</p></div>
            <div><p className="font-semibold">C-205 · thuê thêm máy thường</p><p className="text-xs leading-[18px] text-[#706561]">C-031 · mở máy có hợp đồng riêng.</p></div>
          </div>
        </DoloresPanel>
      </DoloresPage>
    );
  }

  if (view === "c204") {
    return (
      <DoloresPage
        title="Chi tiết hợp đồng C-204"
        description="Theo dõi hồ sơ và xử lý công việc trong phạm vi được giao."
        actions={<><DoloresButton onClick={() => setView("history")}>Lịch sử hợp đồng</DoloresButton><DoloresButton href="/admin/machines?view=s018" variant="secondary">Máy & lịch sử sửa chữa</DoloresButton><DoloresButton onClick={() => setPreviewOpen(true)} variant="secondary">Xem bản hợp đồng</DoloresButton></>}
      >
        <DoloresPanel>
          <DoloresPanelTitle>Thông tin chi tiết</DoloresPanelTitle>
          <div className="grid grid-cols-2 gap-x-4 gap-y-7">
            <ContractField label="Khách hàng / cửa hàng" value="Nguyễn Minh Anh / Cà phê Mộc" />
            <ContractField label="Hợp đồng / máy chính" value="C-204 / S-018 · Smart IoT" />
            <ContractField label="Thời gian thuê" value="01/04–31/10/2026" />
            <ContractField label="Giá thuê" value="750.000 đ/tháng + 1.000 đ/ly" />
            <ContractField label="Tiền cọc / lắp đặt" value="10.000.000 đ / 1.000.000 đ" />
            <ContractField label="Tài liệu đã ký ngoài hệ thống" value="C-204-signed.pdf" />
            <ContractField label="Ngưỡng offline theo hợp đồng" value="5 ngày" />
          </div>
        </DoloresPanel>
      </DoloresPage>
    );
  }

  if (view === "c205") {
    return (
      <DoloresPage
        title="Chi tiết hợp đồng C-205"
        description="Theo dõi hồ sơ và xử lý công việc trong phạm vi được giao."
        actions={<><DoloresButton href="/admin/machines?view=standard">Xem hồ sơ máy</DoloresButton><DoloresButton onClick={() => setView("list")} variant="secondary">Về hợp đồng</DoloresButton></>}
      >
        <DoloresPanel>
          <DoloresPanelTitle>Thông tin chi tiết</DoloresPanelTitle>
          <div className="grid grid-cols-2 gap-x-4 gap-y-7">
            <ContractField label="Khách hàng" value="Nguyễn Minh Anh" />
            <ContractField label="Hợp đồng / máy" value="C-205 / C-031 · máy thường" />
            <ContractField label="Thời hạn" value="15/05–14/11/2026" />
            <ContractField label="Tiền thuê" value="1.500.000 đ/tháng" />
            <ContractField label="Cọc / lắp đặt" value="10.000.000 đ / 1.000.000 đ" />
            <ContractField label="Vị trí lắp đặt" value="Cà phê Mộc · Quận 3" />
          </div>
        </DoloresPanel>
      </DoloresPage>
    );
  }

  return (
    <DoloresPage
      title="Hợp đồng & trạng thái"
      description="Theo dõi hồ sơ và xử lý công việc trong phạm vi được giao."
      actions={<><DoloresButton onClick={() => setView("c204")}>Xem chi tiết hợp đồng</DoloresButton><DoloresButton onClick={() => setView("history")} variant="secondary">Xem lịch sử hợp đồng</DoloresButton></>}
    >
      <DoloresPanel>
        <DoloresPanelTitle>Danh sách</DoloresPanelTitle>
        <DoloresTable
          headers={["Hợp đồng", "Khách hàng", "Máy", "Thời hạn", "Trạng thái"]}
          rows={[
            [<button className="font-semibold" key="c204" onClick={() => setView("c204")}>C-204</button>, "Nguyễn Minh Anh", "S-018", "31/10/2026", "Sắp hết hạn"],
            [<button className="font-semibold" key="c205" onClick={() => setView("c205")}>C-205</button>, "Nguyễn Minh Anh", "C-031", "14/11/2026", "Còn hiệu lực"],
            [<button className="font-semibold" key="c180" onClick={() => setView("history")}>C-180</button>, "Nguyễn Minh Anh", "S-011", "31/03/2026", "Đã kết thúc"],
          ]}
        />
      </DoloresPanel>
    </DoloresPage>
  );
}
