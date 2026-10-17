"use client";

import { useEffect, useState } from "react";
import { DoloresButton, DoloresDetails, DoloresPanel, DoloresPanelTitle, DoloresTable } from "@/components/dolores/DoloresUI";
import { useRouteView } from "@/components/dolores/useRouteView";
import { DoloresPage } from "@/components/dolores/DoloresShell";
import { DoloresDialog } from "@/components/dolores/DoloresDialog";
import styles from "./DoloresShell.module.css";

type ContractView = "list" | "c204" | "c205" | "history";

export default function AdminContractScreens({ initialView = "list" }: { initialView?: ContractView }) {
  const [view, setView] = useRouteView<ContractView>(initialView);
  const [previewOpen, setPreviewOpen] = useState(false);
  useEffect(() => { setPreviewOpen(false); }, [initialView]);

  if (previewOpen) {
    return (
      <DoloresDialog labelledBy="contract-preview-title" onClose={() => setPreviewOpen(false)}>
        <section>
          <p>Tài liệu trong hồ sơ</p>
          <h1 id="contract-preview-title">Hợp đồng C-204</h1>
          <p>Bản hợp đồng ký bên ngoài, được lưu trong hồ sơ khách hàng.</p>
          <div className={styles.documentPreview}>
            <h3 className={styles.mobileOnlyContent}>Tài liệu</h3>
            <p>C-204-signed.pdf</p>

          </div>
          <DoloresButton variant="secondary" onClick={() => setPreviewOpen(false)}>Đóng</DoloresButton>
        </section>
      </DoloresDialog>
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
          <div className="flex flex-col gap-3 lg:gap-4">
            <div className="flex flex-col gap-[5px] lg:gap-1"><p className="text-[15px] font-semibold leading-[22px]">C-180 · đã kết thúc 31/03/2026</p><p className="text-sm leading-5 text-[#706561]">Máy S-011 được thu hồi, Technician đánh giá và Moderator quyết toán.</p></div>
            <div className="flex flex-col gap-[5px] lg:gap-1"><p className="text-[15px] font-semibold leading-[22px]">C-204 · hợp đồng mới từ 01/04/2026</p><p className="text-sm leading-5 text-[#706561]">Máy S-018 · hợp đồng độc lập; không gia hạn C-180.</p></div>
            <div className="flex flex-col gap-[5px] lg:gap-1"><p className="text-[15px] font-semibold leading-[22px]">C-205 · thuê thêm máy thường</p><p className="text-sm leading-5 text-[#706561]">C-031 · mỗi máy có hợp đồng riêng.</p></div>
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
        actions={<><DoloresButton className="lg:w-[156.8px]" onClick={() => setView("history")}>Lịch sử hợp đồng</DoloresButton><DoloresButton className="lg:w-[203.6px]" href="/admin/machines?view=s018" variant="secondary">Máy & lịch sử sửa chữa</DoloresButton><DoloresButton className="lg:w-[156.8px]" onClick={() => setPreviewOpen(true)} variant="secondary">Xem bản hợp đồng</DoloresButton></>}
      >
        <DoloresPanel>
          <DoloresPanelTitle>Thông tin chi tiết</DoloresPanelTitle>
          <DoloresDetails fields={[["Khách hàng / cửa hàng", "Nguyễn Minh Anh / Cà phê Mộc"], ["Hợp đồng / máy chính", "C-204 / S-018 · Smart IoT"], ["Thời gian thuê", "01/04–31/10/2026"], ["Giá thuê", "750.000 đ/tháng + 1.000 đ/ly"], ["Tiền cọc / lắp đặt", "10.000.000 đ / 1.000.000 đ"], ["Tài liệu đã ký ngoài hệ thống", "C-204-signed.pdf"], ["Ngưỡng offline theo hợp đồng", "5 ngày"]]} />
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
          <DoloresDetails fields={[["Khách hàng", "Nguyễn Minh Anh"], ["Hợp đồng / máy", "C-205 / C-031 · máy thường"], ["Thời hạn", "15/05–14/11/2026"], ["Tiền thuê", "1.500.000 đ/tháng"], ["Cọc / lắp đặt", "10.000.000 đ / 1.000.000 đ"], ["Vị trí lắp đặt", "Cà phê Mộc · Quận 3"]]} />
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
