"use client";

import { useState } from "react";
import {
  DoloresButton,
  DoloresField,
  DoloresFieldGrid,
  DoloresNotice,
  DoloresPanel,
  DoloresPanelTitle,
  DoloresTable,
} from "@/components/dolores/DoloresUI";
import { DoloresPage } from "@/components/dolores/DoloresShell";

export type AdminMenuView = "list" | "items" | "add" | "missing" | "ingredients" | "edit-espresso" | "edit-espresso-60" | "edit-espresso-20g" | "send" | "sent";
type Overlay = "add-confirm" | "add-success" | "edit-confirm" | "edit-success" | "send-confirm" | "send-success" | null;

function MenuDialog({ title, message, success, onConfirm, onClose }: { title: string; message: string; success?: boolean; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#302927]/25 px-6" role="dialog" aria-modal="true" aria-labelledby="menu-dialog-title">
      <section className="w-full max-w-[580px] rounded-[20px] bg-white p-8 shadow-xl">
        <p className="text-[11px] font-medium leading-4 text-[#706561]">{success ? "Thông tin menu" : "Kiểm tra trước khi tiếp tục"}</p>
        <h2 id="menu-dialog-title" className="mt-3 text-xl font-semibold leading-7">{title}</h2>
        <p className="mt-3 text-[13px] leading-5 text-[#706561]">{message}</p>
        <div className="mt-5 grid gap-5">
          {!success && <DoloresButton onClick={onConfirm}>Xác nhận</DoloresButton>}
          <DoloresButton variant={success ? "primary" : "secondary"} onClick={onClose}>{success ? "Về danh sách món" : "Đóng"}</DoloresButton>
        </div>
      </section>
    </div>
  );
}

