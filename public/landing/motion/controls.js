import { cluster03Connections, cluster03MotionFor } from "./shared.js";
import { CYCLE_DURATION_MS, OPERATION_STAGES, phaseAt, phaseStartMs } from "./cycle.js";

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
// While the user explodes the parts (and nothing plays), poses are left alone so they do not snap the parts back.
const exploded = () => Number(document.getElementById("explode")?.value || 0) > 0;
const escapeText = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));

export function createDetailMotion({ viewer, root, setExplode, setExplodeLocked }) {
  let selectedModel = null;
  let c03ConnectionsTask = null, c03ModelTask = null;
  let c03Motion = null, c03Model = null;
  let c03Running = false, c03Speed = 1, c03Elapsed = 0, c03LastTime = 0, c03Frame = 0;
  let autoPlayPending = false;

  function cancelC03Frame() { if (c03Frame) cancelAnimationFrame(c03Frame); c03Frame = 0; }

  function setC03PhaseUI(index) {
    const chips = root.querySelectorAll("[data-phase-index]");
    chips.forEach((chip, chipIndex) => chip.setAttribute("aria-pressed", String(chipIndex === index)));
    const current = root.querySelector("[data-current-phase]");
    if (current) current.textContent = OPERATION_STAGES[index].label;
  }

  function updateC03Pose(elapsed) {
    c03Elapsed = ((elapsed % CYCLE_DURATION_MS) + CYCLE_DURATION_MS) % CYCLE_DURATION_MS;
    const position = phaseAt(c03Elapsed);
    if (c03Motion && (c03Running || !exploded())) c03Motion.apply(position.main, position.lower);
    if (position.index !== Number(root.dataset.phaseIndex)) {
      root.dataset.phaseIndex = String(position.index);
      setC03PhaseUI(position.index);
      viewer.highlightHost("detail", c03Motion?.highlights(position.stage.phase) || []);
    }
    viewer.requestRender();
  }

  function stopC03(reset = false, keepAutoPlay = false) {
    c03Running = false;
    cancelC03Frame();
    setExplodeLocked(false);
    if (!keepAutoPlay) autoPlayPending = false;
    if (reset) {
      c03Elapsed = 0;
      c03Speed = 1;
      c03Motion?.reset();
      root.dataset.phaseIndex = "-1";
      updateC03Pose(0);
      viewer.highlightHost("detail", []);
      setExplode(0);
    }
    updatePlayButtons();
    updateSpeedButton();
  }

  function updatePlayButtons() {
    const button = root.querySelector('[data-motion-action="cycle"]');
    if (!button) return;
    button.textContent = c03Running ? "Tạm dừng" : "Chạy chu trình";
    button.setAttribute("aria-label", c03Running ? "Tạm dừng chu trình" : "Chạy chu trình");
    button.setAttribute("aria-pressed", String(c03Running));
  }

  function updateSpeedButton() {
    const button = root.querySelector('[data-motion-action="speed"]');
    if (!button) return;
    button.textContent = c03Speed === 1 ? "1×" : "0,5×";
    button.setAttribute("aria-label", `Tốc độ ${button.textContent}`);
  }

  function renderCycle(status = "") {
    root.hidden = false;
    root.classList.add("is-visible");
    root.dataset.motionModel = "c03";
    if (status) {
      root.innerHTML = `<p class="motion-status" role="status">${escapeText(status)}</p>`;
      return;
    }
    const current = phaseAt(c03Elapsed);
    root.innerHTML = `<div class="motion-toolbar">
      <button class="motion-play" type="button" data-motion-action="cycle" aria-label="Chạy chu trình" aria-pressed="false">Chạy chu trình</button>
      <div class="motion-phases" role="group" aria-label="Các pha của chu trình">${OPERATION_STAGES.map((stage, index) => `<button class="motion-phase" type="button" data-phase-index="${index}" aria-pressed="${index === current.index}">${stage.label}</button>`).join("")}</div>
      <strong class="motion-current" data-current-phase>${current.stage.label}</strong>
      <button class="motion-speed" type="button" data-motion-action="speed" aria-label="Tốc độ 1×">1×</button>
    </div>`;
    root.dataset.phaseIndex = String(current.index);
    updatePlayButtons(); updateSpeedButton();
  }

  function hideControls() {
    root.hidden = true;
    root.classList.remove("is-visible");
    root.removeAttribute("data-motion-model");
    root.innerHTML = "";
  }

  async function ensureC03() {
    if (!c03ConnectionsTask) c03ConnectionsTask = cluster03Connections();
    if (!c03ModelTask) c03ModelTask = viewer.load("c03");
    try {
      const [{ definitions }, model] = await Promise.all([c03ConnectionsTask, c03ModelTask]);
      if (selectedModel !== "c03") return;
      if (!c03Motion || c03Model !== model) {
        c03Motion = cluster03MotionFor(model, definitions);
        c03Model = model;
        c03Motion.reset();
      }
      renderCycle();
      updateC03Pose(c03Elapsed);
      tryAutoPlay();
    } catch (error) {
      c03ConnectionsTask = null;
      c03ModelTask = null;
      if (selectedModel === "c03") renderCycle("Chuyển động CAD chưa sẵn sàng.");
      console.warn("Cluster 03 motion is unavailable:", error);
    }
  }

  function tryAutoPlay() {
    if (!autoPlayPending || selectedModel !== "c03" || !c03Motion || reduceMotion.matches || !viewer.isActive("detail") || document.hidden) return;
    autoPlayPending = false;
    startCycle();
  }

  function startCycle() {
    if (!c03Motion || selectedModel !== "c03" || !viewer.isActive("detail")) return;
    if (c03Running) return;
    setExplode(0);
    setExplodeLocked(true);
    c03Running = true;
    c03LastTime = performance.now();
    updatePlayButtons();
    const tick = now => {
      c03Frame = 0;
      if (!c03Running) return;
      if (!viewer.isActive("detail") || selectedModel !== "c03") {
        stopC03(true);
        return;
      }
      if (document.hidden) return;
      c03Elapsed += Math.max(0, now - c03LastTime) * c03Speed;
      c03LastTime = now;
      updateC03Pose(c03Elapsed);
      c03Frame = requestAnimationFrame(tick);
    };
    c03Frame = requestAnimationFrame(tick);
  }

  function selectCluster(modelId, { autoplay = false, defer = false } = {}) {
    stopC03(true, autoplay && !reduceMotion.matches);
    selectedModel = modelId;
    autoPlayPending = modelId === "c03" && autoplay && !reduceMotion.matches;
    setExplodeLocked(false);
    if (modelId === "c03") {
      renderCycle(c03Motion && c03Model === viewer.getModel("detail") ? "" : "Đang tải chuyển động CAD…");
      if (!defer) void ensureC03();
    } else hideControls();
  }

  function reset() {
    autoPlayPending = false;
    stopC03(true);
    setExplodeLocked(false);
    if (selectedModel === "c03" && c03Motion) renderCycle();
  }

  root.addEventListener("click", event => {
    const action = event.target.closest("[data-motion-action]")?.dataset.motionAction;
    if (action === "cycle") {
      if (c03Running) stopC03(false);
      else startCycle();
    } else if (action === "speed") {
      c03Speed = c03Speed === 1 ? 0.5 : 1;
      updateSpeedButton();
    } else {
      const chip = event.target.closest("[data-phase-index]");
      if (chip && root.dataset.motionModel === "c03" && c03Motion) {
        stopC03(false);
        updateC03Pose(phaseStartMs(Number(chip.dataset.phaseIndex)));
      }
    }
  });
  viewer.onActivity((name, ready) => {
    if (name !== "detail") {
      autoPlayPending = false;
      stopC03(true);
        return;
    }
    if (!ready) return;
    if (selectedModel === "c03") void ensureC03();
    tryAutoPlay();
  });

  document.addEventListener("visibilitychange", () => {
    const now = performance.now();
    c03LastTime = now;
    if (document.hidden) {
      cancelC03Frame();
      return;
    }
    if (c03Running) c03Frame = requestAnimationFrame(tickCycleResume);
    tryAutoPlay();
  });

  function tickCycleResume(now) {
    c03Frame = 0;
    if (!c03Running || document.hidden) return;
    if (!viewer.isActive("detail") || selectedModel !== "c03") { stopC03(true); return; }
    c03Elapsed += Math.max(0, now - c03LastTime) * c03Speed;
    c03LastTime = now; updateC03Pose(c03Elapsed);
    c03Frame = requestAnimationFrame(tickCycleResume);
  }

  return { selectCluster, reset };
}
