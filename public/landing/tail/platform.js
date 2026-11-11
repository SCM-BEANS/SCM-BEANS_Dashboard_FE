export const PLATFORM_VIEWS = {
  devices: { title: "Thiết bị", icon: "coffee", search: "Tìm thiết bị", name: "Tên máy", rows: [
    { name: "Máy 01", status: "Đang hoạt động", tone: "success" },
    { name: "Máy 02", status: "Sẵn sàng", tone: "info" },
    { name: "Máy 03", status: "Cần kiểm tra", tone: "warn" }
  ] },
  contracts: { title: "Hợp đồng", icon: "file-description", search: "Tìm hợp đồng", name: "Hợp đồng", rows: [
    { name: "Hợp đồng 01", status: "Đang hiệu lực", tone: "success" },
    { name: "Hợp đồng 02", status: "Chờ xác nhận", tone: "warn" }
  ] },
  invoices: { title: "Hóa đơn", icon: "receipt", search: "Tìm hóa đơn", name: "Hóa đơn", rows: [
    { name: "Hóa đơn 01", status: "Đã thanh toán", tone: "success" },
    { name: "Hóa đơn 02", status: "Chưa thanh toán", tone: "warn" }
  ] },
  support: { title: "Hỗ trợ", icon: "headset", search: "Tìm yêu cầu", name: "Yêu cầu", rows: [
    { name: "Yêu cầu 01", status: "Đã tiếp nhận", tone: "info" },
    { name: "Yêu cầu 02", status: "Đang xử lý", tone: "warn" }
  ] }
};
const escapeText = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const icon = name => `<svg viewBox="0 0 24 24" aria-hidden="true"><use href="./landing/assets/platform-connections.svg#${name}"></use></svg>`;
const normalize = value => value.toLocaleLowerCase("vi-VN").normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/đ/g, "d");
export const filterPlatformRows = (rows, query) => rows.filter(row => normalize(`${row.name} ${row.status}`).includes(normalize(query.trim())));

// Representative records for the feature preview; no customer data is fetched here.
export function createPlatform(root, copy) {
  root.innerHTML = `<div class="platform-showcase-copy"><p class="tail-eyebrow">Nền tảng Dolores</p><h2 id="platform-title">${copy.TITLE.split("\n").map(line => `<span>${escapeText(line)}</span>`).join("")}</h2>
    <div class="platform-features" role="group" aria-label="Nhóm chức năng nền tảng">
      <button type="button" data-feature="devices" aria-pressed="true" aria-controls="platform-preview">${icon("coffee")}<span>Thiết bị</span></button>
      <button type="button" data-feature="contracts" aria-pressed="false" aria-controls="platform-preview">${icon("file-description")}<span>Hợp đồng & hóa đơn</span></button>
      <button type="button" data-feature="support" aria-pressed="false" aria-controls="platform-preview">${icon("headset")}<span>Hỗ trợ</span></button>
    </div><a class="button primary platform-action" data-login>${escapeText(copy.ACTION)}</a></div>
    <div class="platform-preview" id="platform-preview" role="region" aria-label="Bản giới thiệu giao diện Dolores" aria-describedby="platform-preview-note">
      <div class="platform-preview-side"><strong class="platform-wordmark">dolores.</strong><nav aria-label="Màn hình nền tảng">${Object.entries(PLATFORM_VIEWS).map(([key, view]) => `<button type="button" data-view="${key}" aria-pressed="${key === "devices"}" aria-controls="platform-preview-main">${icon(view.icon)}<span>${escapeText(view.title)}</span></button>`).join("")}</nav></div>
      <div class="platform-preview-main" id="platform-preview-main"><h3 data-platform-title>Thiết bị</h3><label class="platform-search"><span class="sr-only" data-search-label>Tìm thiết bị</span><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg><input type="search" data-platform-search placeholder="Tìm thiết bị" autocomplete="off"></label>
        <table class="platform-table"><thead><tr><th scope="col" data-name-column>Tên máy</th><th scope="col">Trạng thái</th></tr></thead><tbody data-platform-rows></tbody></table>
        <span class="sr-only" role="status" data-platform-results></span>
      </div>
    </div><p class="sr-only" id="platform-preview-note">Giao diện giới thiệu tính năng với các bản ghi mô phỏng.</p>`;
  const rows = root.querySelector("[data-platform-rows]"), title = root.querySelector("[data-platform-title]");
  const search = root.querySelector("[data-platform-search]"), searchLabel = root.querySelector("[data-search-label]");
  const column = root.querySelector("[data-name-column]"), results = root.querySelector("[data-platform-results]");
  const features = [...root.querySelectorAll("[data-feature]")], screens = [...root.querySelectorAll("[data-view]")];
  let selected = "devices";
  function draw() {
    const view = PLATFORM_VIEWS[selected], filtered = filterPlatformRows(view.rows, search.value);
    rows.innerHTML = filtered.length ? filtered.map(row => `<tr><td><span class="platform-record">${icon(view.icon)}<strong>${escapeText(row.name)}</strong></span></td><td><span class="platform-status" data-tone="${row.tone}">${escapeText(row.status)}</span></td></tr>`).join("") : `<tr><td class="platform-empty" colspan="2">Không có kết quả phù hợp.</td></tr>`;
    results.textContent = `${filtered.length} kết quả`;
  }
  function select(key) {
    if (!PLATFORM_VIEWS[key]) return;
    selected = key; search.value = "";
    const view = PLATFORM_VIEWS[key], group = key === "invoices" ? "contracts" : key;
    title.textContent = view.title; column.textContent = view.name;
    search.placeholder = view.search; searchLabel.textContent = view.search;
    features.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.feature === group)));
    screens.forEach(button => button.setAttribute("aria-pressed", String(button.dataset.view === key)));
    draw();
  }
  root.addEventListener("click", event => {
    const button = event.target.closest("[data-feature], [data-view]");
    if (button) select(button.dataset.feature || button.dataset.view);
  });
  search.addEventListener("input", draw);
  select(selected);
}
