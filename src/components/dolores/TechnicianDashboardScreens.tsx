"use client";

import { useState } from "react";
import { DoloresPage } from "@/components/dolores/DoloresShell";
import {
  DoloresButton,
  DoloresField,
  DoloresFieldGrid,
  DoloresMetric,
  DoloresNotice,
  DoloresPanel,
  DoloresPanelTitle,
  DoloresTable,
} from "@/components/dolores/DoloresUI";
import { writeDemoFlow } from "@/components/dolores/demoFlowStore";

type JobKind = "standard-handover" | "smart-activation" | "repair" | "retrieval" | "substitute" | "substitute-return" | "refurbishment" | "buyback-assessment" | "maintenance-history";
type Overlay = "confirm" | "success" | null;

const JOBS: Record<JobKind, { title: string; description: string; submit: string; recordKey: string; confirmMessage: string; successMessage: string; successActionLabel: string; successHref: string; secondaryActionLabel?: string; secondaryHref?: string }> = {
  "standard-handover": { title: "Bàn giao máy thường", description: "Ghi nhận bàn giao máy và menu Dolores được cấp kèm. Máy thường không có cập nhật menu từ xa hoặc telemetry.", submit: "Xác nhận đã bàn giao", recordKey: "C-205", confirmMessage: "Ghi nhận máy thường đã được lắp đặt, bàn giao đúng địa điểm hợp đồng. Gửi kết quả về Moderator.", successMessage: "Ghi nhận máy thường đã được lắp đặt, bàn giao đúng địa điểm hợp đồng. Gửi kết quả về Moderator.", successActionLabel: "Xem yêu cầu và tiến trình", successHref: "/technician/tasks" },
  "smart-activation": { title: "Lắp đặt & kích hoạt Smart IoT", description: "Máy cho thuê phải có Global Menu Dolores. Kiểm tra máy đã nhận và áp dụng menu trước khi hoàn tất bàn giao.", submit: "Gửi kết quả kích hoạt", recordKey: "S-018", confirmMessage: "Xác nhận máy đã nhận và áp dụng Global Menu Dolores; gửi kết quả lắp đặt, kết nối và GPS cho Moderator.", successMessage: "Gửi kết quả lắp đặt Smart IoT, kết nối, vị trí GPS và trạng thái kích hoạt cho Moderator.", successActionLabel: "Xem yêu cầu và tiến trình", successHref: "/technician/tasks" },
  repair: { title: "Sửa chữa & thay linh kiện", description: "Ghi lại việc đã làm, linh kiện và giá theo thỏa thuận hợp đồng để lưu lịch sử máy.", submit: "Gửi kết quả sửa chữa", recordKey: "CF-STD-026", confirmMessage: "Lưu công việc sửa chữa, linh kiện đã thay, số lượng và giá theo hợp đồng; gửi kết quả về Moderator.", successMessage: "Lưu công việc sửa chữa, linh kiện đã thay, số lượng và giá theo hợp đồng; gửi kết quả về Moderator.", successActionLabel: "Xem lịch sử đã ghi nhận", successHref: "/technician/history/S-018" },
  retrieval: { title: "Thu hồi & ghi nhận tình trạng", description: "Technician thu hồi máy trước khi Moderator quyết toán tiền cọc.", submit: "Gửi kết quả thu hồi / đánh giá", recordKey: "YC-017", confirmMessage: "Xác nhận máy đã thu hồi và tình trạng đã được đánh giá. Gửi kết quả để Moderator quyết toán sau bước này.", successMessage: "Xác nhận máy đã thu hồi và tình trạng đã được đánh giá. Gửi kết quả để Moderator quyết toán sau bước này.", successActionLabel: "Xem lịch sử đã ghi nhận", successHref: "/technician/history/S-018" },
  substitute: { title: "Bàn giao máy thay thế tạm thời", description: "Ghi máy thay tạm vào hợp đồng chính, cùng loại máy và không tạo hợp đồng mới.", submit: "Ghi nhận bàn giao máy thay", recordKey: "C-204", confirmMessage: "Ghi nhận bàn giao máy thay cùng loại vào hợp đồng chính. Số ly Smart trong khoảng dùng máy thay thuộc hợp đồng chính.", successMessage: "Ghi nhận bàn giao máy thay cùng loại vào hợp đồng chính. Số ly Smart trong khoảng dùng máy thay thuộc hợp đồng chính.", successActionLabel: "Về danh sách", successHref: "/technician/tasks/substitute", secondaryActionLabel: "Ghi nhận trả máy thay", secondaryHref: "/technician/tasks/substitute-return" },
  "substitute-return": { title: "Ghi nhận trả máy thay thế", description: "Theo dõi hồ sơ và xử lý công việc trong phạm vi được giao.", submit: "Gửi kết quả trả máy thay", recordKey: "S-022", confirmMessage: "Kết thúc khoảng dùng S-022 lúc 17:00 ngày 12/09. 160 ly trong khoảng gắn tạm thuộc C-204.", successMessage: "Kết thúc khoảng dùng S-022 lúc 17:00 ngày 12/09. 160 ly trong khoảng gắn tạm thuộc C-204.", successActionLabel: "Xem lịch sử đã ghi nhận", successHref: "/technician/history", secondaryActionLabel: "Về máy thay thế", secondaryHref: "/technician/tasks/substitute" },
  refurbishment: { title: "Máy thu mua · tân trang & kiểm thử", description: "Sau khi Moderator xác nhận hồ sơ mua và thanh toán, Technician thu hồi rồi tân trang/kiểm thử.", submit: "Báo tân trang & kiểm thử đạt", recordKey: "MB-017", confirmMessage: "MB-017 đã tân trang và kiểm thử đạt. Báo Moderator để cập nhật sẵn sàng cho thuê.", successMessage: "MB-017 đã tân trang và kiểm thử đạt. Báo Moderator để cập nhật sẵn sàng cho thuê.", successActionLabel: "Xem yêu cầu và tiến trình", successHref: "/technician/tasks" },
  "buyback-assessment": { title: "Đánh giá máy khách đề nghị bán", description: "Theo dõi hồ sơ và xử lý công việc trong phạm vi được giao.", submit: "Gửi kết quả cho Moderator", recordKey: "MB-2026-017-assessment", confirmMessage: "Gửi kết quả đánh giá MB-017 và giá đề xuất 7.500.000 đ cho Moderator trước khi thương lượng.", successMessage: "Gửi kết quả đánh giá MB-017 và giá đề xuất 7.500.000 đ cho Moderator trước khi thương lượng.", successActionLabel: "Xem yêu cầu và tiến trình", successHref: "/technician/tasks", secondaryActionLabel: "Về công việc", secondaryHref: "/technician/tasks" },
  "maintenance-history": { title: "Ghi nhận lịch sử bảo trì", description: "Theo dõi hồ sơ và xử lý công việc trong phạm vi được giao.", submit: "Lưu lịch sử", recordKey: "S-018", confirmMessage: "Lưu lịch sử bảo trì S-018 ngày 10/07/2026, nội dung thực hiện và kết quả.", successMessage: "Lưu lịch sử bảo trì S-018 ngày 10/07/2026, nội dung thực hiện và kết quả.", successActionLabel: "Xem lịch sử đã ghi nhận", successHref: "/technician/history", secondaryActionLabel: "Về lịch sử máy", secondaryHref: "/technician/history" },
};

