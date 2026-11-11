const format = new Intl.NumberFormat("vi-VN");

export function createPanel(root) {
  root.innerHTML = `<div class="sync-panel-bar"><span class="sync-panel-brand"><span class="sync-panel-mark"><img src="./landing/assets/dolores-mark.png" alt=""></span>dolores.</span><strong class="sync-device-name"></strong></div>
    <div class="sync-panel-body">
      <div class="sync-panel-heading"><h3 data-sync-title aria-live="polite">Đóng buồng</h3><span class="sync-pill" data-pill></span></div>
      <dl class="sync-metrics">
        <div class="sync-metric sync-encoder"><dt>Encoder 2</dt><dd><strong data-encoder>0</strong><span>xung</span></dd></div>
        <div class="sync-metric sync-pwm"><dt>PWM motor 2</dt><dd><strong data-pwm>0</strong><span>%</span></dd></div>
      </dl>
      <div class="sync-chart"><span>Vị trí theo chu trình</span><svg viewBox="0 0 480 120" role="img" aria-label="Vị trí encoder theo tiến trình chu trình"><path data-trace/><circle data-cursor r="4"/></svg></div>
      <div class="sync-direction"><span>Chiều quay motor 2</span><strong data-direction></strong></div>
    </div>`;
  const title = root.querySelector("[data-sync-title]"), pill = root.querySelector("[data-pill]");
  const encoder = root.querySelector("[data-encoder]"), pwm = root.querySelector("[data-pwm]");
  const direction = root.querySelector("[data-direction]"), trace = root.querySelector("[data-trace]"), cursor = root.querySelector("[data-cursor]");
  let last = {};
  function metric(node, value, previous, animate) {
    if (value === previous) return;
    node.textContent = format.format(value);
    if (animate && previous != null) node.closest(".sync-metric").classList.add("is-updated");
  }
  return {
    update(state, { animate = true } = {}) {
      if (state.phase !== last.phase) root.querySelectorAll(".sync-metric").forEach(node => node.classList.remove("is-updated"));
      if (state.title !== last.title) title.textContent = state.title;
      if (state.status !== last.status) { pill.textContent = state.status; pill.dataset.tone = state.tone; }
      metric(encoder, state.encoder, last.encoder, animate);
      metric(pwm, state.pwm, last.pwm, animate);
      if (state.direction !== last.direction) direction.textContent = state.direction === "Dừng" ? "" : state.direction;
      trace.setAttribute("d", state.trace);
      cursor.setAttribute("cx", state.cursor.x); cursor.setAttribute("cy", state.cursor.y);
      if (!animate) root.querySelectorAll(".sync-metric").forEach(node => node.classList.remove("is-updated"));
      last = state;
    }
  };
}
