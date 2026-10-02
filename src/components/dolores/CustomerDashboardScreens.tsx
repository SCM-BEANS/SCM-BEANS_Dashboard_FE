"use client";

import { useState } from "react";
import Link from "next/link";
import { writeDemoFlow } from "@/components/dolores/demoFlowStore";
import { DoloresPage } from "@/components/dolores/DoloresShell";
import {
  DoloresButton,
  DoloresField,
  DoloresFieldGrid,
  DoloresNotice,
  DoloresPanel,
  DoloresPanelTitle,
  DoloresTable,
} from "@/components/dolores/DoloresUI";

function Tabs({ labels, selected, onSelect }: { labels: string[]; selected: string; onSelect: (value: string) => void }) {
  return (
    <div className="flex gap-3">
      {labels.map((label) => (
        <DoloresButton key={label} variant={selected === label ? "primary" : "secondary"} onClick={() => onSelect(label)}>
          {label}
        </DoloresButton>
      ))}
    </div>
  );
}

function ConfirmPanel({ title, message, onCancel, onConfirm }: { title: string; message: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#302927]/30 p-6">
      <section aria-labelledby="customer-confirm-title" aria-modal="true" className="w-full max-w-[580px] rounded-[20px] border border-[#E9E2DC] bg-white p-8 shadow-lg" role="dialog">
        <p className="text-[11px] font-medium leading-4 text-[#706561]">Kiểm tra trước khi tiếp tục</p>
        <h2 className="mt-3 text-xl font-semibold leading-7 text-[#302927]" id="customer-confirm-title">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-[#706561]">{message}</p>
        <div className="mt-5 grid gap-5">
          <DoloresButton onClick={onConfirm}>Xác nhận</DoloresButton>
          <DoloresButton onClick={onCancel} variant="secondary">Hủy</DoloresButton>
        </div>
      </section>
    </div>
  );
}

function CustomerFlowDialog({
  mode,
  title,
  message,
  actionLabel,
  confirmActionLabel,
  onClose,
  onConfirm,
  successHref,
  successLabel,
  errorLabel = "Vui lòng bổ sung trước khi gửi",
}: {
  mode: "confirm" | "success" | "error";
  title: string;
  message: string;
  actionLabel: string;
  confirmActionLabel?: string;
  onClose: () => void;
  onConfirm?: () => void;
  successHref?: string;
  successLabel?: string;
  errorLabel?: string;
}) {
  const error = mode === "error";
  const success = mode === "success";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#302927]/30 p-6" role="presentation">
      <section aria-labelledby="customer-flow-title" aria-modal="true" className="w-full max-w-[580px] rounded-[20px] border border-[#E9E2DC] bg-white p-8 shadow-xl" role="dialog">
        <p className="text-[11px] font-medium leading-4 text-[#706561]">{error ? "Cần bổ sung thông tin" : success ? "✓  Đã hoàn tất" : "Kiểm tra trước khi tiếp tục"}</p>
        <h2 className="mt-3 text-xl font-semibold leading-7 text-[#302927]" id="customer-flow-title">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-[#706561]">{message}</p>
        {error && <div className="mt-4 rounded-[10px] border border-[#E9E2DC] bg-[#F8F6F3] px-4 py-3"><p className="text-sm font-medium text-[#302927]">Tài liệu / thông tin bắt buộc *</p><p className="mt-1 text-sm text-[#706561]">{errorLabel}</p></div>}
        <div className="mt-5 grid gap-5">
          {success && successHref ? <DoloresButton href={successHref}>{successLabel ?? actionLabel}</DoloresButton>
            : error ? <><DoloresButton onClick={onClose}>Quay lại bổ sung</DoloresButton><DoloresButton onClick={onClose} variant="secondary">Đóng</DoloresButton></>
              : <><DoloresButton onClick={onConfirm}>{confirmActionLabel ?? "Xác nhận"}</DoloresButton><DoloresButton onClick={onClose} variant="secondary">Đóng</DoloresButton></>}
        </div>
      </section>
    </div>
  );
}

function ContractsPage() {
  const [filter, setFilter] = useState("Tất cả");
  const rows = [
    [<Link className="font-medium" href="/dashboard/contracts/C-204" key="c204">C-204 ›</Link>, "Smart IoT", "S-018", "31/10/2026", "Sắp hết hạn"],
    [<Link className="font-medium" href="/dashboard/contracts/C-205" key="c205">C-205 ›</Link>, "Thông thường", "C-031", "14/11/2026", "Còn hiệu lực"],
  ];
  return (
    <DoloresPage
      title="Hợp đồng của tôi"
      description="Xem thời hạn, máy và hồ sơ của từng hợp đồng."
      actions={
        <>
          <DoloresButton href="/dashboard/contracts/C-204">Xem chi tiết hợp đồng</DoloresButton>
          <DoloresButton href="/dashboard" variant="secondary">Về tổng quan</DoloresButton>
        </>
      }
    >
      <Tabs labels={["Tất cả", "Đang hiệu lực", "Sắp hết hạn"]} selected={filter} onSelect={setFilter} />
      <DoloresPanel>
        <DoloresPanelTitle>Danh sách hợp đồng</DoloresPanelTitle>
        <DoloresTable headers={["Hợp đồng", "Loại máy", "Mã máy", "Thời hạn", "Trạng thái"]} rows={filter === "Sắp hết hạn" ? [rows[0]] : filter === "Đang hiệu lực" ? [rows[1]] : rows} />
      </DoloresPanel>
    </DoloresPage>
  );
}

function MachinesPage() {
  const [filter, setFilter] = useState("Tất cả máy");
  const machineRows = [
    [<Link className="font-semibold" href="/dashboard/machines/S-018" key="s018">S-018 ›</Link>, "Smart IoT", "C-204", "Cà phê Mộc", "Đã đồng bộ 09:42", "Máy chính"],
    [<Link className="font-semibold" href="/dashboard/machines/C-031" key="c031">C-031 ›</Link>, "Thông thường", "C-205", "Cà phê Mộc", "Theo hồ sơ", "Đang sử dụng"],
    [<Link className="font-semibold" href="/dashboard/machines/substitute" key="s022">S-022 ›</Link>, "Smart IoT · tạm", "C-204", "Đã trả ngày 12/09", "160 ly trong kỳ", "Đã trả máy thay"],
  ];
  const rows = filter === "Smart IoT" ? [machineRows[0], machineRows[2]] : filter === "Thông thường" ? [machineRows[1]] : machineRows;
  return (
    <DoloresPage
      title="Máy của tôi"
      description="Xem tình trạng, vị trí theo hợp đồng và lịch sử của từng máy."
      actions={
        <>
          <DoloresButton href="/dashboard/machines/S-018">Giám sát máy Smart</DoloresButton>
          <DoloresButton href="/dashboard/contracts" variant="secondary">Xem hợp đồng</DoloresButton>
        </>
      }
    >
      <Tabs labels={["Tất cả máy", "Smart IoT", "Thông thường"]} selected={filter} onSelect={setFilter} />
      <DoloresPanel>
        <DoloresPanelTitle>Danh sách máy</DoloresPanelTitle>
        <p className="-mt-2 mb-3 text-sm leading-[1.45] text-[#706561]">Vị trí hợp đồng hiển thị cho mọi máy; GPS giám sát trực tiếp chỉ có với Smart IoT.</p>
        <DoloresTable headers={["Mã máy", "Loại máy", "Hợp đồng", "Vị trí hợp đồng", "Kết nối / theo dõi", "Trạng thái"]} rows={rows} />
      </DoloresPanel>
      <DoloresNotice title="Khác biệt theo loại máy">
        Máy thông thường không có số ly, dữ liệu vận hành, menu từ xa, trạng thái có kết nối/mất kết nối hoặc vị trí GPS trực tiếp.
      </DoloresNotice>
    </DoloresPage>
  );
}

function InvoicesPage() {
  const [filter, setFilter] = useState("Tất cả");
  const invoiceRows = [
    [<Link className="font-medium" href="/dashboard/invoices/2026-09" key="sep">09/2026 ›</Link>, "30/09/2026", "12/10/2026", "Thuê + PAYG · C-204", <Link className="underline" href="/dashboard/invoices/2026-09" key="sum">2.750.000 đ</Link>, "Chờ đối chiếu"],
    [<Link className="font-medium" href="/dashboard/invoices/standard" key="standard">09/2026 · C-205 ›</Link>, "30/09/2026", "12/10/2026", "Thuê máy thường", <Link className="underline" href="/dashboard/invoices/standard" key="standard-amount">1.500.000 đ</Link>, "Chưa thanh toán"],
    [<Link className="font-medium" href="/dashboard/invoices/refund" key="excess">09/2026 · HD-09-205 ›</Link>, "30/09/2026", "12/10/2026", "Thuê máy · C-204", <Link className="underline" href="/dashboard/invoices/refund" key="excess-amount">1.500.000 đ</Link>, "Chờ hoàn 200.000 đ"],
    ["08/2026", "31/08/2026", "11/09/2026", "Thuê + PAYG", "2.630.000 đ", "Đã xác nhận"],
  ];
  const rows = filter === "Chưa thanh toán" ? invoiceRows.slice(0, 2) : filter === "Đã thanh toán" ? invoiceRows.slice(2) : invoiceRows;
  return (
    <DoloresPage
      title="Hóa đơn & thanh toán"
      description="Theo dõi hóa đơn, hạn thanh toán và kết quả đối chiếu từ Moderator."
      actions={
        <>
          <DoloresButton href="/dashboard/invoices/payment">Gửi chứng từ chuyển khoản</DoloresButton>
          <DoloresButton href="/dashboard/invoices/2026-08" variant="secondary">Xem tháng đầu</DoloresButton>
          <DoloresButton href="/dashboard/invoices/reminder" variant="secondary">Nhắc thanh toán</DoloresButton>
        </>
      }
    >
      <Tabs labels={["Tất cả", "Chưa thanh toán", "Đã thanh toán"]} selected={filter} onSelect={setFilter} />
      <DoloresPanel>
        <DoloresPanelTitle>Hóa đơn của cửa hàng</DoloresPanelTitle>
        <p className="-mt-2 mb-3 text-sm leading-[1.45] text-[#706561]">Hóa đơn tháng được phát hành vào ngày cuối cùng của tháng.</p>
        <DoloresTable headers={["Kỳ", "Phát hành", "Hạn thanh toán", "Nội dung", "Tổng tiền", "Trạng thái"]} rows={rows} />
      </DoloresPanel>
      <DoloresNotice title="Hạn thanh toán">
        10 ngày làm việc kể từ ngày phát hành; tính từ thứ Hai đến thứ Bảy, không tính Chủ nhật. Chuyển khoản được thực hiện ngoài Dolores.
      </DoloresNotice>
    </DoloresPage>
  );
}

function InvoiceDetailPage() {
  return (
    <DoloresPage
      title="Chi tiết hóa đơn & đối chiếu"
      description="Theo dõi số tiền phải trả, tiền đã nhận và hướng xử lý khi thiếu hoặc thừa."
      actions={
        <>
          <DoloresButton href="/dashboard/invoices/payment">Gửi chứng từ bổ sung</DoloresButton>
          <DoloresButton href="/dashboard/invoices/shortfall" variant="secondary">Xem phần còn thiếu</DoloresButton>
          <DoloresButton href="/dashboard/invoices/refund" variant="secondary">Xem hoàn tiền thừa</DoloresButton>
        </>
      }
    >
      <div className="grid grid-cols-4 gap-4">
        {[["Tiền hóa đơn gốc", "2.750.000 đ"], ["Đã đối chiếu", "1.750.000 đ"], ["Còn thiếu", "1.000.000 đ"], ["Hạn còn lại", "3 ngày làm việc"]].map(([label, value]) => (
          <div className="flex min-h-[99px] flex-col gap-1.5 px-3 py-[18px]" key={label}><span className="text-[13px] text-[#706561]">{label}</span><strong className="text-[26px] font-semibold text-[#302927]">{value}</strong></div>
        ))}
      </div>
      <DoloresPanel>
        <DoloresPanelTitle>Hóa đơn tháng 09/2026</DoloresPanelTitle>
        <div className="grid grid-cols-2 gap-5">
          <div><p className="text-[13px] text-[#706561]">Phát hành / hạn trả</p><p className="mt-1 text-sm font-semibold">30/09/2026 / 12/10/2026</p></div>
          <div><p className="text-[13px] text-[#706561]">Phí thuê + phí theo ly</p><p className="mt-1 text-sm font-semibold">750.000 đ + 2.000.000 đ</p></div>
          <div><p className="text-[13px] text-[#706561]">Đã nhận / còn thiếu</p><p className="mt-1 text-sm font-semibold">1.750.000 đ / 1.000.000 đ</p></div>
          <div><p className="text-[13px] text-[#706561]">Lý do bộ trễ</p><p className="mt-1 text-sm font-semibold">Chưa trả đủ, trong hạn và còn sửa được: gửi bản mới. Đã trả đủ/đối soát hoặc không sửa được: cộng kỳ sau.</p></div>
        </div>
      </DoloresPanel>
      <DoloresPanel>
        <DoloresPanelTitle>Đối chiếu</DoloresPanelTitle>
        <p className="text-sm font-semibold">Ảnh chứng từ đã gửi</p>
        <p className="mt-1 text-sm text-[#706561]">01/10/2026 · Chuyển khoản ngoài Dolores.</p>
        <p className="mt-4 text-sm font-semibold">Đã nhận một phần</p>
        <p className="mt-1 text-sm text-[#706561]">1.750.000 đ đã được đối chiếu với tài khoản công ty.</p>
      </DoloresPanel>
      <DoloresNotice title="Khoản hoàn tiền thừa ở hóa đơn riêng">
        HD-09-204 còn thiếu 1.000.000 đ. Khoản hoàn 200.000 đ thuộc HD-09-205 và được đối chiếu riêng.
      </DoloresNotice>
      <DoloresNotice title="Cách xử lý ly nhận muộn">
        Nếu hóa đơn đã thanh toán hoặc đối soát, ly chuyển sang kỳ tiếp theo. Chỉ tính lại hóa đơn chưa chốt, còn trong hạn và còn sửa được.
      </DoloresNotice>
    </DoloresPage>
  );
}

function MenuPage() {
  const rows = [
    ["Espresso", "Cà phê", "18 g cà phê · 40 ml nước", <Link className="font-medium text-[#B81724]" href="/dashboard/menu/espresso" key="esp">Chỉnh định lượng</Link>],
    ["Cà phê sữa tươi", "Cà phê + sữa tươi", "18 g cà phê · 120 ml sữa", <Link className="font-medium text-[#B81724]" href="/dashboard/menu/fresh-milk" key="milk">Chỉnh định lượng</Link>],
  ];
  return (
    <DoloresPage
      title="Menu của tôi · máy S-018"
      description="Global Menu do Dolores cấp và cập nhật. Bạn chỉ chỉnh công thức riêng hoặc thêm món được máy hỗ trợ."
      actions={
        <>
          <DoloresButton href="/dashboard/menu/espresso">Chỉnh Espresso</DoloresButton>
          <DoloresButton href="/dashboard/menu/fresh-milk" variant="secondary">Chỉnh cà phê sữa tươi</DoloresButton>
          <DoloresButton href="/dashboard/menu" variant="secondary">Về menu theo máy</DoloresButton>
          <DoloresButton href="/dashboard/menu/add-dish" variant="secondary">Thêm món riêng</DoloresButton>
        </>
      }
    >
      <DoloresPanel>
        <DoloresPanelTitle>Danh sách</DoloresPanelTitle>
        <DoloresTable headers={["Món", "Thành phần bắt buộc", "Định lượng hiện tại", "Thao tác"]} rows={rows} />
      </DoloresPanel>
      <DoloresPanel>
        <DoloresPanelTitle>Thông tin chi tiết</DoloresPanelTitle>
        <div className="grid grid-cols-2 gap-8">
          <div><p className="text-[13px] text-[#706561]">Cửa hàng / máy</p><p className="mt-1 text-sm font-semibold">Cà phê Mộc / S-018 · Smart IoT</p></div>
          <div><p className="text-[13px] text-[#706561]">Global Menu Dolores đã nhận</p><p className="mt-1 text-sm font-semibold">Global Menu mùa hè · v3</p></div>
          <div><p className="text-[13px] text-[#706561]">Bản chỉnh sửa riêng</p><p className="mt-1 text-sm font-semibold">Chưa có thay đổi</p></div>
          <div><p className="text-[13px] text-[#706561]">Phạm vi áp dụng</p><p className="mt-1 text-sm font-semibold">Chỉ máy S-018 của tôi</p></div>
        </div>
      </DoloresPanel>
      <DoloresNotice title="Tinh chỉnh công thức riêng">
        Menu riêng chỉ áp dụng cho máy đủ điều kiện của cửa hàng này; thao tác không sửa Global Menu hoặc menu của khách hàng khác.
      </DoloresNotice>
    </DoloresPage>
  );
}

function MenuEditPage({ freshMilk, initialCoffee = "18", initialWater = "40", initialMilk = "120", initialStage = "edit", initialError = false }: { freshMilk: boolean; initialCoffee?: string; initialWater?: string; initialMilk?: string; initialStage?: "edit" | "pending" | "applied"; initialError?: boolean }) {
  const [coffee, setCoffee] = useState(initialCoffee);
  const [water, setWater] = useState(initialWater);
  const [milk, setMilk] = useState(initialError ? "" : initialMilk);
  const [confirming, setConfirming] = useState(false);
  const [validationError, setValidationError] = useState(initialError);
  const [stage, setStage] = useState<"edit" | "pending" | "applied">(initialStage);
  const [discardConfirm, setDiscardConfirm] = useState(false);

  if (stage === "pending" || stage === "applied") {
    const applied = stage === "applied";
    return (
      <DoloresPage
        title={applied ? "Công thức riêng đã được máy áp dụng" : "Đã gửi · chờ máy cập nhật"}
        description="Global Menu do Dolores cấp và cập nhật. Bạn chỉ chỉnh công thức riêng hoặc thêm món được máy hỗ trợ."
        actions={
          <>
            {applied ? <><DoloresButton onClick={() => setStage("edit")}>Chỉnh sửa công thức</DoloresButton><DoloresButton href="/dashboard/menu" variant="secondary">Về menu của tôi</DoloresButton></> : <DoloresButton onClick={() => { writeDemoFlow("S-018-private-menu", "machine-acknowledged"); setStage("applied"); }}>Mô phỏng xác nhận từ máy</DoloresButton>}
            <DoloresButton href="/dashboard/support" variant="secondary">Cần hỗ trợ cập nhật</DoloresButton>
          </>
        }
      >
        {applied ? <>
          <DoloresPanel><DoloresPanelTitle>Danh sách</DoloresPanelTitle><DoloresTable headers={["Món", "Thành phần bắt buộc", "Định lượng đã áp dụng", "Phạm vi"]} rows={[["Espresso", "Cà phê", freshMilk ? "18 g · 40 ml nước" : `${coffee} g · ${water} ml nước`, "S-018 · của tôi"], ["Cà phê sữa tươi", "Cà phê + sữa tươi", freshMilk ? `${coffee} g · ${milk} ml sữa` : "18 g · 120 ml sữa", "S-018 · của tôi"]]} /></DoloresPanel>
          <DoloresPanel><DoloresPanelTitle>Thông tin chi tiết</DoloresPanelTitle><DoloresFieldGrid><DoloresField label="Máy / cửa hàng" value="S-018 / Cà phê Mộc" /><DoloresField label="Menu máy báo hiện tại" value="Công thức riêng · v1" /><DoloresField label="Trạng thái" value="Máy báo cập nhật thành công" /><DoloresField label="Thay đổi đã áp dụng" value={freshMilk ? `Cà phê sữa tươi: ${milk} ml sữa` : `Espresso: nước ${water} ml; cà phê ${coffee} g`} /></DoloresFieldGrid></DoloresPanel>
        </> : <DoloresPanel>
          <DoloresPanelTitle>Thông tin chi tiết</DoloresPanelTitle>
          <div className="grid grid-cols-2 gap-8">
            <div><p className="text-[13px] text-[#706561]">Máy nhận</p><p className="mt-1 text-sm font-semibold">S-018 · Cà phê Mộc</p></div>
            <div><p className="text-[13px] text-[#706561]">Bản đã gửi</p><p className="mt-1 text-sm font-semibold">Công thức riêng · v1</p></div>
            <div><p className="text-[13px] text-[#706561]">Thay đổi</p><p className="mt-1 text-sm font-semibold">{freshMilk ? "Cà phê sữa tươi: 120 → " + milk + " ml sữa" : "Espresso: nước pha 40 → " + water + " ml; cà phê " + coffee + " g"}</p></div>
            <div><p className="text-[13px] text-[#706561]">Menu máy đã báo gần nhất</p><p className="mt-1 text-sm font-semibold">Global Menu mùa hè · v3</p></div>
          </div>
        </DoloresPanel>}
        <DoloresNotice title={applied ? "Máy đã xác nhận áp dụng" : "Chưa xác nhận áp dụng"}>
          {applied ? "Máy đã phản hồi menu riêng mới. Thay đổi chỉ áp dụng cho máy S-018 của Cà phê Mộc." : "Đã gửi cấu hình không đồng nghĩa máy đã áp dụng. Kiểm tra trạng thái máy để xem phản hồi mới nhất."}
        </DoloresNotice>
      </DoloresPage>
    );
  }

  return (
    <>
      <DoloresPage
        title={freshMilk ? "Tinh chỉnh cà phê sữa tươi" : "Tinh chỉnh Espresso"}
        description="Global Menu do Dolores cấp và cập nhật. Bạn chỉ chỉnh công thức riêng hoặc thêm món được máy hỗ trợ."
        actions={
          <>
            {freshMilk ? (
              <>
                <DoloresButton onClick={() => setMilk("150")}>Tăng sữa lên 150 ml</DoloresButton>
                <DoloresButton onClick={() => setCoffee("20")} variant="secondary">Tăng cà phê lên 20 g</DoloresButton>
              </>
            ) : (
              <>
                <DoloresButton onClick={() => setWater("60")}>Tăng nước lên 60 ml</DoloresButton>
                <DoloresButton onClick={() => setCoffee("20")} variant="secondary">Tăng cà phê lên 20 g</DoloresButton>
              </>
            )}
            <DoloresButton href="/dashboard/menu" variant="secondary">Về menu của tôi</DoloresButton>
            <DoloresButton onClick={() => setDiscardConfirm(true)} variant="secondary">Bỏ thay đổi</DoloresButton>
            <DoloresButton onClick={() => { const valid = Number(coffee) > 0 && Number(freshMilk ? milk : water) > 0; setValidationError(!valid); if (valid) setConfirming(true); }}>Lưu & gửi menu riêng</DoloresButton>
          </>
        }
      >
        <DoloresPanel>
          <DoloresPanelTitle>Thông tin chi tiết</DoloresPanelTitle>
          <DoloresFieldGrid>
            <DoloresField label="Máy / phạm vi" value="S-018 · công thức riêng của Cà phê Mộc" />
            <DoloresField label="Món" value={freshMilk ? "Cà phê sữa tươi" : "Espresso"} />
            <DoloresField label="Cà phê" required>
              <span className="flex items-center gap-2"><input aria-label="Lượng cà phê" className="w-full bg-transparent text-sm text-[#302927] outline-none" min="1" type="number" value={coffee} onChange={(event) => setCoffee(event.target.value)} />g</span>
            </DoloresField>
            {freshMilk ? (
              <DoloresField label="Sữa tươi" required>
                <span className="flex items-center gap-2"><input aria-label="Lượng sữa tươi" className="w-full bg-transparent text-sm text-[#302927] outline-none" min="1" type="number" value={milk} onChange={(event) => setMilk(event.target.value)} />ml</span>
              </DoloresField>
            ) : (
              <DoloresField label="Nước pha" required>
                <span className="flex items-center gap-2"><input aria-label="Lượng nước pha" className="w-full bg-transparent text-sm text-[#302927] outline-none" min="1" type="number" value={water} onChange={(event) => setWater(event.target.value)} />ml</span>
              </DoloresField>
            )}
          </DoloresFieldGrid>
        </DoloresPanel>
        {validationError && <DoloresNotice title="Chưa thể lưu công thức" tone="warning">Thành phần bắt buộc phải có định lượng lớn hơn 0.</DoloresNotice>}
        <DoloresNotice title="Định lượng công thức">
          {freshMilk ? "Cà phê sữa tươi bắt buộc có cà phê và sữa tươi. Định lượng thể hiện bằng gram và ml." : "Điều chỉnh gram cà phê và ml nước. Giữ thành phần cà phê bắt buộc; các số liệu là mẫu thao tác."}
        </DoloresNotice>
      </DoloresPage>
      {confirming && (
        <ConfirmPanel
          title="Lưu và gửi menu riêng?"
          message="Lưu công thức riêng và gửi một lần đến máy S-018? Máy cần xác nhận trước khi hiển thị trạng thái đã áp dụng."
          onCancel={() => setConfirming(false)}
          onConfirm={() => { setConfirming(false); writeDemoFlow("S-018-private-menu", "pending"); setStage("pending"); }}
        />
      )}
      {discardConfirm && <ConfirmPanel title="Bỏ bản chỉnh sửa riêng?" message="Các thay đổi chưa gửi sẽ bị bỏ. Menu đã áp dụng trên máy không thay đổi." onCancel={() => setDiscardConfirm(false)} onConfirm={() => { setDiscardConfirm(false); setCoffee("18"); setWater("40"); setMilk("120"); }} />}
    </>
  );
}

function MachineDetailPage({ id, state }: { id: string; state?: string }) {
  const smart = id.startsWith("S-");
  const offline = state === "offline";
  return (
    <DoloresPage
      title={smart ? "Chi tiết máy Smart IoT" : "Chi tiết máy thông thường"}
      description={smart ? "Xem tình trạng, dữ liệu Smart IoT và lịch sử theo hợp đồng." : "Xem vị trí và hồ sơ máy theo hợp đồng."}
      actions={
        <>
          {smart && <DoloresButton href="/dashboard/menu">Xem menu của máy</DoloresButton>}
          <DoloresButton href="/dashboard/machines/history" variant="secondary">Lịch sử bảo trì & sửa chữa</DoloresButton>
          <DoloresButton href="/dashboard/machines" variant="secondary">Về máy của tôi</DoloresButton>
        </>
      }
    >
      <DoloresPanel>
        <DoloresPanelTitle>Thông tin máy</DoloresPanelTitle>
        <div className="grid grid-cols-2 gap-5">
          <div><p className="text-[13px] text-[#706561]">Mã máy</p><p className="mt-1 text-sm font-semibold">{id}</p></div>
          <div><p className="text-[13px] text-[#706561]">Loại máy</p><p className="mt-1 text-sm font-semibold">{smart ? "Smart IoT" : "Máy thông thường"}</p></div>
          <div><p className="text-[13px] text-[#706561]">Hợp đồng</p><p className="mt-1 text-sm font-semibold">{smart ? "C-204" : "C-205"}</p></div>
          <div><p className="text-[13px] text-[#706561]">Vị trí hợp đồng</p><p className="mt-1 text-sm font-semibold">Cà phê Mộc</p></div>
        </div>
      </DoloresPanel>
      {smart ? (
        <DoloresPanel>
          <DoloresPanelTitle>{offline ? "Máy mất kết nối · dữ liệu gần nhất" : "Giám sát Smart IoT · dữ liệu minh họa"}</DoloresPanelTitle>
          <div className="grid grid-cols-3 gap-4">
            <div><p className="text-[13px] text-[#706561]">Kết nối</p><p className="mt-1 text-sm font-semibold">{offline ? "Mất kết nối · dữ liệu gần nhất" : "Đã đồng bộ 09:42"}</p></div>
            <div><p className="text-[13px] text-[#706561]">Ly hợp lệ</p><p className="mt-1 text-sm font-semibold">2.000 ly</p></div>
            <div><p className="text-[13px] text-[#706561]">Vị trí GPS</p><p className="mt-1 text-sm font-semibold">Cà phê Mộc</p></div>
          </div>
        </DoloresPanel>
      ) : (
        <DoloresNotice title="Thông tin máy thông thường">Máy thông thường chỉ có vị trí hợp đồng và hồ sơ. Không có telemetry, GPS hoặc menu từ xa.</DoloresNotice>
      )}
    </DoloresPage>
  );
}

function CustomerExpiryPage() {
  const [overlay, setOverlay] = useState<"confirm" | "success" | null>(null);
  return <>
    <DoloresPage title="Sắp hết hạn hợp đồng" description="Nhắc trước một tháng để trao đổi. Hợp đồng mới được ký riêng, không tự động gia hạn." actions={<><DoloresButton href="/dashboard/contracts/new">Trao đổi hợp đồng mới</DoloresButton><DoloresButton onClick={() => setOverlay("confirm")} variant="secondary">Không tiếp tục thuê</DoloresButton></>}>
      <DoloresNotice title="Bước hiện tại: Chọn hướng xử lý"><div className="flex flex-wrap gap-x-3 gap-y-1"><span>1. Nhắc trước hạn →</span><span className="font-semibold">2. Chọn hướng xử lý →</span><span>3. Trao đổi với Moderator →</span><span>4. Hết hạn</span></div></DoloresNotice>
      <DoloresPanel><DoloresPanelTitle>Thông tin chi tiết</DoloresPanelTitle><DoloresFieldGrid><DoloresField label="Hợp đồng" value="C-204" /><DoloresField label="Ngày hết hạn" value="31/10/2026" /><DoloresField label="Nhắc trước" value="01 tháng" /><DoloresField label="Nếu không phản hồi" value="Xem như không tiếp tục sử dụng" /><DoloresField label="Nếu muốn tiếp tục" value="Trao đổi và ký hợp đồng mới độc lập" /><DoloresField label="Máy trong hợp đồng mới" value="Theo thỏa thuận mới" /></DoloresFieldGrid></DoloresPanel>
      <DoloresNotice title="Sau khi hết hạn">Thực hiện quy trình kết thúc bình thường. Hệ thống không tạo gia hạn tự động.</DoloresNotice>
    </DoloresPage>
    {overlay && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#302927]/30 p-6" role="dialog" aria-modal="true" aria-labelledby="customer-expiry-title">
      <section className="w-full max-w-[580px] rounded-[20px] border border-[#E9E2DC] bg-white p-8 shadow-lg">
        <p className="text-[11px] font-medium leading-4 text-[#706561]">{overlay === "success" ? "✓  Đã hoàn tất" : "Kiểm tra trước khi tiếp tục"}</p>
        <h2 className="mt-3 text-xl font-semibold leading-7 text-[#302927]" id="customer-expiry-title">{overlay === "success" ? "Đã ghi nhận thành công" : "Xác nhận · Sắp hết hạn hợp đồng"}</h2>
        <p className="mt-3 text-sm leading-6 text-[#706561]">Ghi nhận không tiếp tục thuê sau 31/10/2026. Hợp đồng kết thúc theo quy trình thu hồi, đánh giá rồi quyết toán cọc.</p>
        <div className="mt-5 grid gap-5">
          {overlay === "success" ? <DoloresButton href="/dashboard/contracts/end">Xem hồ sơ hoàn cọc</DoloresButton> : <><DoloresButton onClick={() => setOverlay("success")}>Xác nhận</DoloresButton><DoloresButton onClick={() => setOverlay(null)} variant="secondary">Đóng</DoloresButton></>}
        </div>
      </section>
    </div>}
  </>;
}

function CustomerInvoiceReminderPage() {
  return <DoloresPage title="Nhắc thanh toán hóa đơn" description="Theo dõi thông tin và thực hiện yêu cầu của cửa hàng." actions={<><DoloresButton href="/dashboard/invoices/shortfall">Xem số tiền & hóa đơn</DoloresButton><DoloresButton href="/dashboard/invoices/payment" variant="secondary">Đã chuyển khoản · gửi ảnh</DoloresButton></>}><DoloresPanel><DoloresPanelTitle>Thông tin chi tiết</DoloresPanelTitle><DoloresFieldGrid><DoloresField label="Hóa đơn" value="HD-09-204" /><DoloresField label="Hạn thanh toán" value="12/10/2026" /><DoloresField label="Còn phải trả" value="1.000.000 đ" /><DoloresField label="Tần suất nhắc" value="Mỗi ngày đến khi hóa đơn được thanh toán đủ" /></DoloresFieldGrid></DoloresPanel><DoloresNotice title="Thanh toán ngoài Dolores">Gửi chứng từ chỉ để Moderator đối chiếu; trạng thái đã thanh toán được cập nhật sau khi xác nhận.</DoloresNotice></DoloresPage>;
}

function CustomerReplacementPage() {
  return <DoloresPage title="Máy thay thế trong hợp đồng" description="Theo dõi thông tin và thực hiện yêu cầu của cửa hàng." actions={<><DoloresButton href="/dashboard/machines/S-018">Về giám sát</DoloresButton><DoloresButton href="/dashboard/machines" variant="secondary">Về danh sách máy</DoloresButton></>}><DoloresPanel><DoloresPanelTitle>Thông tin chi tiết</DoloresPanelTitle><DoloresFieldGrid><DoloresField label="Hợp đồng thuê chính" value="C-204" /><DoloresField label="Máy chính / máy thay" value="S-018 / S-022 · cùng loại Smart IoT" /><DoloresField label="Bắt đầu / kết thúc máy thay" value="10/09 09:00 – 12/09 17:00" /><DoloresField label="Ly máy thay trong đợt" value="160 ly" /><DoloresField label="Ly máy chính trong tháng" value="1.840 ly" /><DoloresField label="Tổng ly tính C-204" value="2.000 ly" /><DoloresField label="Trạng thái máy thay" value="Đã trả" /></DoloresFieldGrid></DoloresPanel></DoloresPage>;
}

function CustomerMachineHistoryPage() {
  return <DoloresPage title="Lịch sử bảo trì & sửa chữa" description="Theo dõi thông tin và thực hiện yêu cầu của cửa hàng." actions={<><DoloresButton href="/dashboard/support/new">Gửi yêu cầu hỗ trợ</DoloresButton><DoloresButton href="/dashboard/machines" variant="secondary">Về máy của tôi</DoloresButton></>}><DoloresPanel><DoloresPanelTitle>Thông tin chi tiết</DoloresPanelTitle><DoloresFieldGrid><DoloresField label="Máy" value="C-031 · hợp đồng C-205" /><DoloresField label="Lần thực hiện" value="12/09/2026" /><DoloresField label="Nội dung" value="Thay van cấp nước · 1 chiếc" /><DoloresField label="Chi phí theo hợp đồng" value="350.000 đ" /><DoloresField label="Kết quả" value="Đã hoạt động bình thường" /></DoloresFieldGrid></DoloresPanel></DoloresPage>;
}

function StandardInvoiceDetailPage() {
  return <DoloresPage title="Hóa đơn thuê máy thường" description="Hóa đơn thuê máy C-205 · máy thường C-031." actions={<><DoloresButton href="/dashboard/invoices/standard-payment">Gửi chứng từ bổ sung</DoloresButton><DoloresButton href="/dashboard/invoices" variant="secondary">Xem hóa đơn</DoloresButton></>}>
    <DoloresPanel><DoloresPanelTitle>09/2026 · C-205</DoloresPanelTitle><DoloresFieldGrid><DoloresField label="Tổng tiền" value="1.500.000 đ" /><DoloresField label="Moderator đã xác nhận" value="0 đ" /><DoloresField label="Còn phải thanh toán" value="1.500.000 đ" /><DoloresField label="Hạn thanh toán" value="12/10/2026" /><DoloresField label="Máy" value="C-031 · Máy thường" /><DoloresField label="Trạng thái" value="Chưa thanh toán" /></DoloresFieldGrid></DoloresPanel>
    <DoloresNotice title="Thanh toán trễ">Dư nợ còn thiếu cộng dồn 5% mỗi ngày trễ.</DoloresNotice>
  </DoloresPage>;
}

function CustomerSupportList() {
  return <DoloresPage title="Yêu cầu hỗ trợ của tôi" description="Theo dõi thông tin và thực hiện yêu cầu của cửa hàng." actions={<><DoloresButton href="/dashboard/support/new">Gửi yêu cầu mới</DoloresButton><DoloresButton href="/dashboard/support/YC-018" variant="secondary">Xem yêu cầu đang xử lý</DoloresButton></>}><DoloresPanel><DoloresPanelTitle>Danh sách</DoloresPanelTitle><DoloresTable headers={["Mã yêu cầu", "Máy", "Nội dung", "Trạng thái"]} rows={[[<Link href="/dashboard/support/YC-018" key="yc18">YC-018 ›</Link>, "S-018", "Menu không cập nhật", "Đã giao Technician"], [<Link href="/dashboard/support/YC-012" key="yc12">YC-012 ›</Link>, "C-031", "Thay van cấp nước", "Hoàn tất"]]} /></DoloresPanel></DoloresPage>;
}

function CustomerMenuSupportPage() {
  return <DoloresPage title="Cập nhật menu cần hỗ trợ" description="Global Menu do Dolores cấp và cập nhật. Bạn chỉ chỉnh công thức riêng hoặc thêm món được máy hỗ trợ." actions={<><DoloresButton href="/dashboard/support/new">Thông báo Moderator</DoloresButton><DoloresButton href="/dashboard/machines/S-018?state=offline" variant="secondary">Xem kết nối máy</DoloresButton></>}>
    <DoloresPanel><DoloresPanelTitle>Thông tin chi tiết</DoloresPanelTitle><DoloresFieldGrid>
      <DoloresField label="Máy cần kiểm tra" value="S-018 · Smart IoT" />
      <DoloresField label="Trạng thái áp dụng" value="Chưa xác nhận nhận bản chỉnh sửa" />
      <DoloresField label="Menu hiện tại" value="Theo dữ liệu máy báo gần nhất" />
      <DoloresField label="Thông tin gửi hỗ trợ" value="Máy, bản công thức và mô tả lỗi cập nhật" />
    </DoloresFieldGrid></DoloresPanel>
    <DoloresNotice title="Giữ rõ trạng thái máy đã báo">Khi máy lỗi hoặc mất kết nối, không hiển thị bản đã gửi là đã áp dụng. Gửi thông tin cho Moderator; Moderator điều phối Technician nếu cần.</DoloresNotice>
  </DoloresPage>;
}

function CustomerSupportProgress({ id }: { id: string }) {
  const complete = id === "YC-012";
  return <DoloresPage title="Tiến trình yêu cầu hỗ trợ" description="Theo dõi thông tin và thực hiện yêu cầu của cửa hàng." actions={<><DoloresButton href="/dashboard/support">Về yêu cầu hỗ trợ</DoloresButton><DoloresButton href="/dashboard/machines/history" variant="secondary">Xem lịch sử máy</DoloresButton></>}><DoloresPanel><DoloresPanelTitle>Lịch sử xử lý</DoloresPanelTitle><div className="space-y-4 text-sm"><p><strong>01/10 · Đã gửi</strong><br />{complete ? "Khách yêu cầu thay van cấp nước · YC-012." : "Khách báo menu không cập nhật · YC-018."}</p><p><strong>01/10 · Moderator tiếp nhận</strong><br />Đã giao Technician Nguyễn Văn Nam.</p><p><strong>{complete ? "Hoàn tất" : "Đang xử lý"}</strong><br />{complete ? "Thay van cấp nước · kết quả được lưu vào lịch sử máy." : "Kết quả sửa chữa sẽ được lưu vào lịch sử máy."}</p></div></DoloresPanel></DoloresPage>;
}

function BuybackOverviewPage() {
  return <DoloresPage title="Đề nghị thu mua máy cũ" description="Dịch vụ dành cho khách hàng đang thuê máy của Dolores; Technician đánh giá nội bộ trước khi đàm phán." actions={<><DoloresButton href="/dashboard/buyback/new">Gửi đề nghị thu mua</DoloresButton><DoloresButton href="/dashboard/buyback/documents" variant="secondary">Xem chứng từ thu mua</DoloresButton></>}>
    <DoloresPanel><DoloresPanelTitle>Theo dõi đề nghị</DoloresPanelTitle><DoloresFieldGrid>
      <DoloresField label="Điều kiện dịch vụ" value="Đang thuê Dolores · C-205" />
      <DoloresField label="Máy đề nghị bán" value="MB-017 · máy thuộc sở hữu khách hàng" />
      <DoloresField label="Đánh giá" value="Technician đánh giá trước thương lượng" />
      <DoloresField label="Thương lượng" value="Moderator trao đổi giá sau khi nhận kết quả" />
      <DoloresField label="Hợp đồng mua bán" value="Ký bên ngoài; Moderator lưu bản ký" />
      <DoloresField label="Chứng từ chuyển tiền" value="Moderator tải lên; khách xem và xác nhận" />
    </DoloresFieldGrid></DoloresPanel>
    <DoloresPanel><DoloresPanelTitle>Sau khi mua</DoloresPanelTitle><div className="grid gap-4">{[["Thu hồi", "Sau khi hoàn tất mua bán theo hồ sơ."], ["Tân trang", "Ghi nhận lịch sử xử lý máy."], ["Kiểm tra", "Kiểm tra vận hành trước khi cho thuê."], ["Sẵn sàng cho thuê", "Chỉ sau tân trang và kiểm tra."]].map(([title, detail]) => <div key={title} className="flex flex-col gap-1"><p className="text-[15px] font-semibold text-[#302927]">{title}</p><p className="text-sm text-[#706561]">{detail}</p></div>)}</div></DoloresPanel>
    <DoloresNotice title="Vai trò của nền tảng">Dolores lưu trạng thái, hợp đồng, máy và lịch sử. Tiêu chí định giá và đánh giá thuộc quy trình nội bộ công ty.</DoloresNotice>
  </DoloresPage>;
}

function BuybackDocumentsPage({ initialOverlay }: { initialOverlay?: "issue" }) {
  const [overlay, setOverlay] = useState<"preview" | "confirm" | "success" | "issue" | "issue-success" | null>(initialOverlay ?? null);
  return <>
    <DoloresPage title="Chứng từ thu mua máy cũ" description="Xem chứng từ chuyển tiền và xác nhận đã nhận tiền." actions={<><DoloresButton onClick={() => setOverlay("confirm")}>Xác nhận đã nhận tiền</DoloresButton><DoloresButton onClick={() => setOverlay("preview")} variant="secondary">Xem ảnh chứng từ</DoloresButton><DoloresButton onClick={() => setOverlay("issue")} variant="secondary">Có vấn đề cần trao đổi</DoloresButton></>}>
      <DoloresPanel><DoloresPanelTitle>Thông tin chi tiết</DoloresPanelTitle><DoloresFieldGrid><DoloresField label="Máy tôi bán" value="MB-017 · thuộc sở hữu khách" /><DoloresField label="Hợp đồng thuê đủ điều kiện" value="C-205 · máy thuê C-031" /><DoloresField label="Hợp đồng mua bán" value="MB-2026-017 · ký bên ngoài" /><DoloresField label="Số tiền Dolores chuyển" value="8.000.000 đ" /><DoloresField label="Moderator đã tải" value="CK-MB-017.jpg · 02/10/2026" /><DoloresField label="Trạng thái" value="Chờ khách kiểm tra và xác nhận" /></DoloresFieldGrid></DoloresPanel>
    </DoloresPage>
    {overlay === "preview" && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#302927]/30 p-6" role="presentation"><section aria-modal="true" className="w-full max-w-[580px] rounded-[20px] border border-[#E9E2DC] bg-white p-8 shadow-xl" role="dialog"><p className="text-sm font-semibold leading-[1.45] text-[#292625]">Tài liệu trong hồ sơ</p><h2 className="mt-3 text-[26px] font-semibold leading-[1.45] text-[#292625]">Chứng từ thu mua máy cũ</h2><p className="mt-3 text-base leading-[1.45] text-[#292625]">Tài liệu được lưu để xem và đối chiếu với hồ sơ.</p><div className="mt-5 flex min-h-32 flex-col justify-center gap-3 rounded-xl bg-[#F6EDE7] p-5 text-[#292625]"><p className="text-lg font-semibold">CK-MB-017.jpg</p><p className="text-sm">Bản xem mẫu: chưa có ảnh/PDF gốc được cung cấp trong dữ liệu thiết kế.</p></div><div className="mt-5"><DoloresButton variant="secondary" onClick={() => setOverlay(null)}>Đóng</DoloresButton></div></section></div>}
    {(overlay === "confirm" || overlay === "success") && <CustomerFlowDialog mode={overlay} title={overlay === "confirm" ? "Xác nhận · Chứng từ thu mua máy cũ" : "Đã ghi nhận thành công"} message="Tôi đã kiểm tra chứng từ Moderator tải lên và đã nhận 8.000.000 đ từ Dolores cho máy MB-017." actionLabel="Xác nhận" successHref="/dashboard/buyback/documents/confirmed" successLabel="Về danh sách" onConfirm={() => { writeDemoFlow("MB-2026-017-customer-receipt", "confirmed-demo"); setOverlay("success"); }} onClose={() => setOverlay(null)} />}
    {overlay === "issue" && <CustomerFlowDialog mode="confirm" title="Trao đổi về chứng từ thu mua" message="Thông báo Moderator rằng chứng từ hoặc số tiền mua MB-017 cần được kiểm tra lại. Trạng thái chưa xác nhận nhận tiền." actionLabel="Gửi thông báo cần đối chiếu" confirmActionLabel="Gửi thông báo cần đối chiếu" onClose={() => setOverlay(null)} onConfirm={() => { writeDemoFlow("MB-2026-017-proof-review", "notified-demo"); setOverlay("issue-success"); }} />}
    {overlay === "issue-success" && <CustomerFlowDialog mode="success" title="Đã gửi thông báo cho Moderator" message="Chứng từ mua MB-017 đang chờ kiểm tra lại." actionLabel="Về hồ sơ thu mua" successHref="/dashboard/buyback" successLabel="Về hồ sơ thu mua" onClose={() => setOverlay(null)} />}
  </>;
}

function BuybackReceiptConfirmedPage() {
  return <DoloresPage title="Đã xác nhận chứng từ thu mua" description="Hồ sơ xác nhận đã nhận tiền theo chứng từ mua bán." actions={<><DoloresButton href="/dashboard/buyback">Về hồ sơ thu mua</DoloresButton><DoloresButton href="/dashboard/buyback/documents" variant="secondary">Xem lại chứng từ</DoloresButton></>}>
    <DoloresPanel><DoloresPanelTitle>Kết quả</DoloresPanelTitle><DoloresFieldGrid><DoloresField label="Kết quả" value="Đã xác nhận nhận tiền" /><DoloresField label="Máy đã bán" value="MB-017 · máy thuộc sở hữu khách" /><DoloresField label="Số tiền" value="8.000.000 đ" /><DoloresField label="Chứng từ" value="CK-MB-017.jpg" /><DoloresField label="Lịch sử" value="Khách xác nhận · 02/10/2026" /></DoloresFieldGrid></DoloresPanel>
  </DoloresPage>;
}

function ContractDetailPage({ id }: { id: string }) {
  const standard = id === "C-205";
  return <DoloresPage title={`Chi tiết hợp đồng ${id}`} description={standard ? "Hồ sơ thuê máy thông thường; vị trí theo hợp đồng và lịch sử máy." : "Hồ sơ thuê máy Smart IoT; dữ liệu máy theo trạng thái đồng bộ gần nhất."} actions={<><DoloresButton href={`/dashboard/machines/${standard ? "C-031" : "S-018"}`}>Xem máy trong hợp đồng</DoloresButton><DoloresButton href="/dashboard/contracts" variant="secondary">Về hợp đồng</DoloresButton></>}>
    <DoloresPanel><DoloresPanelTitle>Thông tin hợp đồng</DoloresPanelTitle><DoloresFieldGrid><DoloresField label="Mã hợp đồng" value={id} /><DoloresField label="Máy" value={standard ? "Classic C-031 · Thông thường" : "Smart S-018 · Smart IoT"} /><DoloresField label="Cửa hàng" value="Cà phê Mộc · Quận 3" /><DoloresField label="Thời hạn" value={standard ? "15/05–14/11/2026" : "01/04–31/10/2026"} /><DoloresField label="Phí thuê" value={standard ? "1.500.000 đ / tháng" : "750.000 đ + PAYG"} /><DoloresField label="Trạng thái" value={standard ? "Đang hiệu lực" : "Còn 1 tháng"} /></DoloresFieldGrid></DoloresPanel>
    <DoloresNotice title="Hợp đồng mới">Mỗi máy vật lý có một hợp đồng riêng. Hợp đồng không tự gia hạn; nếu muốn tiếp tục, hãy gửi đề nghị trao đổi.</DoloresNotice>
  </DoloresPage>;
}

function InvoiceActionPage({ kind }: { kind: "first-month" | "shortfall" | "refund" }) {
  const content = {
    "first-month": { title: "Thanh toán tháng đầu tiên", summary: "Hóa đơn thuê máy đầu tiên · C-205", amount: "1.500.000 đ", status: "Chưa thanh toán", action: "Gửi chứng từ chuyển khoản" },
    shortfall: { title: "Cần thanh toán phần còn thiếu", summary: "Hóa đơn 09/2026 · C-204", amount: "1.000.000 đ", status: "Chờ thanh toán đủ", action: "Gửi chứng từ bổ sung" },
    refund: { title: "Theo dõi hoàn tiền thanh toán thừa", summary: "Hóa đơn HD-09-205 · C-204", amount: "200.000 đ", status: "Chờ khách hàng xác nhận và ngân hàng đối chiếu", action: "Về danh sách hóa đơn" },
  }[kind];
  return <DoloresPage title={content.title} description="Theo dõi thông tin và trạng thái chứng từ với Moderator." actions={<><DoloresButton href={kind === "refund" ? "/dashboard/invoices" : "/dashboard/invoices/payment"}>{content.action}</DoloresButton><DoloresButton href="/dashboard/invoices" variant="secondary">Về hóa đơn</DoloresButton></>}>
    <DoloresPanel><DoloresPanelTitle>{content.summary}</DoloresPanelTitle><DoloresFieldGrid><DoloresField label="Số tiền" value={content.amount} /><DoloresField label="Trạng thái" value={content.status} /><DoloresField className="col-span-2" label="Đối chiếu" value="Chuyển khoản được thực hiện ngoài Dolores; Moderator kiểm tra chứng từ và cập nhật kết quả." /></DoloresFieldGrid></DoloresPanel>
    <DoloresNotice title="Trạng thái xử lý">Thông tin minh họa. Gửi chứng từ không đồng nghĩa khoản tiền đã được xác nhận hoặc hoàn tất.</DoloresNotice>
  </DoloresPage>;
}

function CustomerDishPage({ initialView }: { initialView?: string }) {
  const [stage, setStage] = useState<"edit" | "unsupported" | "confirm" | "pending" | "applied">(initialView === "unsupported" ? "unsupported" : "edit");
  const [dish, setDish] = useState("Espresso Mộc");
  const [ingredient, setIngredient] = useState("Cà phê");
  const [coffee, setCoffee] = useState("18");
  const [water, setWater] = useState("60");
  const [ingredientOpen, setIngredientOpen] = useState(false);
  if (stage === "unsupported") return <DoloresPage title="Chưa thể áp dụng món riêng" description="S-018 · Global Menu Dolores v3 đã nhận. Món này chỉ thuộc Cà phê Mộc." actions={<><DoloresButton href="/dashboard/support/menu">Cập nhật menu cần hỗ trợ</DoloresButton><DoloresButton variant="secondary" onClick={() => setStage("edit")}>Chọn lại món</DoloresButton></>}><DoloresPanel><DoloresPanelTitle>Thông tin chi tiết</DoloresPanelTitle><DoloresFieldGrid><DoloresField label="Nguồn menu" value="Global Menu Dolores · v3" /><DoloresField label="Tên món" value={dish} /><DoloresField label="Thành phần" value={`${ingredient} chưa được máy hỗ trợ`} /><DoloresField label="Nước pha" value={`${water} ml`} /></DoloresFieldGrid></DoloresPanel><DoloresNotice title="Máy chưa hỗ trợ cấu hình này" tone="warning">Thành phần được chọn chưa có hỗ trợ đã xác nhận. Món chưa được lưu hoặc gửi lên máy.</DoloresNotice></DoloresPage>;
  if (stage === "pending") return <DoloresPage title="Đang chờ máy xác nhận" description="S-018 · Global Menu Dolores v3 đã nhận. Món này chỉ thuộc Cà phê Mộc." actions={<><DoloresButton onClick={() => { writeDemoFlow("S-018-private-dish", "machine-acknowledged"); setStage("applied"); }}>Mô phỏng xác nhận từ máy</DoloresButton><DoloresButton href="/dashboard/menu" variant="secondary">Về menu của tôi</DoloresButton></>}><DoloresPanel><DoloresPanelTitle>Thông tin chi tiết</DoloresPanelTitle><DoloresFieldGrid><DoloresField label="Nguồn menu" value="Global Menu Dolores · v3" /><DoloresField label="Tên món riêng" value={dish} /><DoloresField label="Thành phần" value={`${ingredient} · ${coffee} g`} /><DoloresField label="Nước pha" value={`${water} ml`} /></DoloresFieldGrid></DoloresPanel><DoloresNotice title="Đã gửi yêu cầu · chưa áp dụng">Menu đang chạy vẫn giữ nguyên cho tới khi máy báo áp dụng thành công.</DoloresNotice></DoloresPage>;
  if (stage === "applied") return <DoloresPage title="Menu của tôi · đã thêm món riêng" description="S-018 · Cà phê Mộc · Global Menu Dolores v3 vẫn là menu nguồn." actions={<DoloresButton href="/dashboard/menu">Về menu của tôi</DoloresButton>}><DoloresPanel><DoloresPanelTitle>Danh sách</DoloresPanelTitle><DoloresTable headers={["Món", "Thành phần bắt buộc", "Định lượng hiện tại", "Thao tác"]} rows={[["Espresso", "Cà phê", "18 g cà phê · 40 ml nước", "Global Menu"], ["Cà phê sữa tươi", "Cà phê + sữa tươi", "18 g cà phê · 120 ml sữa", "Global Menu"], [dish, ingredient, `${coffee} g · ${water} ml nước`, "Đã áp dụng"]]} /></DoloresPanel><DoloresNotice title="Máy đã xác nhận áp dụng">Máy báo đã thêm {dish}. Global Menu Dolores v3 vẫn là menu nguồn. Trạng thái này được mô phỏng trên trình duyệt, không phải phản hồi từ thiết bị thật.</DoloresNotice></DoloresPage>;
  return <>
    <DoloresPage title="Thêm món riêng" description="S-018 · Global Menu Dolores v3 đã nhận. Món này chỉ thuộc Cà phê Mộc." actions={<><DoloresButton onClick={() => setStage(ingredient.includes("siro") ? "unsupported" : "confirm")}>Gửi món riêng tới máy</DoloresButton><DoloresButton variant="secondary" onClick={() => setIngredientOpen(true)}>Thành phần</DoloresButton><DoloresButton href="/dashboard/menu" variant="secondary">Hủy</DoloresButton></>}>
      <DoloresPanel><DoloresPanelTitle>Thông tin chi tiết</DoloresPanelTitle><DoloresFieldGrid><DoloresField label="Nguồn menu" value="Global Menu Dolores · v3" /><DoloresField label="Tên món riêng" required><input className="w-full bg-transparent text-sm outline-none" value={dish} onChange={(event) => setDish(event.target.value)} /></DoloresField><DoloresField label="Thành phần" required><select aria-label="Thành phần" className="bg-transparent text-sm outline-none" value={ingredient} onChange={(event) => setIngredient(event.target.value)}><option>Cà phê</option><option>Cà phê + siro</option></select></DoloresField><DoloresField label="Nước pha" required><span className="flex items-center gap-2"><input aria-label="Nước pha" className="w-20 bg-transparent text-sm outline-none" type="number" value={water} onChange={(event) => setWater(event.target.value)} />ml</span></DoloresField><DoloresField label="Lượng cà phê" required><span className="flex items-center gap-2"><input aria-label="Lượng cà phê" className="w-20 bg-transparent text-sm outline-none" type="number" value={coffee} onChange={(event) => setCoffee(event.target.value)} />g</span></DoloresField></DoloresFieldGrid></DoloresPanel>
      <DoloresNotice title="Khả năng máy: hỗ trợ">Định lượng minh họa, theo thành phần và đơn vị được thể hiện trong Figma.</DoloresNotice>
    </DoloresPage>
    {ingredientOpen && <ConfirmPanel title="Thành phần cho món riêng" message={`${dish} · ${ingredient} · ${coffee} g · ${water} ml nước.`} onCancel={() => setIngredientOpen(false)} onConfirm={() => setIngredientOpen(false)} />}
    {stage === "confirm" && <ConfirmPanel title="Thêm món riêng cho S-018?" message={`${dish} · ${ingredient} · ${coffee} g · ${water} ml nước. Máy cần xác nhận trước khi món xuất hiện như đã áp dụng.`} onCancel={() => setStage("edit")} onConfirm={() => { writeDemoFlow("S-018-private-dish", "pending"); setStage("pending"); }} />}
  </>;
}

type CustomerFormField = { label: string; value: string; type?: "text" | "select" | "file"; required?: boolean; wide?: boolean };

function BasicFormPage({ kind, state }: { kind: string; state?: string }) {
  const [overlay, setOverlay] = useState<"confirm" | "success" | "error" | null>(state === "error" ? "error" : null);
  const [fileSelected, setFileSelected] = useState(false);
  const [fileName, setFileName] = useState("");
  const config: Record<string, {
    title: string; description: string; action: string; cancelLabel: string; back: string;
    fields: CustomerFormField[]; notice?: [string, string]; extra?: "incident"; panelTitle?: string;
    confirmTitle: string; confirmMessage: string; successTitle: string; successMessage: string;
    successHref: string; successAction: string;
    errorMessage?: string; errorLabel?: string; uploadRequired?: boolean; demoKey: string;
  }> = {
    support: {
      title: "Báo sự cố máy", description: "Gửi mô tả sự cố cho Moderator để điều phối Technician hỗ trợ.", action: "Gửi yêu cầu hỗ trợ", cancelLabel: "Hủy", back: "/dashboard/machines",
      fields: [
        { label: "Máy gặp sự cố", value: "S-018 · Smart IoT" }, { label: "Hợp đồng", value: "C-204" },
        { label: "Mô tả hiện tượng", value: "Menu không cập nhật sau khi đồng bộ", wide: true },
        { label: "Thời điểm phát hiện", value: "30/09/2026 · 10:15" }, { label: "Ảnh/video minh họa", value: "Tệp đính kèm (nếu có)", type: "file" },
        { label: "Tình trạng yêu cầu", value: "Đang chờ Moderator" },
      ],
      extra: "incident", panelTitle: "Thông tin báo sự cố", confirmTitle: "Xác nhận · Báo sự cố máy", confirmMessage: "Gửi mô tả lỗi S-018 và ảnh đính kèm cho Moderator. Moderator điều phối Technician và cập nhật tiến trình.",
      successTitle: "Đã ghi nhận thành công", successMessage: "Gửi mô tả lỗi S-018 và ảnh đính kèm cho Moderator. Moderator điều phối Technician và cập nhật tiến trình.",
      successHref: "/dashboard/support", successAction: "Xem yêu cầu và tiến trình", demoKey: "customer-incident",
      errorMessage: "Hồ sơ đang thiếu trường bắt buộc hoặc tài liệu đính kèm. Bổ sung thông tin được đánh dấu rồi gửi lại.",
    },
    payment: {
      title: "Gửi ảnh chứng từ chuyển khoản", description: "Theo dõi thông tin và thực hiện yêu cầu của cửa hàng.", action: "Gửi ảnh để đối chiếu", cancelLabel: "Hủy", back: "/dashboard/invoices",
      fields: [
        { label: "Hóa đơn", value: "HD-09-204" }, { label: "Số tiền đã chuyển", value: "1.000.000 đ", required: true },
        { label: "Ngày chuyển khoản", value: "02/10/2026", required: true }, { label: "Nội dung chuyển khoản", value: "C-204 thanh toán bổ sung" },
        { label: "Ảnh chứng từ", value: "Chọn ảnh / tài liệu", type: "file", wide: true },
      ],
      notice: ["Chuyển khoản ngoài Dolores", "Moderator sẽ đối chiếu với tài khoản ngân hàng công ty. Gửi ảnh chưa có nghĩa hóa đơn đã được xác nhận thanh toán."],
      confirmTitle: "Xác nhận · Gửi ảnh chứng từ chuyển khoản", confirmMessage: "Gửi ảnh chuyển khoản bổ sung 1.000.000 đ. Hóa đơn sẽ chờ Moderator đối chiếu với ngân hàng công ty.",
      successTitle: "Đã gửi chứng từ · chờ đối chiếu", successMessage: "Gửi ảnh chuyển khoản bổ sung 1.000.000 đ. Hóa đơn sẽ chờ Moderator đối chiếu với ngân hàng công ty.",
      successHref: "/dashboard/invoices/2026-09", successAction: "Xem hóa đơn", demoKey: "customer-invoice-proof",
      errorMessage: "Chưa có ảnh chứng từ hợp lệ. Chọn lại ảnh giao dịch trước khi gửi.", uploadRequired: true,
    },
    "standard-payment": {
      title: "Gửi chứng từ thuê máy thường", description: "Theo dõi thông tin và thực hiện yêu cầu của cửa hàng.", action: "Gửi ảnh để đối chiếu", cancelLabel: "Hủy", back: "/dashboard/invoices/standard",
      fields: [
        { label: "Hóa đơn", value: "HD-09-204" }, { label: "Số tiền đã chuyển", value: "1.000.000 đ", required: true },
        { label: "Ngày chuyển khoản", value: "02/10/2026", required: true }, { label: "Nội dung chuyển khoản", value: "C-204 thanh toán bổ sung" },
        { label: "Ảnh chứng từ", value: "Chọn ảnh / tài liệu", type: "file", wide: true },
      ],
      notice: ["Chuyển khoản ngoài Dolores", "Moderator sẽ đối chiếu với tài khoản ngân hàng công ty. Gửi ảnh chưa có nghĩa hóa đơn đã được xác nhận thanh toán."],
      confirmTitle: "Xác nhận · Gửi ảnh chứng từ chuyển khoản", confirmMessage: "Gửi ảnh chuyển khoản bổ sung 1.000.000 đ. Hóa đơn sẽ chờ Moderator đối chiếu với ngân hàng công ty.",
      successTitle: "Đã gửi chứng từ · chờ đối chiếu", successMessage: "Gửi ảnh chuyển khoản bổ sung 1.000.000 đ. Hóa đơn sẽ chờ Moderator đối chiếu với ngân hàng công ty.",
      successHref: "/dashboard/invoices/standard", successAction: "Xem hóa đơn", demoKey: "customer-standard-invoice-proof",
      errorMessage: "Chưa có ảnh chứng từ hợp lệ. Chọn lại ảnh giao dịch trước khi gửi.", uploadRequired: true,
    },
    "contract-request": {
      title: "Trao đổi hợp đồng thuê mới", description: "Gửi nhu cầu thuê mới để Moderator trao đổi loại máy và điều khoản.", action: "Gửi nhu cầu thuê mới", cancelLabel: "Về hợp đồng", back: "/dashboard/contracts",
      fields: [{ label: "Hợp đồng hiện tại", value: "C-204 · hết hạn 31/10/2026" }, { label: "Nhu cầu máy mới", value: "Smart IoT", type: "select" }, { label: "Thời gian mong muốn", value: "Từ tháng 11/2026" }, { label: "Ghi chú", value: "Trao đổi loại máy và điều khoản", wide: true }],
      notice: ["Hợp đồng mới độc lập", "Hợp đồng C-204 cũ vẫn kết thúc theo quy trình, không tự gia hạn."],
      confirmTitle: "Xác nhận · Trao đổi hợp đồng thuê mới", confirmMessage: "Gửi nhu cầu ký hợp đồng mới. Hợp đồng C-204 cũ vẫn kết thúc theo quy trình, không tự gia hạn.",
      successTitle: "Đã ghi nhận thành công", successMessage: "Gửi nhu cầu ký hợp đồng mới. Hợp đồng C-204 cũ vẫn kết thúc theo quy trình, không tự gia hạn.",
      successHref: "/dashboard/contracts", successAction: "Xem hồ sơ hợp đồng", demoKey: "customer-contract-request",
    },
    "early-termination": {
      title: "Đề nghị kết thúc hợp đồng sớm", description: "Gửi đề nghị dừng hợp đồng để Moderator xử lý theo điều khoản.", action: "Gửi đề nghị cho Moderator", cancelLabel: "Hủy", back: "/dashboard/contracts/C-204",
      fields: [{ label: "Hợp đồng", value: "C-204" }, { label: "Ngày đề nghị dừng", value: "15/10/2026" }, { label: "Lý do", value: "Cửa hàng ngừng sử dụng máy" }],
      notice: ["Các khoản tháng cuối", "Tiền thuê cơ bản vẫn tính đủ tháng kết thúc; phí số ly chỉ tính trong thời gian sử dụng đến khi dừng. Thu hồi và đánh giá máy trước quyết toán cọc."],
      confirmTitle: "Xác nhận · Đề nghị kết thúc hợp đồng sớm", confirmMessage: "Gửi đề nghị dừng ngày 15/10/2026. Tiền thuê cơ bản tính đủ tháng; phí theo ly tính trong thời gian thuê đến khi dừng.",
      successTitle: "Đã ghi nhận thành công", successMessage: "Gửi đề nghị dừng ngày 15/10/2026. Tiền thuê cơ bản tính đủ tháng; phí theo ly tính trong thời gian thuê đến khi dừng.",
      successHref: "/dashboard/contracts/end", successAction: "Xem hồ sơ hoàn cọc", demoKey: "customer-contract-end-request",
    },
    "buyback-new": {
      title: "Gửi đề nghị bán máy của tôi", description: "Theo dõi thông tin và thực hiện yêu cầu của cửa hàng.", action: "Gửi đề nghị thu mua", cancelLabel: "Về hồ sơ thu mua", back: "/dashboard/buyback",
      fields: [{ label: "Khách hàng", value: "Nguyễn Minh Anh" }, { label: "Hợp đồng thuê đang hiệu lực", value: "C-205 · chứng minh điều kiện dịch vụ" }, { label: "Máy thuộc sở hữu của tôi", value: "MB-017 · máy pha cà phê thường", required: true }, { label: "Số serial / mô tả máy", value: "OWN-017", required: true }, { label: "Mô tả tình trạng", value: "Đang hoạt động" }, { label: "Địa điểm máy", value: "Cà phê Mộc · Quận 3" }, { label: "Ảnh máy / tài liệu", value: "Chọn ảnh / tài liệu", type: "file", wide: true }],
      notice: ["Máy đề nghị thu mua", "Đây là máy thuộc sở hữu của bạn. Máy C-031 đang thuê của Dolores chỉ dùng để đối chiếu hợp đồng đủ điều kiện."],
      confirmTitle: "Xác nhận · Gửi đề nghị bán máy của tôi", confirmMessage: "Gửi đề nghị bán máy MB-017 thuộc sở hữu của tôi. Hợp đồng đang thuê C-205 chỉ chứng minh điều kiện dịch vụ.",
      successTitle: "Đã ghi nhận thành công", successMessage: "Gửi đề nghị bán máy MB-017 thuộc sở hữu của tôi. Hợp đồng đang thuê C-205 chỉ chứng minh điều kiện dịch vụ.",
      successHref: "/dashboard/buyback", successAction: "Về danh sách", demoKey: "customer-buyback-request",
    },
  };
  const current = config[kind] ?? config.support;
  const submit = () => {
    if (kind === "payment" && current.uploadRequired && !fileSelected) { setOverlay("error"); return; }
    setOverlay("confirm");
  };
  const success = () => {
    writeDemoFlow(current.demoKey, "submitted-demo");
    setOverlay("success");
  };
  return <>
    <DoloresPage title={current.title} description={current.description} actions={<><DoloresButton onClick={submit}>{current.action}</DoloresButton><DoloresButton href={current.back} variant="secondary">{current.cancelLabel}</DoloresButton></>}>
      {current.extra === "incident" && <DoloresNotice title="Bước hiện tại: Gửi báo cáo">1. Chọn máy → 2. Mô tả lỗi → 3. Gửi báo cáo → 4. Theo dõi xử lý</DoloresNotice>}
      <DoloresPanel><DoloresPanelTitle>{current.panelTitle ?? "Thông tin chi tiết"}</DoloresPanelTitle><DoloresFieldGrid>{current.fields.map((field) => field.type === "file" ?
        <label key={field.label} className={`relative flex ${field.wide ? "col-span-2" : ""} min-h-[48px] cursor-pointer flex-col items-center justify-center gap-2 rounded-[10px] border border-[#E9E2DC] bg-[#F8F6F3] px-4 py-3 text-center`}><span className="text-sm text-[#302927]">{fileName || "Chọn ảnh / tài liệu"}</span><span className="text-xs text-[#706561]">{fileName ? "Tệp được chọn trong phiên frontend" : "Tệp minh họa trong prototype"}</span><input accept="image/*,.pdf,.mp4" aria-label={field.label} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" onChange={(event) => { const chosen = event.target.files?.[0]; setFileSelected(Boolean(chosen)); setFileName(chosen?.name ?? ""); }} type="file" />
        </label> : <DoloresField key={field.label} label={field.label} required={field.required} className={field.wide ? "col-span-2" : ""}>
          {field.type === "select" ? <select aria-label={field.label} className="w-full bg-transparent text-sm outline-none" defaultValue={field.value}><option>{field.value}</option><option>Máy thông thường</option></select>
            : <input aria-label={field.label} className="w-full bg-transparent text-sm outline-none" defaultValue={field.value} readOnly />}
        </DoloresField>)}</DoloresFieldGrid></DoloresPanel>
      {current.extra === "incident" && <DoloresPanel><DoloresPanelTitle>Luồng xử lý</DoloresPanelTitle><DoloresFieldGrid><DoloresField label="1" value="Khách báo Moderator" /><DoloresField label="2" value="Moderator điều phối Tech" /><DoloresField label="3" value="Sửa chữa / linh kiện" /><DoloresField label="4" value="Thỏa thuận sửa chữa" /></DoloresFieldGrid><DoloresNotice title="Lưu lịch sử & giá">Phí, sửa chữa và thay linh kiện áp dụng theo hợp đồng. Dolores lưu hồ sơ, máy, lịch sử, linh kiện và chi phí để theo dõi.</DoloresNotice></DoloresPanel>}
      {current.notice && <DoloresNotice title={current.notice[0]}>{current.notice[1]}</DoloresNotice>}
    </DoloresPage>
    {overlay && <CustomerFlowDialog mode={overlay} title={overlay === "error" ? "Chưa thể gửi thông tin" : overlay === "success" ? current.successTitle : current.confirmTitle} message={overlay === "error" ? current.errorMessage ?? "Hồ sơ đang thiếu trường bắt buộc. Bổ sung thông tin được đánh dấu rồi gửi lại." : overlay === "success" ? current.successMessage : current.confirmMessage} actionLabel={overlay === "confirm" ? "Xác nhận" : current.successAction} successHref={overlay === "success" ? current.successHref : undefined} successLabel={current.successAction} errorLabel={current.errorLabel} onConfirm={overlay === "confirm" ? success : undefined} onClose={() => setOverlay(null)} />}
  </>;
}

export function CustomerSectionPage({ sections, view, state }: { sections: string[]; view?: string; state?: string }) {
  const path = sections.join("/");
  if (path === "contracts") return <ContractsPage />;
  if (path === "contracts/C-204") return <ContractDetailPage id="C-204" />;
  if (path === "contracts/C-205") return <ContractDetailPage id="C-205" />;
  if (path === "contracts/new") return <BasicFormPage kind="contract-request" />;
  if (path === "contracts/expiry") return <CustomerExpiryPage />;
  if (path === "contracts/end-early") return <BasicFormPage kind="early-termination" />;
  if (path === "contracts/end") return <DoloresPage title="Kết thúc hợp đồng & hoàn cọc" description="Theo dõi thông tin và thực hiện yêu cầu của cửa hàng." actions={<><DoloresButton href="/dashboard/contracts/deposit-complete">Xem hoàn cọc đã thực hiện</DoloresButton><DoloresButton href="/dashboard/contracts" variant="secondary">Xem hợp đồng</DoloresButton></>}><DoloresNotice title="Bước hiện tại: Moderator quyết toán">Hợp đồng kết thúc sau khi thu hồi, đánh giá máy và đối chiếu theo thỏa thuận.</DoloresNotice><DoloresPanel><DoloresPanelTitle>Thông tin chi tiết</DoloresPanelTitle><DoloresFieldGrid><DoloresField label="Hợp đồng / máy" value="C-204 / S-018" /><DoloresField label="Ngày dừng thuê" value="31/10/2026" /><DoloresField label="Tiền cọc" value="10.000.000 đ" /><DoloresField label="Kết quả Technician" value="Đã thu hồi; hư hại theo biên bản" /><DoloresField label="Khấu trừ theo hợp đồng" value="2.000.000 đ" /><DoloresField label="Cọc còn hoàn" value="8.000.000 đ" /><DoloresField label="Thông báo / hạn hoàn" value="01/11/2026 / 12/11/2026" /></DoloresFieldGrid></DoloresPanel></DoloresPage>;
  if (path === "contracts/deposit-complete") return <DoloresPage title="Hoàn cọc đã hoàn tất" description="Theo dõi thông tin và thực hiện yêu cầu của cửa hàng." actions={<><DoloresButton onClick={() => window.print()}>Xem chứng từ hoàn cọc</DoloresButton><DoloresButton href="/dashboard/contracts/end" variant="secondary">Xem quyết toán</DoloresButton></>}><DoloresPanel><DoloresPanelTitle>Thông tin chi tiết</DoloresPanelTitle><DoloresFieldGrid><DoloresField label="Hợp đồng / máy" value="C-204 / S-018" /><DoloresField label="Tech thu hồi & đánh giá" value="Đã hoàn tất" /><DoloresField label="Cọc giữ / khấu trừ" value="10.000.000 đ / 2.000.000 đ" /><DoloresField label="Số tiền đã hoàn" value="8.000.000 đ" /><DoloresField label="Ngày hoàn" value="03/11/2026" /><DoloresField label="Chứng từ" value="HOAN-COC-C204.jpg" /></DoloresFieldGrid></DoloresPanel><DoloresNotice title="Dữ liệu minh họa">Không có khoản hoàn tiền thật nào được thực hiện bởi giao diện frontend.</DoloresNotice></DoloresPage>;
  if (path === "machines") return <MachinesPage />;
  if (path === "machines/substitute" || path === "machines/S-022") return <CustomerReplacementPage />;
  if (path === "machines/history") return <CustomerMachineHistoryPage />;
  if (path.startsWith("machines/")) return <MachineDetailPage id={sections[1]} state={state} />;
  if (path === "invoices") return <InvoicesPage />;
  if (path === "invoices/reminder") return <CustomerInvoiceReminderPage />;
  if (path === "invoices/payment") return <BasicFormPage kind="payment" state={state} />;
  if (path === "invoices/standard") return <StandardInvoiceDetailPage />;
  if (path === "invoices/standard-payment") return <BasicFormPage kind="standard-payment" state={state} />;
  if (path === "invoices/shortfall") return <InvoiceActionPage kind="shortfall" />;
  if (path === "invoices/refund") return <InvoiceActionPage kind="refund" />;
  if (path === "invoices/2026-08") return <InvoiceActionPage kind="first-month" />;
  if (path === "invoices/2026-09") return <InvoiceDetailPage />;
  if (path.startsWith("invoices/")) return <InvoiceDetailPage />;
  if (path === "menu") return <MenuPage />;
  if (path === "menu/espresso") return <MenuEditPage freshMilk={false} initialCoffee={state === "20g" || state === "both" ? "20" : "18"} initialWater={state === "60" || state === "both" ? "60" : "40"} />;
  if (path === "menu/fresh-milk") return <MenuEditPage freshMilk initialCoffee={state === "20g" ? "20" : "18"} initialMilk={state === "missing" ? "" : state === "150" ? "150" : "120"} initialError={state === "missing"} />;
  if (path === "menu/add-dish") return <CustomerDishPage initialView={view} />;
  if (path === "menu/sent") return <MenuEditPage freshMilk={false} initialStage="pending" />;
  if (path === "support") return <CustomerSupportList />;
  if (path === "support/new") return <BasicFormPage kind="support" state={state} />;
  if (path === "support/menu") return <CustomerMenuSupportPage />;
  if (path.startsWith("support/YC-")) return <CustomerSupportProgress id={sections[1]} />;
  if (path === "buyback") return <BuybackOverviewPage />;
  if (path === "buyback/new") return <BasicFormPage kind="buyback-new" state={state} />;
  if (path === "buyback/documents") return <BuybackDocumentsPage />;
  if (path === "buyback/documents/confirmed") return <BuybackReceiptConfirmedPage />;
  if (path === "buyback/issue") return <BuybackDocumentsPage initialOverlay="issue" />;
  if (path === "notifications") return <DoloresPage title="Thông báo & nhắc nhở" description="Theo dõi hóa đơn, hợp đồng và máy của cửa hàng." actions={<><DoloresButton href="/dashboard">Về tổng quan</DoloresButton><DoloresButton href="/dashboard/notifications?view=unread" variant="secondary">Chưa đọc</DoloresButton></>}><DoloresPanel><DoloresPanelTitle>{view === "unread" ? "Thông báo chưa đọc" : "Danh sách thông báo"}</DoloresPanelTitle><DoloresTable headers={["Nội dung", "Liên quan", "Ngày", "Trạng thái"]} rows={[[<a className="font-semibold hover:text-[#B81724]" href="/dashboard/invoices/2026-09" key="invoice">Hóa đơn tháng 09 ›</a>, "C-204 · 2.750.000 đ", "08/10/2026", "Chưa đọc"], [<a className="font-semibold hover:text-[#B81724]" href="/dashboard/contracts/C-204" key="expiry">Hợp đồng sắp hết hạn ›</a>, "C-204 · S-018", "01/10/2026", "Cần xử lý"]]} /></DoloresPanel></DoloresPage>;
  if (path === "menu/applied") return <MenuEditPage freshMilk={false} initialStage="pending" />;
  return <DoloresPage title="Không tìm thấy màn hình" description={`Đường dẫn /dashboard/${path} chưa được ánh xạ tới một frame Figma.`} actions={<DoloresButton href="/dashboard">Về tổng quan</DoloresButton>}><DoloresNotice title="Không có màn tương ứng">Chọn một mục trong menu bên trái để tiếp tục.</DoloresNotice></DoloresPage>;
}