export default function AdminMenuScreens({ initialView = "list", basePath = "/admin/menu" }: { initialView?: AdminMenuView; basePath?: string }) {
  const [view, setView] = useState<AdminMenuView>(initialView);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [coffee, setCoffee] = useState(initialView === "edit-espresso-20g" ? "20" : "18");
  const [water, setWater] = useState(initialView === "edit-espresso-60" ? "60" : "40");
  const [milk, setMilk] = useState("120");
  const [milkSelected, setMilkSelected] = useState(true);
  const linkTo = (nextView: AdminMenuView) => `${basePath}?view=${nextView}`;
  const description = "Chỉ Admin và Moderator quản lý Global Menu Dolores. Mỗi máy cho thuê phải được cấp menu; khách chỉ tùy chỉnh công thức riêng.";

  if (view === "list") {
    return <DoloresPage title="Global Menu & công thức" description={description} actions={<DoloresButton href={linkTo("items")}>Mở menu & danh sách món</DoloresButton>}>
      <DoloresPanel><DoloresPanelTitle>Danh sách</DoloresPanelTitle><DoloresTable headers={["Menu", "Phiên bản", "Số món", "Máy sử dụng", "Trạng thái"]} rows={[[<a className="font-semibold hover:text-[#B81724]" href={linkTo("items")} key="summer">Global Menu mùa hè ›</a>, "v3", "2", "S-018", "Đang áp dụng"]]} /></DoloresPanel>
    </DoloresPage>;
  }

  if (view === "items") {
    return <DoloresPage title="Global Menu mùa hè · các món" description={description} actions={<><DoloresButton href={linkTo("add")}>Thêm món</DoloresButton><DoloresButton href={linkTo("edit-espresso")} variant="secondary">Chỉnh Espresso</DoloresButton><DoloresButton href={linkTo("send")} variant="secondary">Gửi menu xuống máy</DoloresButton></>}>
      <DoloresPanel><DoloresPanelTitle>Danh sách</DoloresPanelTitle><DoloresTable headers={["Món", "Thành phần bắt buộc", "Định lượng mẫu", "Nước pha", "Thao tác"]} rows={[
        [<a className="font-semibold hover:text-[#B81724]" href={linkTo("edit-espresso")} key="espresso">Espresso</a>, "Cà phê", `${coffee} g cà phê`, `${water} ml`, <a className="text-[#B81724]" href={linkTo("edit-espresso")} key="edit-espresso">Chỉnh công thức</a>],
        [<a className="font-semibold hover:text-[#B81724]" href={linkTo("add")} key="milk">Cà phê sữa tươi</a>, "Cà phê + sữa tươi", "18 g cà phê + 120 ml sữa", "Theo công thức", <a className="text-[#B81724]" href={linkTo("add")} key="edit-milk">Xem / chỉnh sửa</a>],
      ]} /></DoloresPanel>
    </DoloresPage>;
  }

  if (view === "add" || view === "missing" || view === "ingredients") {
    const missing = view === "missing" || !milkSelected;
    const title = view === "ingredients" ? "Thành phần của Cà phê sữa tươi" : missing ? "Thêm món · thiếu thành phần bắt buộc" : "Thêm món · Cà phê sữa tươi";
    return <>
      <DoloresPage title={title} description={view === "ingredients" ? undefined : description} actions={<><DoloresButton onClick={() => missing ? setView("ingredients") : setOverlay("add-confirm")}>{missing ? "Bổ sung sữa tươi" : "Lưu món vào menu"}</DoloresButton><DoloresButton variant="secondary" onClick={() => setView("ingredients")}>Chọn thành phần</DoloresButton><DoloresButton variant="secondary" href={linkTo("items")}>Về menu</DoloresButton></>}>
        {view === "ingredients" ? <DoloresPanel><DoloresPanelTitle>Thành phần bắt buộc</DoloresPanelTitle><div className="grid gap-3"><label className="flex h-12 items-center gap-3 rounded-[10px] border border-[#E9E2DC] px-4"><input type="checkbox" checked readOnly />Cà phê · gram</label><label className="flex h-12 items-center gap-3 rounded-[10px] border border-[#E9E2DC] px-4"><input type="checkbox" checked={milkSelected} onChange={(event) => setMilkSelected(event.target.checked)} />Sữa tươi · ml</label></div></DoloresPanel> : <>
          <DoloresPanel><DoloresPanelTitle>Thông tin chi tiết</DoloresPanelTitle><DoloresFieldGrid>
            <DoloresField label="Menu" value="Global Menu mùa hè" /><DoloresField label="Tên món" required value="Cà phê sữa tươi" />
            <DoloresField label="Thành phần cà phê" required><span className="flex items-center gap-2"><input aria-label="Thành phần cà phê" className="w-20 bg-transparent text-sm outline-none" type="number" value={coffee} onChange={(event) => setCoffee(event.target.value)} />g</span></DoloresField>
            <DoloresField label="Thành phần sữa tươi" required><span className="flex items-center gap-2"><input aria-label="Thành phần sữa tươi" className="w-20 bg-transparent text-sm outline-none" type="number" value={milkSelected ? milk : ""} onChange={(event) => setMilk(event.target.value)} />ml</span></DoloresField>
            <DoloresField className="col-span-2" label="Ghi chú định lượng" value="Số liệu mẫu; chỉnh theo công thức của công ty" />
          </DoloresFieldGrid></DoloresPanel>
          <DoloresNotice title={missing ? "Chưa thể lưu món" : "Thành phần bắt buộc của món"} tone={missing ? "warning" : "info"}>{missing ? "Cà phê sữa tươi phải có cả cà phê và sữa tươi. Bổ sung sữa tươi trước khi lưu." : "Cà phê sữa tươi phải có cả cà phê và sữa tươi. Thiếu một thành phần sẽ báo lỗi và chưa lưu món."}</DoloresNotice>
        </>}
      </DoloresPage>
      {overlay && <MenuDialog title={overlay === "add-success" ? "Đã lưu thông tin" : "Xác nhận · Lưu món Cà phê sữa tươi"} message="Cà phê sữa tươi · cà phê và sữa tươi · Global Menu mùa hè." success={overlay === "add-success"} onConfirm={() => setOverlay("add-success")} onClose={() => overlay === "add-confirm" ? setOverlay(null) : (setOverlay(null), setView("items"))} />}
    </>;
  }

  if (view === "edit-espresso" || view === "edit-espresso-60" || view === "edit-espresso-20g") {
    return <>
      <DoloresPage title="Chỉnh công thức Espresso" description={description} actions={<><DoloresButton onClick={() => setOverlay("edit-confirm")}>Lưu thay đổi</DoloresButton><DoloresButton variant="secondary" href={linkTo("items")}>Về menu</DoloresButton></>}>
        <DoloresPanel><DoloresPanelTitle>Thông tin chi tiết</DoloresPanelTitle><DoloresFieldGrid>
          <DoloresField label="Menu / món" value="Global Menu mùa hè / Espresso" /><DoloresField label="Thành phần bắt buộc" value="Cà phê" />
          <DoloresField label="Lượng cà phê"><span className="flex items-center gap-2"><input aria-label="Lượng cà phê" className="w-20 bg-transparent text-sm outline-none" type="number" value={coffee} onChange={(event) => setCoffee(event.target.value)} />g</span></DoloresField>
          <DoloresField label="Lượng nước pha"><span className="flex items-center gap-2"><input aria-label="Lượng nước pha" className="w-20 bg-transparent text-sm outline-none" type="number" value={water} onChange={(event) => setWater(event.target.value)} />ml</span></DoloresField>
        </DoloresFieldGrid></DoloresPanel>
        <DoloresNotice title="Điều chỉnh định lượng món">Có thể thay đổi gram cà phê và lượng nước. Ví dụ thay nước pha từ 40 ml lên 60 ml; thành phần bắt buộc vẫn được giữ.</DoloresNotice>
      </DoloresPage>
      {overlay && <MenuDialog title={overlay === "edit-success" ? "Đã lưu thông tin" : "Xác nhận · Lưu công thức Espresso"} message={`Global Menu mùa hè · Espresso · ${coffee} g cà phê · ${water} ml nước pha.`} success={overlay === "edit-success"} onConfirm={() => setOverlay("edit-success")} onClose={() => overlay === "edit-confirm" ? setOverlay(null) : (setOverlay(null), setView("items"))} />}
    </>;
  }

  if (view === "send") {
    return <>
      <DoloresPage title="Gửi menu đến máy Smart" description={description} actions={<><DoloresButton onClick={() => setOverlay("send-confirm")}>Xác nhận gửi menu</DoloresButton><DoloresButton href={linkTo("items")} variant="secondary">Về danh sách món</DoloresButton></>}>
        <DoloresPanel><DoloresPanelTitle>Thông tin chi tiết</DoloresPanelTitle><DoloresFieldGrid><DoloresField label="Menu / phiên bản" value="Global Menu mùa hè · v4" /><DoloresField label="Thay đổi" value={`Espresso: nước pha 40 ml → ${water} ml`} /><DoloresField label="Máy nhận menu" value="S-018 · Smart IoT" /><DoloresField label="Khách hàng / cửa hàng" value="Nguyễn Minh Anh / Cà phê Mộc" /><DoloresField className="col-span-2" label="Menu đang áp dụng" value="Gửi cấu hình mới đến máy. Khách xem menu hiện tại trên màn chi tiết máy; khi máy có lỗi, Moderator điều phối Technician xử lý." /></DoloresFieldGrid></DoloresPanel>
      </DoloresPage>
      {overlay && <MenuDialog title={overlay === "send-success" ? "Đã ghi nhận yêu cầu gửi" : "Gửi menu xuống máy"} message="Global Menu mùa hè v4 → S-018. Lưu trạng thái đã gửi; menu hiện tại trên máy được theo dõi từ dữ liệu máy." success={overlay === "send-success"} onConfirm={() => setOverlay("send-success")} onClose={() => overlay === "send-confirm" ? setOverlay(null) : (setOverlay(null), setView("items"))} />}
    </>;
  }

  return <DoloresPage title="Global Menu mùa hè · món đã cập nhật" description={description} actions={<DoloresButton href={linkTo("items")}>Về danh sách món</DoloresButton>}><DoloresNotice title="Đã gửi đến máy">Global Menu mùa hè v4 đã được gửi đến S-018. Trạng thái áp dụng cần được xác nhận từ máy.</DoloresNotice></DoloresPage>;
}
