import { cluster03Connections, cluster03MotionFor } from "../motion/shared.js";
import { createPanel } from "./panel.js";
import { TOTAL, SYNC_STAGES, panelAt, poseAt, phaseTime } from "./scenario.js";

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
const escapeText = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));

export function createSyncSection({ viewer, root }) {
  const panel = createPanel(root.querySelector("[data-sync-panel]"));
  const phases = root.querySelector("[data-sync-phases]");
  const action = root.querySelector("[data-sync-action]"), number = root.querySelector("[data-sync-number]");
  const message = root.querySelector("[data-sync-message]");
  phases.innerHTML = SYNC_STAGES.map((stage, index) => `<button type="button" data-sync-phase="${index}" aria-controls="sync-host sync-panel" aria-current="false" disabled><span>${String(index + 1).padStart(2, "0")}</span>${escapeText(stage.title)}</button>`).join("");
  const buttons = [...phases.querySelectorAll("button")];
  let t = 0, paused = reduceMotion.matches, visible = false, frame = 0, last = 0;
  let motion = null, activityTicket = 0, phaseShown = -1, ready = false, finished = false;
  let end = TOTAL;

  const running = () => !paused && ready && motion && visible && viewer.isActive("sync") && !document.hidden;
  function controls() {
    buttons.forEach(button => { button.disabled = !ready; });
    root.dataset.playing = String(Boolean(running()));
  }

  function draw(animate = true) {
    const pose = poseAt(t), isRunning = Boolean(running());
    if (phaseShown !== pose.phase) {
      buttons.forEach((button, index) => button.setAttribute("aria-current", String(index === pose.phase)));
      action.textContent = SYNC_STAGES[pose.phase].title; number.textContent = String(pose.phase + 1).padStart(2, "0");
      phaseShown = pose.phase;
      if (motion && viewer.isActive("sync")) viewer.highlightHost("sync", motion.highlights(pose.stage.phase));
    }
    if (motion && viewer.isActive("sync")) { motion.apply(pose.main, pose.lower); viewer.requestRender(); }
    panel.update(panelAt(t, { running: isRunning, complete: finished }), { animate: animate && !reduceMotion.matches });
  }
  function stopFrame() { if (frame) cancelAnimationFrame(frame); frame = 0; }
  function tick(now) {
    frame = 0;
    if (!running()) return;
    t += Math.min(250, Math.max(0, now - last)) / 1000; last = now;
    if (t >= end) { t = end - .000001; paused = true; finished = true; controls(); }
    draw();
    if (running()) frame = requestAnimationFrame(tick);
  }
  function schedule() {
    if (frame || !running()) return;
    last = performance.now(); frame = requestAnimationFrame(tick);
  }

  phases.addEventListener("click", event => {
    const button = event.target.closest("[data-sync-phase]");
    if (!button || !ready) return;
    const index = Number(button.dataset.syncPhase);
    stopFrame(); end = SYNC_STAGES[index].end;
    finished = reduceMotion.matches; paused = reduceMotion.matches;
    t = phaseTime(index, reduceMotion.matches);
    controls(); draw(false); schedule();
  });

  async function ensureMotion(ticket) {
    try {
      const model = viewer.getModel("sync");
      if (!model) return;
      const { definitions } = await cluster03Connections();
      if (ticket !== activityTicket || !viewer.isActive("sync")) return;
      motion = cluster03MotionFor(model, definitions); motion.reset(); ready = true;
      phaseShown = -1; message.hidden = true; controls(); draw(false); schedule();
    } catch (error) {
      if (ticket !== activityTicket || !viewer.isActive("sync")) return;
      ready = false; paused = true; controls(); stopFrame();
      message.textContent = "Chưa tải được hoạt ảnh. Hãy tải lại trang."; message.hidden = false;
      console.warn("Machine-to-platform motion is unavailable:", error);
    }
  }
  viewer.onActivity((name, loaded) => {
    const ticket = ++activityTicket;
    if (name === "sync") { if (loaded) void ensureMotion(ticket); return; }
    stopFrame();
    if (motion) motion.reset();
    motion = null; ready = false; controls();
  });
  if (typeof IntersectionObserver === "undefined") visible = true;
  else new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (!visible) stopFrame();
    controls(); draw(false); schedule();
  }).observe(root.querySelector("[data-sync-grid]"));
  document.addEventListener("visibilitychange", () => { if (document.hidden) stopFrame(); controls(); draw(false); schedule(); });
  reduceMotion.addEventListener("change", event => {
    if (event.matches) { stopFrame(); paused = true; }
    controls(); draw(false);
  });
  controls(); draw(false); schedule();
}
