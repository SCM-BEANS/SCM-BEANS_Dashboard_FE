"use client";

import { useState } from "react";
import {
  DoloresButton,
  DoloresField,
  DoloresFieldGrid,
  DoloresPanel,
  DoloresPanelTitle,
  DoloresTable,
} from "@/components/dolores/DoloresUI";
import { DoloresPage } from "@/components/dolores/DoloresShell";

type StoreView = "list" | "detail";
type Overlay = "confirm" | "success" | null;

function StoreDialog({ success, onConfirm, onClose }: { success: boolean; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#302927]/25 px-6" role="dialog" aria-modal="true" aria-labelledby="store-dialog-title">
      <section className="w-full max-w-[580px] rounded-[20px] bg-white p-8 shadow-xl">
        <p className="text-[11px] font-medium leading-4 text-[#706561]">{success ? "Thông tin cửa hàng" : "Kiểm tra trước khi tiếp tục"}</p>
        <h2 id="store-dialog-title" className="mt-3 text-xl font-semibold leading-7">{success ? "Đã ghi nhận thành công" : "Xác nhận · Thông tin cửa hàng"}</h2>
        <p className="mt-3 text-[13px] leading-5 text-[#706561]">Cà phê Mộc · Nguyễn Minh Anh · Quận 3, TP. HCM · Hoạt động.</p>
        <div className="mt-5 grid gap-5">
          {success ? <DoloresButton onClick={onClose}>Về danh sách</DoloresButton> : <><DoloresButton onClick={onConfirm}>Xác nhận</DoloresButton><DoloresButton onClick={onClose} variant="secondary">Đóng</DoloresButton></>}
        </div>
      </section>
    </div>
  );
}

export default function AdminStoreScreens({ initialView = "list" }: { initialView?: StoreView }) {
  const [view, setView] = useState<StoreView>(initialView);
  const [overlay, setOverlay] = useState<Overlay>(null);

  if (view === "detail") {
    return (
      <>
        <DoloresPage title="Thông tin cửa hàng" description="Theo dõi hồ sơ và xử lý công việc trong phạm vi được giao." actions={<><DoloresButton onClick={() => setOverlay("confirm")}>Lưu cửa hàng</DoloresButton><DoloresButton variant="secondary" onClick={() => setView("list")}>Hủy</DoloresButton></>}>
          <DoloresPanel><DoloresPanelTitle>Thông tin chi tiết</DoloresPanelTitle><DoloresFieldGrid>
            <DoloresField label="Tên cửa hàng" required value="Cà phê Mộc" />
            <DoloresField label="Tenant phụ trách" required value="Nguyễn Minh Anh" />
            <DoloresField label="Địa chỉ" required value="Quận 3, TP. HCM" />
            <DoloresField label="Trạng thái" value="Hoạt động" />
          </DoloresFieldGrid></DoloresPanel>
        </DoloresPage>
        {overlay && <StoreDialog success={overlay === "success"} onConfirm={() => setOverlay("success")} onClose={() => {
          if (overlay === "confirm") setOverlay(null);
          else { setOverlay(null); setView("list"); }
        }} />}
      </>
    );
  }

  return (
    <DoloresPage title="Cửa hàng" description="Theo dõi hồ sơ và xử lý công việc trong phạm vi được giao." actions={<DoloresButton onClick={() => setView("detail")}>Tạo cửa hàng</DoloresButton>}>
      <DoloresPanel><DoloresPanelTitle>Danh sách</DoloresPanelTitle><DoloresTable headers={["Cửa hàng", "Tenant", "Địa chỉ", "Trạng thái"]} rows={[
        [<button key="moc" className="text-left font-semibold hover:text-[#B81724]" onClick={() => setView("detail")}>Cà phê Mộc ›</button>, "Nguyễn Minh Anh", "Quận 3, TP. HCM", "Hoạt động"],
        [<button key="goc-pho" className="text-left font-semibold hover:text-[#B81724]" onClick={() => setView("detail")}>Góc Phố ›</button>, "Trần Minh Tâm", "Thủ Đức, TP. HCM", "Hoạt động"],
      ]} /></DoloresPanel>
    </DoloresPage>
  );
}
