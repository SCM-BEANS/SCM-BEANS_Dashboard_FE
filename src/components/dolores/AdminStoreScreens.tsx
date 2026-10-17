"use client";

import { useEffect, useState } from "react";
import {
  DoloresButton,
  DoloresField,
  DoloresFieldGrid,
  DoloresPanel,
  DoloresPanelTitle,
  DoloresTable,
} from "@/components/dolores/DoloresUI";
import { useRouteView } from "@/components/dolores/useRouteView";
import { DoloresPage } from "@/components/dolores/DoloresShell";
import { DoloresDialog } from "@/components/dolores/DoloresDialog";

type StoreView = "list" | "detail";
type Overlay = "confirm" | "success" | null;

function StoreDialog({ success, storeName, onConfirm, onClose }: { success: boolean; storeName: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <DoloresDialog labelledBy="store-dialog-title" onClose={onClose}>
      <section className="w-full max-w-[580px] rounded-[20px] bg-white p-8 shadow-xl">
        <p className="text-[11px] font-medium leading-4 text-[#706561]">{success ? "✓  Đã hoàn tất" : "Xác nhận thông tin"}</p>
        <h2 id="store-dialog-title" className="mt-3 text-xl font-semibold leading-7">{success ? "Đã ghi nhận thành công" : "Xác nhận · Thông tin cửa hàng"}</h2>
        <p className="mt-3 text-[13px] leading-5 text-[#706561]">Lưu thông tin {storeName}, Tenant phụ trách, địa chỉ và trạng thái cửa hàng.</p>
        <div data-dialog-actions>
          {success ? <DoloresButton onClick={onClose}>Về danh sách</DoloresButton> : <><DoloresButton onClick={onConfirm}>Xác nhận</DoloresButton><DoloresButton onClick={onClose} variant="secondary">Đóng</DoloresButton></>}
        </div>
      </section>
    </DoloresDialog>
  );
}

export default function AdminStoreScreens({ initialView = "list" }: { initialView?: StoreView }) {
  const [view, setView] = useRouteView<StoreView>(initialView);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [fields, setFields] = useState({ "Tên cửa hàng": "Cà phê Mộc", "Tenant phụ trách": "Nguyễn Minh Anh", "Địa chỉ": "Quận 3, TP. HCM", "Trạng thái": "Hoạt động" });
  useEffect(() => { setOverlay(null); }, [initialView]);

  if (view === "detail") {
    return (
      <>
        <DoloresPage title="Thông tin cửa hàng" description="Theo dõi hồ sơ và xử lý công việc trong phạm vi được giao." actions={<><DoloresButton onClick={() => setOverlay("confirm")}>Lưu cửa hàng</DoloresButton><DoloresButton variant="secondary" onClick={() => setView("list")}>Hủy</DoloresButton></>}>
          <DoloresPanel><DoloresPanelTitle>Thông tin chi tiết</DoloresPanelTitle><DoloresFieldGrid>
            {Object.entries(fields).map(([label, value]) => <DoloresField key={label} label={label} required={label !== "Trạng thái"}><input className="w-full bg-transparent text-sm leading-[17px] outline-none" aria-label={label} value={value} onChange={event => setFields(current => ({ ...current, [label]: event.target.value }))} /></DoloresField>)}
          </DoloresFieldGrid></DoloresPanel>
        </DoloresPage>
        {overlay && <StoreDialog success={overlay === "success"} storeName={fields["Tên cửa hàng"]} onConfirm={() => setOverlay("success")} onClose={() => {
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