function Dialog({ success, title, message, successActionLabel, successHref, onConfirm, onClose }: { success: boolean; title: string; message: string; successActionLabel: string; successHref: string; onConfirm: () => void; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#302927]/25 px-6" role="dialog" aria-modal="true" aria-labelledby="technician-dialog-title"><section className="w-full max-w-[580px] rounded-[20px] bg-white p-8 shadow-xl"><p className="text-[11px] font-medium leading-4 text-[#706561]">{success ? "✓  Đã hoàn tất" : "Kiểm tra trước khi tiếp tục"}</p><h2 id="technician-dialog-title" className="mt-3 text-xl font-semibold leading-7">{title}</h2><p className="mt-3 text-sm leading-6 text-[#706561]">{message}</p><div className="mt-5 grid gap-5">{success ? <DoloresButton href={successHref}>{successActionLabel}</DoloresButton> : <><DoloresButton onClick={onConfirm}>Xác nhận</DoloresButton><DoloresButton variant="secondary" onClick={onClose}>Đóng</DoloresButton></>}</div></section></div>;
}

function Timeline({ steps, current }: { steps: string[]; current: number }) {
  return <DoloresNotice title={`Bước hiện tại: ${steps[current]}`}><div className="flex flex-wrap gap-x-3 gap-y-1">{steps.map((step, index) => <span key={step} className={index === current ? "font-semibold" : ""}>{index + 1}. {step}{index < steps.length - 1 ? " →" : ""}</span>)}</div></DoloresNotice>;
}

function TaskList() {
  const [filter, setFilter] = useState("Tất cả");
  const rows = [
    [<a className="font-semibold hover:text-[#B81724]" href="/technician/tasks/standard-handover" key="handover">Lắp đặt máy thường ›</a>, "C-031 · C-205", "Cà phê Mộc", "Đang thực hiện", <a href="/technician/tasks/standard-handover" key="record">Ghi nhận bàn giao</a>],
    [<a className="font-semibold hover:text-[#B81724]" href="/technician/tasks/smart-activation" key="smart">Kích hoạt Smart IoT ›</a>, "S-018 · C-204", "Cà phê Mộc", "Chờ liên kết", <a href="/technician/tasks/smart-activation" key="activation">Ghi nhận kích hoạt</a>],
    [<a className="font-semibold hover:text-[#B81724]" href="/technician/tasks/repair" key="repair">Sửa chữa ›</a>, "CF-STD-026 · DL-R-0043", "Góc Phố", "Đã điều phối", <a href="/technician/tasks/repair" key="repair-form">Lưu linh kiện/chi phí</a>],
    [<a className="font-semibold hover:text-[#B81724]" href="/technician/tasks/retrieval" key="retrieval">Thu hồi máy ›</a>, "S-018 · C-204", "Cà phê Mộc", "Chờ thu hồi", <a href="/technician/tasks/retrieval" key="assess">Đánh giá tình trạng</a>],
    [<a className="font-semibold hover:text-[#B81724]" href="/technician/tasks/refurbishment" key="refurbish">Tân trang sau thu mua ›</a>, "MB-017 · hồ sơ mua cũ", "Cà phê Mộc", "Chờ kiểm thử", <a href="/technician/tasks/refurbishment" key="test">Ghi nhận hoàn tất</a>],
  ];
  const filtered = filter === "Giao máy" ? rows.slice(0, 2) : filter === "Sửa chữa" ? rows.slice(2, 3) : filter === "Thu hồi" ? rows.slice(3, 4) : rows;
  return <DoloresPage title="Việc được giao" description="Danh sách yêu cầu được Moderator điều phối; Dolores theo dõi việc đã giao." actions={<DoloresButton href="/technician/tasks/YC-017">Mở YC-017</DoloresButton>}>
    <div className="flex gap-3">{["Tất cả", "Giao máy", "Sửa chữa", "Thu hồi"].map((item) => <DoloresButton key={item} variant={filter === item ? "primary" : "secondary"} onClick={() => setFilter(item)}>{item}</DoloresButton>)}</div>
    <DoloresPanel><DoloresPanelTitle>Công việc đang theo dõi</DoloresPanelTitle><p className="-mt-2 mb-3 text-sm text-[#706561]">Dữ liệu minh họa · không phải lịch bảo trì tự động</p><DoloresTable headers={["Loại việc", "Máy / hợp đồng", "Khách hàng", "Trạng thái", "Ghi nhận"]} rows={filtered} /></DoloresPanel>
  </DoloresPage>;
}

function TaskDetail() {
  const [typeOpen, setTypeOpen] = useState(false);
  const [overlay, setOverlay] = useState<Overlay>(null);
  return <>
    <DoloresPage title="Chi tiết yêu cầu YC-017" description="Theo dõi hồ sơ và xử lý công việc trong phạm vi được giao." actions={<><DoloresButton onClick={() => setOverlay("confirm")}>Ghi nhận đang thực hiện</DoloresButton><DoloresButton href="/technician/tasks/retrieval" variant="secondary">Nhập kết quả thu hồi</DoloresButton><DoloresButton onClick={() => setTypeOpen(true)} variant="secondary">Chọn biểu mẫu công việc</DoloresButton></>}>
      <DoloresPanel><DoloresPanelTitle>Thông tin chi tiết</DoloresPanelTitle><DoloresFieldGrid><DoloresField label="Moderator giao" value="Lan Anh · 01/11/2026" /><DoloresField label="Công việc" value="Thu hồi & đánh giá máy" /><DoloresField label="Máy / hợp đồng" value="S-018 / C-204" /><DoloresField label="Khách hàng / địa điểm" value="Nguyễn Minh Anh · Cà phê Mộc, Quận 3" /><DoloresField label="Nội dung" value="Thu hồi máy và gửi tình trạng cho Moderator" /><DoloresField label="Trạng thái" value="Được giao" /></DoloresFieldGrid></DoloresPanel>
    </DoloresPage>
    {overlay && <Dialog success={overlay === "success"} title={overlay === "success" ? "Đã ghi nhận thành công" : "Xác nhận · Chi tiết yêu cầu YC-017"} message="Ghi nhận YC-017 đang thực hiện. Tiếp theo nhập kết quả thu hồi và tình trạng máy." successActionLabel="Về danh sách" successHref="/technician/tasks/retrieval" onConfirm={() => { writeDemoFlow("YC-017", "in-progress-demo"); setOverlay("success"); }} onClose={() => setOverlay(null)} />}
    {typeOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#302927]/25 px-6" role="dialog" aria-modal="true" aria-labelledby="job-type-title"><section className="w-full max-w-[580px] rounded-[20px] bg-white p-8 shadow-xl"><p className="text-[11px] font-medium leading-4 text-[#706561]">Kiểm tra trước khi tiếp tục</p><h2 id="job-type-title" className="mt-3 text-xl font-semibold leading-7">Mở biểu mẫu theo công việc</h2><p className="mt-3 text-sm leading-6 text-[#706561]">Chọn loại yêu cầu đã được Moderator giao.</p><div className="mt-5 grid gap-3">{([["standard-handover", "Bàn giao máy thường"], ["smart-activation", "Kích hoạt Smart IoT"], ["repair", "Sửa chữa / linh kiện"], ["retrieval", "Thu hồi & đánh giá"], ["substitute", "Máy thay thế"], ["buyback-assessment", "Đánh giá máy mua cũ"], ["refurbishment", "Tân trang & kiểm thử máy mua"]] as [JobKind, string][]).map(([kind, label], index) => <DoloresButton key={kind} variant={index === 0 ? "primary" : "secondary"} href={`/technician/tasks/${kind}`}>{label}</DoloresButton>)}<DoloresButton variant="secondary" onClick={() => setTypeOpen(false)}>Đóng</DoloresButton></div></section></div>}
  </>;
}

function JobForm({ kind }: { kind: JobKind }) {
  const config = JOBS[kind];
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [damage, setDamage] = useState(true);
  const isSmart = kind === "smart-activation";
  const isHandover = kind === "standard-handover";
  const isRepair = kind === "repair";
  const isMaintenance = kind === "maintenance-history";
  const isRetrieval = kind === "retrieval";
  const isSubstitute = kind === "substitute";
  const isSubstituteReturn = kind === "substitute-return";
  const isRefurbishment = kind === "refurbishment";
  const isBuybackAssessment = kind === "buyback-assessment";
  const submit = () => {
    const nextValue = kind === "retrieval" ? "retrieved-assessed" : kind === "refurbishment" ? "refurbished-tested" : "completed";
    writeDemoFlow(config.recordKey, nextValue);
    if (kind === "retrieval") writeDemoFlow("YC-017", nextValue);
    setOverlay("success");
  };

  const fields = isHandover ? [
    ["Máy", "C-031 · máy thường"], ["Hợp đồng", "C-205"], ["Tenant / cửa hàng", "Nguyễn Minh Anh · Cà phê Mộc"], ["Địa điểm hợp đồng", "Quận 3, TP. HCM"], ["Lắp đặt", "Đã hoàn tất"], ["Bàn giao", "Ghi nhận ngày / trạng thái"],
  ] : isSmart ? [
    ["Máy Smart IoT", "S-018"], ["Hợp đồng", "C-204"], ["Tenant / cửa hàng", "Nguyễn Minh Anh · Cà phê Mộc"], ["Địa điểm hợp đồng", "Quận 3, TP. HCM"], ["Hạ tầng mạng", "Theo điều kiện công ty"], ["GPS", "Vị trí thiết bị Smart IoT"],
  ] : isRetrieval ? [
    ["Khách hàng / hợp đồng", "Nguyễn Minh Anh · C-204"], ["Máy thu hồi", "S-018 · Smart IoT"], ["Đã thu hồi", "Có · 01/11/2026"], ["Hư hỏng", damage ? "Có · hư hại vỏ" : "Không ghi nhận"], ["Ghi chú tình trạng", "Đã thu hồi; ảnh tình trạng đính kèm"], ["Thông báo", "Gửi kết quả cho Moderator"],
  ] : isSubstitute ? [
    ["Hợp đồng chính", "C-204"], ["Máy chính", "S-018 · Smart IoT"], ["Máy thay thế", "S-022 · Smart IoT"], ["Loại máy", "Smart IoT → Smart IoT"], ["Hợp đồng mới", "Không tạo"], ["Kho Smart IoT còn", "11 máy · số lượng minh họa"],
  ] : isSubstituteReturn ? [
    ["Hợp đồng chính", "C-204"], ["Máy chính đã hoạt động lại", "S-018 · Smart IoT"], ["Máy thay thu về", "S-022 · Smart IoT"], ["Bắt đầu dùng máy thay", "10/09/2026 · 09:00"], ["Kết thúc dùng máy thay", "12/09/2026 · 17:00"], ["Số ly máy thay thuộc hợp đồng", "160 ly"],
  ] : isRefurbishment ? [
    ["Máy thu mua", "MB-017 · máy khách sở hữu"], ["Hồ sơ mua bán", "MB-2026-017"], ["Thu gom", "Đã nhận máy 02/10/2026"], ["Tân trang", "Đã vệ sinh và thay linh kiện theo hồ sơ"], ["Kiểm thử", "Đạt · nội bộ Technician"], ["Trạng thái", "Chờ gửi kết quả về Moderator"],
  ] : isBuybackAssessment ? [
    ["Máy khách sở hữu", "MB-017"], ["Khách đủ điều kiện", "Nguyễn Minh Anh · đang thuê C-205"], ["Ngày đánh giá", "01/10/2026"], ["Kết quả nội bộ", "Đạt điều kiện thu mua"], ["Giá đề xuất", "7.500.000 đ"], ["Ghi chú tình trạng", "Đã kiểm tra theo tiêu chí công ty"],
  ] : isMaintenance ? [
    ["Máy / hợp đồng", "S-018 / C-204"], ["Ngày thực hiện", "10/07/2026"], ["Nội dung đã thực hiện", "Vệ sinh và kiểm tra theo quy trình nội bộ"], ["Kết quả", "Hoạt động bình thường"], ["Linh kiện / chi phí", "Không thay linh kiện · 0 đ"],
  ] : [
    ["Máy / hợp đồng", "CF-STD-026 · DL-R-0043"], ["Khách hàng", "Trần Minh Tâm · Góc Phố"], ["Mô tả công việc", "Thay linh kiện theo hợp đồng"], ["Linh kiện thay", "Tên linh kiện / số lượng"], ["Giá", "Theo thỏa thuận hợp đồng"], ["Ghi chú lịch sử", "Nhập mô tả ngắn về lần xử lý"],
  ];

  return <>
    <DoloresPage title={config.title} description={config.description} actions={<><DoloresButton onClick={() => setOverlay("confirm")}>{config.submit}</DoloresButton>{config.secondaryActionLabel && config.secondaryHref && <DoloresButton href={config.secondaryHref} variant="secondary">{config.secondaryActionLabel}</DoloresButton>}</>}>
      {isHandover && <Timeline steps={["Yêu cầu được giao", "Máy gắn HĐ", "Lắp đặt", "Bàn giao"]} current={3} />}
      {isSmart && <><DoloresNotice title="Global Menu Dolores · đã áp dụng v3">Admin/Moderator cấp menu; máy xác nhận đã áp dụng. Đây là điều kiện hoàn tất bàn giao. Dữ liệu minh họa.</DoloresNotice><DoloresNotice title="Không cố định ngưỡng offline">Thời gian tối đa offline được thỏa thuận theo hợp đồng; màn hình đọc điều khoản của hợp đồng.</DoloresNotice></>}
      {isRepair && <Timeline steps={["Moderator điều phối", "Xử lý máy", "Ghi công việc", "Lưu lịch sử"]} current={2} />}
      {isRetrieval && <Timeline steps={["Nhận yêu cầu", "Thu hồi máy", "Đánh giá tình trạng", "Báo Moderator"]} current={2} />}
      {isSubstitute && <Timeline steps={["Máy chính cần xử lý", "Chọn máy cùng loại", "Gắn hợp đồng chính", kind === "substitute" ? "Ghi lịch sử" : "Ghi nhận trả"]} current={2} />}
      {isHandover ? <><DoloresPanel><DoloresPanelTitle>Thông tin máy bàn giao</DoloresPanelTitle><DoloresFieldGrid>{fields.map(([label, value]) => <DoloresField key={label} label={label} value={value} />)}</DoloresFieldGrid></DoloresPanel><DoloresPanel><DoloresPanelTitle>Thông tin theo dõi</DoloresPanelTitle><DoloresFieldGrid><DoloresField label="Vị trí hiển thị" value="Địa điểm hợp đồng" /><DoloresField label="GPS / telemetry" value="Không có" /><DoloresField label="Số ly / menu từ xa" value="Không có" /></DoloresFieldGrid><DoloresNotice title="Máy thường">Giao diện chỉ lưu địa điểm hợp đồng và lịch sử máy; không ghi nhận vị trí GPS trực tiếp hoặc trạng thái online/offline.</DoloresNotice></DoloresPanel></> : null}
      {isSmart ? <><DoloresPanel><DoloresPanelTitle>Thông tin kích hoạt</DoloresPanelTitle><DoloresFieldGrid>{fields.map(([label, value]) => <DoloresField key={label} label={label} value={value} />)}</DoloresFieldGrid></DoloresPanel><DoloresPanel><DoloresPanelTitle>Dữ liệu Smart IoT</DoloresPanelTitle><div className="grid grid-cols-2 gap-5"><DoloresMetric label="Ly hợp lệ" value="Bán thành công + báo cáo thành công" /><DoloresMetric label="Mất kết nối" value="Lưu offline, tự đồng bộ lại" /><DoloresMetric label="Global Menu Dolores" value="Đã nhận & áp dụng · v3 (minh họa)" /><DoloresMetric label="Theo dõi" value="Theo giới hạn trong hợp đồng" /></div></DoloresPanel></> : null}
      {isRepair ? <><DoloresPanel><DoloresPanelTitle>Thông tin lần sửa chữa</DoloresPanelTitle><DoloresFieldGrid>{fields.map(([label, value]) => <DoloresField key={label} label={label}><input aria-label={label} className="bg-transparent text-sm outline-none" defaultValue={value} /></DoloresField>)}</DoloresFieldGrid></DoloresPanel><DoloresPanel><DoloresPanelTitle>Lịch sử sẽ lưu</DoloresPanelTitle><DoloresFieldGrid><DoloresField label="Máy / hợp đồng" value="Liên kết hồ sơ máy" /><DoloresField label="Linh kiện" value="Loại và số lượng thay" /><DoloresField label="Giá & việc làm" value="Lưu theo hợp đồng" /></DoloresFieldGrid><DoloresNotice title="Phạm vi hệ thống">Sửa chữa và thay linh kiện theo thỏa thuận; Dolores lưu máy, lịch sử công việc, linh kiện, giá và bảo trì.</DoloresNotice></DoloresPanel></> : null}
      {isRetrieval ? <><DoloresPanel><DoloresPanelTitle>Kết quả thu hồi</DoloresPanelTitle><DoloresFieldGrid>{fields.map(([label, value]) => <DoloresField key={label} label={label}>{label === "Hư hỏng" ? <select aria-label={label} className="bg-transparent text-sm outline-none" value={damage ? "yes" : "no"} onChange={(event) => setDamage(event.target.value === "yes")}><option value="yes">Có · hư hại vỏ</option><option value="no">Không</option></select> : label === "Ghi chú tình trạng" ? <textarea className="resize-y bg-transparent text-sm outline-none" defaultValue={value} /> : <span className="text-sm">{value}</span>}</DoloresField>)}</DoloresFieldGrid></DoloresPanel><DoloresPanel><DoloresPanelTitle>Bước tiếp theo</DoloresPanelTitle><DoloresFieldGrid><DoloresField label="Moderator" value="Nhận kết quả đánh giá" /><DoloresField label="Tiền cọc" value="Quyết toán sau Technician" /></DoloresFieldGrid><DoloresNotice title="Thứ tự bắt buộc">Không hoàn cọc trước bước Technician thu hồi và báo tình trạng. Dolores không lưu rubric đánh giá nội bộ.</DoloresNotice></DoloresPanel></> : null}
      {isSubstitute ? <><DoloresPanel><DoloresPanelTitle>Liên kết máy thay thế</DoloresPanelTitle><DoloresFieldGrid>{fields.map(([label, value]) => <DoloresField key={label} label={label} value={value} />)}</DoloresFieldGrid></DoloresPanel><DoloresPanel><DoloresPanelTitle>Ghi nhận usage</DoloresPanelTitle><DoloresFieldGrid><DoloresField label="PAYG" value="Ly máy thay gộp HĐ" /><DoloresField label="Hợp đồng" value="Theo máy chính" /></DoloresFieldGrid><DoloresNotice title="Cùng loại máy">Thay máy IoT bằng IoT, máy thường bằng máy thường. Không chuyển đổi hai loại và không tạo hợp đồng thuê mới.</DoloresNotice></DoloresPanel></> : null}
      {isSubstituteReturn ? <DoloresPanel><DoloresPanelTitle>Thông tin chi tiết</DoloresPanelTitle><DoloresFieldGrid>{fields.map(([label, value]) => <DoloresField key={label} label={label} value={value} />)}</DoloresFieldGrid></DoloresPanel> : null}
      {isRefurbishment ? <><DoloresPanel><DoloresPanelTitle>Công việc sau thu mua</DoloresPanelTitle><DoloresFieldGrid>{fields.map(([label, value]) => <DoloresField key={label} label={label} value={value} />)}</DoloresFieldGrid></DoloresPanel><DoloresPanel><DoloresPanelTitle>Vòng đời máy</DoloresPanelTitle><p className="text-sm font-semibold">Moderator xác nhận hồ sơ</p><p className="mt-1 text-sm text-[#706561]">Hợp đồng mua bán và khoản chuyển đã lưu.</p><p className="mt-4 text-sm font-semibold">Technician thu hồi máy</p><p className="mt-1 text-sm text-[#706561]">Ghi nhận máy đã nhận về.</p><p className="mt-4 text-sm font-semibold">Tân trang và kiểm thử</p><p className="mt-1 text-sm text-[#706561]">Sau khi hoàn tất mới báo Moderator.</p><DoloresNotice title="Chưa sẵn sàng cho thuê">Chỉ sau tân trang và kiểm thử xong Moderator mới chuyển máy sang trạng thái available-for-rent.</DoloresNotice></DoloresPanel></> : null}
      {isBuybackAssessment ? <><DoloresPanel><DoloresPanelTitle>Thông tin chi tiết</DoloresPanelTitle><DoloresFieldGrid>{fields.map(([label, value]) => <DoloresField key={label} label={label} value={value} />)}<div className="col-span-2 flex min-h-[48px] flex-col justify-center rounded-[10px] border border-[#E9E2DC] bg-[#F8F6F3] px-4 py-2 text-center"><span className="text-sm text-[#302927]">Chọn ảnh / tài liệu</span><span className="mt-1 text-xs text-[#706561]">Tệp minh họa trong prototype</span></div></DoloresFieldGrid></DoloresPanel><DoloresNotice title="Gửi kết quả trước thương lượng">Moderator nhận kết quả rồi mới thương lượng và lập hợp đồng mua bên ngoài.</DoloresNotice></> : null}
      {isMaintenance ? <><DoloresPanel><DoloresPanelTitle>Thông tin chi tiết</DoloresPanelTitle><DoloresFieldGrid>{fields.map(([label, value]) => <DoloresField key={label} label={label}><input aria-label={label} className="bg-transparent text-sm outline-none" defaultValue={value} /></DoloresField>)}</DoloresFieldGrid></DoloresPanel><DoloresNotice title="Chu kỳ nghiệp vụ 3 tháng, cửa sổ 10 ngày.">Nền tảng ghi nhận kết quả; lịch điều phối nội bộ nằm ngoài phạm vi đã chốt.</DoloresNotice></> : null}
    </DoloresPage>
    {overlay && <Dialog success={overlay === "success"} title={overlay === "success" ? "Đã ghi nhận thành công" : `Xác nhận · ${config.title}`} message={overlay === "success" ? config.successMessage : config.confirmMessage} successActionLabel={config.successActionLabel} successHref={config.successHref} onConfirm={submit} onClose={() => setOverlay(null)} />}
  </>;
}

function MachineHistory({ id }: { id?: string }) {
  const [filter, setFilter] = useState("Tất cả máy");
  if (id) return <DoloresPage title={`Lịch sử xử lý máy ${id}`} description="Theo dõi hồ sơ và xử lý công việc trong phạm vi được giao." actions={<><DoloresButton href="/technician/tasks/retrieval">Xem lần thu hồi</DoloresButton><DoloresButton href="/technician/tasks/maintenance-history" variant="secondary">Ghi nhận bảo trì</DoloresButton><DoloresButton href="/technician/history" variant="secondary">Về danh sách lịch sử</DoloresButton></>}>
    <DoloresPanel><DoloresPanelTitle>Lịch sử xử lý</DoloresPanelTitle><div className="grid gap-3">
      {[["01/10 · Thu hồi & đánh giá", "YC-017 · Có hư hại vỏ. Kết quả đã gửi Moderator."], ["12/09 · Sửa chữa", "Thay van cấp nước · 1 chiếc · 350.000 đ theo hợp đồng."], ["10–12/09 · Máy thay thế", "S-022 · Smart IoT · 160 ly trong thời gian gắn tạm."], ["10/07 · Bảo trì", "Đã lưu kết quả bảo trì định kỳ."]].map(([title, detail]) => <div key={title} className="rounded-[10px] border border-[#E9E2DC] bg-white p-4"><p className="text-sm font-semibold text-[#302927]">{title}</p><p className="mt-1 text-sm text-[#706561]">{detail}</p></div>)}
    </div></DoloresPanel>
  </DoloresPage>;

  const rows = [
    [<a href="/technician/history/S-018" className="font-semibold hover:text-[#B81724]" key="date-1">25/09/2026 ›</a>, "S-018", "C-204", "Bàn giao Smart IoT", "Địa điểm hợp đồng + GPS"],
    [<a href="/technician/history/S-018" className="font-semibold hover:text-[#B81724]" key="date-2">12/09/2026 ›</a>, "S-018", "C-204", "Bảo trì định kỳ", "Lưu lịch sử đã thực hiện"],
    [<a href="/technician/history/S-018" className="font-semibold hover:text-[#B81724]" key="date-3">21/08/2026 ›</a>, "CF-STD-026", "DL-R-0043", "Sửa chữa", "Thay bơm · giá theo HĐ"],
    [<a href="/technician/tasks/substitute-return" className="font-semibold hover:text-[#B81724]" key="date-4">18/08/2026 ›</a>, "S-022", "C-204", "Thay máy tạm", "Cùng loại · ly gộp HĐ"],
    [<a href="/technician/tasks/refurbishment" className="font-semibold hover:text-[#B81724]" key="date-5">02/08/2026 ›</a>, "MB-017", "Hồ sơ mua cũ", "Thu hồi / kiểm thử", "Chưa available-for-rent"],
  ];
  const filtered = filter === "Tất cả máy" ? rows : rows.filter((row) => filter === "Smart IoT" ? ["S-018", "S-022"].includes(String(row[1])) : row[1] === "CF-STD-026");
  return <DoloresPage title="Lịch sử máy" description="Tra cứu bàn giao, thay máy, sửa chữa, linh kiện, bảo trì và thu hồi." actions={<><DoloresButton href="/technician/history/S-018">Xem lịch sử chi tiết</DoloresButton><DoloresButton href="/technician/tasks/maintenance-history" variant="secondary">Ghi nhận bảo trì</DoloresButton></>}>
    <div className="flex gap-3">{["Tất cả máy", "Smart IoT", "Máy thường"].map((item) => <DoloresButton key={item} variant={filter === item ? "primary" : "secondary"} onClick={() => setFilter(item)}>{item}</DoloresButton>)}</div>
    <DoloresPanel><DoloresPanelTitle>Lịch sử theo máy</DoloresPanelTitle><p className="-mt-2 mb-3 text-sm text-[#706561]">Dữ liệu minh họa · hồ sơ không thay thế đánh giá nội bộ</p><DoloresTable headers={["Ngày", "Máy", "Hợp đồng", "Sự kiện", "Ghi chú / linh kiện"]} rows={filtered} /></DoloresPanel>
    <DoloresNotice title="Không quản lý lịch nội bộ">Technician đánh giá nội bộ theo tiêu chí công ty; Dolores chỉ lưu hồ sơ lịch sử và tình trạng đã báo.</DoloresNotice>
  </DoloresPage>;
}

function Notifications() {
  return <DoloresPage title="Thông báo công việc" description="Theo dõi hồ sơ và xử lý công việc trong phạm vi được giao." actions={<DoloresButton href="/technician/tasks/YC-017">Mở công việc được giao</DoloresButton>}><DoloresPanel><DoloresPanelTitle>Danh sách</DoloresPanelTitle><DoloresTable headers={["Thời điểm", "Nội dung", "Liên quan"]} rows={[[<a href="/technician/tasks/YC-017" className="font-semibold hover:text-[#B81724]" key="yc">01/10 · 09:00 ›</a>, "Moderator giao thu hồi & đánh giá", "YC-017 / S-018"], [<a href="/technician/tasks/buyback-assessment" className="font-semibold hover:text-[#B81724]" key="mb">01/10 · 10:00 ›</a>, "Yêu cầu đánh giá máy mua cũ", "YC-019 / MB-017"]]} /></DoloresPanel></DoloresPage>;
}

export function TechnicianSectionPage({ sections }: { sections: string[] }) {
  const path = sections.join("/");
  if (path === "tasks" || path === "") return <TaskList />;
  if (path === "tasks/YC-017") return <TaskDetail />;
  if (path === "tasks/standard-handover") return <JobForm kind="standard-handover" />;
  if (path === "tasks/smart-activation") return <JobForm kind="smart-activation" />;
  if (path === "tasks/repair") return <JobForm kind="repair" />;
  if (path === "tasks/retrieval") return <JobForm kind="retrieval" />;
  if (path === "tasks/substitute") return <JobForm kind="substitute" />;
  if (path === "tasks/substitute-return") return <JobForm kind="substitute-return" />;
  if (path === "tasks/refurbishment") return <JobForm kind="refurbishment" />;
  if (path === "tasks/buyback-assessment") return <JobForm kind="buyback-assessment" />;
  if (path === "tasks/maintenance-history") return <JobForm kind="maintenance-history" />;
  if (path === "history") return <MachineHistory />;
  if (path.startsWith("history/")) return <MachineHistory id={sections[1]} />;
  if (path === "notifications") return <Notifications />;
  return <DoloresPage title="Không tìm thấy màn hình" description={`Đường dẫn /technician/${path} chưa được ánh xạ.`} actions={<DoloresButton href="/technician/tasks">Về việc được giao</DoloresButton>}><DoloresNotice title="Không có frame tương ứng">Chọn một mục trong menu bên trái để tiếp tục.</DoloresNotice></DoloresPage>;
}
