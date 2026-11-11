import * as THREE from "three";
import { OPERATION_STAGES, phaseAt, phaseStartMs, CYCLE_DURATION_MS } from "../motion/cycle.js";
import { cluster03Connections, cluster03MotionFor } from "../motion/shared.js";
import { CHAPTERS, STEPS, processChannels } from "./steps.js";
import { createBoardDiagram } from "./board.js";

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const escapeText = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const LOOP_HOLD = 900;

// Both chapters share the existing renderer and calibrated mechanism. Scrolling selects the action.
export function createProcessSection({ viewer, root, brain }) {
  const channelsById = new Map(processChannels(brain).channels.map(channel => [channel.id, channel]));
  const host = root.querySelector("#process-host");
  const stage = root.querySelector(".process-stage");
  const stepsRoot = root.querySelector("[data-process-steps]");
  const stepNav = root.querySelector("[data-process-dots]");
  const chapterNav = root.querySelector("[data-process-chapters]");
  const running = root.querySelector("[data-process-running]");
  const context = root.querySelector("[data-process-context]");
  const board = createBoardDiagram(root.querySelector("[data-process-board]"));

  stepsRoot.innerHTML = CHAPTERS.map(chapter => `<div class="process-chapter" role="group" aria-label="${escapeText(chapter.title)}">
    ${chapter.steps.map(index => `<div class="process-step" data-step="${index}" aria-labelledby="process-step-${index}"><h3 class="sr-only" id="process-step-${index}">${escapeText(STEPS[index].title)}</h3></div>`).join("")}
  </div>`).join("");
  stepNav.innerHTML = STEPS.map((step, index) => `<button type="button" data-goto="${index}" aria-controls="process-title process-host">${escapeText(step.title)}</button>`).join("");
  chapterNav.innerHTML = CHAPTERS.map((chapter, index) => `<button type="button" data-chapter-goto="${index}" aria-controls="process-title process-host">${escapeText(chapter.title)}</button>`).join("");
  const articles = [...stepsRoot.querySelectorAll("[data-step]")];
  const stepButtons = [...stepNav.querySelectorAll("button")];
  const chapterButtons = [...chapterNav.querySelectorAll("button")];

  let step = -1, stepStart = performance.now(), visible = false, frame = 0, swapToken = 0;
  let motion = null, compressor = null, mounting = null, camera = null, cameraReady = false;
  let highlightKey = "";
  const position = new THREE.Vector3(), target = new THREE.Vector3();

  viewer.registerHost("process", host, {
    modelId: "body", lighting: "studio", shellMode: "hide", hideUnfocused: true,
    pathControlled: true, filmControlled: true, tintFocus: false,
    focus: STEPS[0].focus, focusParts: STEPS[0].focusParts, flows: [],
    cutoffs: { water: 1, hot: 1, coffee: 1, milk: 1 }, flowOpacity: {}, highlightIds: [], annotationIds: [], markerIds: []
  });

  function compressorElapsed(current) {
    const spec = current.compressor || { hold: 0 };
    if (!spec.play) return phaseStartMs(spec.hold);
    const start = phaseStartMs(spec.play[0]);
    const end = spec.play[1] + 1 >= OPERATION_STAGES.length ? CYCLE_DURATION_MS - 1 : phaseStartMs(spec.play[1] + 1);
    if (reduceMotion.matches) return end;
    const local = (performance.now() - stepStart) % (end - start + LOOP_HOLD);
    return start + Math.min(local, end - start);
  }

  function highlightObjects(current) {
    const model = viewer.getModel("process");
    if (!model) return [];
    if (current.parts.includes("compressor")) {
      const stage = current.compressor?.play ? phaseAt(compressorElapsed(current)).stage : null;
      const moving = motion && stage ? motion.highlights(stage.phase) : [];
      return moving.length ? moving : compressor ? [compressor.holder] : [];
    }
    return model.annotations.filter(part => current.parts.includes(part.id)).flatMap(part => part.meshes);
  }

  function showBlocks(current) {
    const active = new Map();
    for (const id of current.channels) {
      for (const [block, signal] of Object.entries(channelsById.get(id)?.blocks || {})) {
        if (!active.has(block)) active.set(block, []);
        if (!active.get(block).some(item => item.label === signal.label)) active.get(block).push(signal);
      }
    }
    board.update(active, current);
  }

  function renderStep() {
    if (step < 0) return;
    const current = STEPS[step];
    if (motion && viewer.isActive("process")) {
      const pose = phaseAt(compressorElapsed(current));
      motion.apply(pose.main, pose.lower);
    }
    const objects = highlightObjects(current);
    const key = `${step}:${objects.map(object => object.uuid).join(",")}`;
    if (key !== highlightKey) {
      highlightKey = key;
      viewer.highlightHost("process", objects);
    }
    if (camera) {
      const k = reduceMotion.matches ? 1 : Math.min(1, (performance.now() - camera.start) / 1000);
      position.lerpVectors(camera.from.position, camera.to.position, ease(k));
      target.lerpVectors(camera.from.target, camera.to.target, ease(k));
      viewer.setCamera("process", position, target);
      cameraReady = true;
      if (k === 1) camera = null;
    }
    viewer.requestRender();
  }

  function framePose(current) {
    const { az, el } = current.shot;
    if (current.whole) return viewer.framePose({ az, el, padding: 1.05 });
    return current.focusParts
      ? viewer.framePose({ parts: current.focusParts, az, el })
      : viewer.framePose({ focus: current.focus, az, el });
  }

  function applyStep(current, instant = false) {
    const token = ++swapToken;
    const instantSwap = instant || reduceMotion.matches;
    const swap = () => {
      if (token !== swapToken) return;
      showBlocks(current);
      viewer.film("process", {
        channels: current.channels, focus: current.whole ? null : current.focus,
        focusParts: current.whole ? null : current.focusParts || null,
        flows: current.flows || [], shellMode: current.whole ? "show" : "hide"
      }, { duration: instantSwap ? 0 : 500, shellDuration: 500 });
      host.classList.remove("is-swapping");
      highlightKey = "";
      renderStep();
    };
    const pose = framePose(current);
    if (pose) {
      camera = {
        start: performance.now(),
        from: instantSwap || !cameraReady ? pose : { position: position.clone(), target: target.clone() },
        to: pose
      };
    }
    if (instantSwap) swap();
    else { host.classList.add("is-swapping"); setTimeout(swap, 160); }
  }

  function setStep(index, instant = false) {
    if (index === step) return;
    step = index;
    stepStart = performance.now();
    const chapter = CHAPTERS.findIndex(item => item.steps.includes(step));
    stepButtons.forEach((button, i) => {
      button.hidden = !CHAPTERS[chapter].steps.includes(i);
      button.setAttribute("aria-current", String(i === step));
    });
    chapterButtons.forEach((button, i) => button.setAttribute("aria-current", String(i === chapter)));
    const selected = stepButtons[step];
    stepNav.scrollLeft = selected.offsetLeft - (stepNav.clientWidth - selected.offsetWidth) / 2;
    context.textContent = `BƯỚC ${String(step + 1).padStart(2, "0")} / ${String(STEPS.length).padStart(2, "0")} · ${CHAPTERS[chapter].title}`;
    running.textContent = STEPS[step].title;
    host.setAttribute("aria-label", STEPS[step].title);
    applyStep(STEPS[step], instant);
    schedule();
  }

  function pickStep() {
    const line = stage.getBoundingClientRect().top + stage.clientHeight / 2;
    let best = 0, bestDistance = Infinity;
    articles.forEach((article, index) => {
      const rect = article.getBoundingClientRect();
      const distance = Math.abs((rect.top + rect.bottom) / 2 - line);
      if (distance < bestDistance) { bestDistance = distance; best = index; }
    });
    setStep(best);
  }

  let scrollQueued = false;
  function queuePick() {
    if (!visible || scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => {
      scrollQueued = false;
      if (visible) pickStep();
    });
  }
  addEventListener("scroll", queuePick, { passive: true });
  addEventListener("resize", queuePick);

  const animating = () => visible && viewer.isActive("process") && !document.hidden && !reduceMotion.matches;
  function tick() {
    frame = 0;
    if (!animating()) return;
    renderStep();
    frame = requestAnimationFrame(tick);
  }
  function schedule() { if (!frame && animating()) frame = requestAnimationFrame(tick); }

  async function ensureCompressor() {
    if (mounting) return mounting;
    mounting = (async () => {
      try {
        const { definitions } = await cluster03Connections();
        if (!viewer.isActive("process")) return;
        const model = await viewer.mountCompressor("process");
        if (!model || !viewer.isActive("process")) return;
        compressor = model;
        motion = cluster03MotionFor(model, definitions);
        motion.reset();
        if (step >= 0) applyStep(STEPS[step], true);
      } catch (error) {
        // Keep the original body model available if the detailed mechanism cannot load.
        console.warn("The process section runs without compressor motion:", error);
      } finally { mounting = null; }
    })();
    return mounting;
  }

  viewer.onActivity((name, ready) => {
    if (name === "process") {
      viewer.film("process", { filmPlaying: visible }, { duration: 0 });
      if (!ready) return;
      if (step < 0) setStep(0, true);
      else applyStep(STEPS[step], true);
      void ensureCompressor();
      schedule();
      return;
    }
    if (motion) motion.reset();
    motion = null;
    compressor = null;
    camera = null;
    cameraReady = false;
  });

  function goTo(index) {
    articles[index]?.scrollIntoView({ behavior: reduceMotion.matches ? "instant" : "smooth", block: "center" });
  }
  stepNav.addEventListener("click", event => {
    const button = event.target.closest("[data-goto]");
    if (button) goTo(Number(button.dataset.goto));
  });
  chapterNav.addEventListener("click", event => {
    const button = event.target.closest("[data-chapter-goto]");
    if (button) goTo(CHAPTERS[Number(button.dataset.chapterGoto)].steps[0]);
  });

  if (typeof IntersectionObserver === "undefined") { visible = true; pickStep(); }
  else new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    if (visible) pickStep();
    viewer.film("process", { filmPlaying: visible }, { duration: 0 });
    schedule();
  }).observe(root);
  document.addEventListener("visibilitychange", schedule);
  reduceMotion.addEventListener("change", () => {
    if (reduceMotion.matches && frame) { cancelAnimationFrame(frame); frame = 0; }
    if (step >= 0) applyStep(STEPS[step], true);
    schedule();
  });
}
