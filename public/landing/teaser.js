import * as THREE from "three";
import { cluster03Connections, cluster03MotionFor } from "./motion/shared.js";
import { OPERATION_STAGES, phaseAt } from "./motion/cycle.js";
import { REVEAL_CAMERA_CLEARANCE, REVEAL_MOVES, REVEAL_SHOTS, REVEAL_TIMES, clampRevealAzimuth, offsetsAt, opacityAt } from "./reveal.js";

const clamp = value => Math.max(0, Math.min(1, value));
// Shape-preserving interpolation keeps every camera parameter tied to the same shot times.
function pchip(marks, values) {
  const h = marks.slice(1).map((at, index) => at - marks[index]);
  const secants = h.map((step, index) => (values[index + 1] - values[index]) / step), slopes = Array(values.length);
  if (values.length === 2) slopes.fill(secants[0]);
  else {
    const endpoint = (firstH, nextH, firstD, nextD) => {
      let slope = ((2 * firstH + nextH) * firstD - firstH * nextD) / (firstH + nextH);
      if (Math.sign(slope) !== Math.sign(firstD)) slope = 0;
      else if (Math.sign(firstD) !== Math.sign(nextD) && Math.abs(slope) > Math.abs(3 * firstD)) slope = 3 * firstD;
      return slope;
    };
    slopes[0] = endpoint(h[0], h[1], secants[0], secants[1]);
    slopes[values.length - 1] = endpoint(h.at(-1), h.at(-2), secants.at(-1), secants.at(-2));
    for (let index = 1; index < values.length - 1; index += 1) {
      const before = secants[index - 1], after = secants[index];
      if (before * after <= 0) slopes[index] = 0;
      else {
        const leftWeight = 2 * h[index] + h[index - 1], rightWeight = h[index] + 2 * h[index - 1];
        slopes[index] = (leftWeight + rightWeight) / (leftWeight / before + rightWeight / after);
      }
    }
  }
  return seconds => {
    const time = Math.max(marks[0], Math.min(marks.at(-1), seconds));
    const index = Math.min(marks.length - 2, Math.max(0, marks.findLastIndex(at => time >= at)));
    const progress = (time - marks[index]) / h[index], squared = progress ** 2, cubed = squared * progress;
    return (2 * cubed - 3 * squared + 1) * values[index] + h[index] * (cubed - 2 * squared + progress) * slopes[index]
      + (-2 * cubed + 3 * squared) * values[index + 1] + h[index] * (cubed - squared) * slopes[index + 1];
  };
}

const COMPRESSOR_STAGES = OPERATION_STAGES.filter(stage => ["closing", "tamping", "opening", "ejecting"].includes(stage.phase));
const COMPRESSOR_DURATION = COMPRESSOR_STAGES.reduce((total, stage) => total + stage.durationMs, 0);
const DEBUG_CAMERA_MARKS = [11, 13, 15.5];
const ZERO = new THREE.Vector3();

export function createTeaser({ viewer }) {
  const $ = id => document.getElementById(id), host = $("journey-host");
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const debugSightlines = new URLSearchParams(location.search).get("reveal-debug") === "1";
  let enabled = false, loaded = false, visible = false, playing = false, userPaused = motion.matches;
  let time = 0, previous = null, frame = 0, lighting = "", fastenersHidden = null, first = true, sheen = false;
  let model = null, cameraTargetCurves = null, cameraAzimuth = null, cameraElevation = null, cameraDistance = null;
  let compressorMotion = null, compressorLoading = false, compressorFailed = false;
  let compressorRunning = false, compressorRequest = 0;
  let sightlineChecks = 0, sightlineUnavailable = 0, sightlineBlocked = 0, sightlineExamples = [], sightlineReported = false;
  let cameraPoseMarks = new Set();
  const position = new THREE.Vector3(), target = new THREE.Vector3(), direction = new THREE.Vector3();

  function revealVectors(at) {
    const samples = offsetsAt(at), offsets = {};
    for (const move of REVEAL_MOVES) {
      const vector = new THREE.Vector3();
      for (const [axis, millimeters] of Object.entries(samples[move.group])) vector.addScaledVector(model.machineFrame[axis], millimeters / 1000);
      offsets[move.group] = vector;
    }
    return offsets;
  }
  function buildCamera() {
    const poses = REVEAL_SHOTS.map(({ at, fitPadding, ...shot }) => {
      if (at >= REVEAL_TIMES.OPEN && at < REVEAL_TIMES.COMPRESSOR_START) {
        return viewer.shotPose({ ...shot, revealOffsets: revealVectors(at), fit: true, padding: fitPadding ?? 1.25 });
      }
      if (shot.focus?.includes("nen")) return viewer.shotPose({ ...shot, fit: true, padding: fitPadding ?? 1.25 });
      return viewer.shotPose(shot);
    });
    if (poses.some(pose => !pose)) return false;
    const marks = REVEAL_SHOTS.map(shot => shot.at);
    cameraTargetCurves = ["x", "y", "z"].map(axis => pchip(marks, poses.map(pose => pose.target[axis])));
    cameraAzimuth = pchip(marks, REVEAL_SHOTS.map(shot => clampRevealAzimuth(shot.az)));
    cameraElevation = pchip(marks, REVEAL_SHOTS.map(shot => shot.el));
    cameraDistance = pchip(marks, poses.map(pose => pose.position.distanceTo(pose.target)));
    return true;
  }
  function cameraEnvelope(offsets) {
    const box = model.box.clone();
    for (const [name, rest] of Object.entries(model.revealBoxes)) box.union(rest.clone().translate(offsets[name] || ZERO));
    return box;
  }
  function pushOutOfBox(box) {
    if (!box.containsPoint(position)) return;
    let exit = Infinity;
    for (const axis of ["x", "y", "z"]) {
      const component = direction[axis];
      if (component > 1e-9) exit = Math.min(exit, (box.max[axis] - position[axis]) / component);
      else if (component < -1e-9) exit = Math.min(exit, (box.min[axis] - position[axis]) / component);
    }
    if (Number.isFinite(exit)) position.addScaledVector(direction, exit + .005);
  }
  function distanceOutsideCenterRadius(distance) {
    const relative = target.clone().sub(model.center), minimum = REVEAL_CAMERA_CLEARANCE * model.radius;
    if (relative.clone().addScaledVector(direction, distance).lengthSq() >= minimum ** 2) return distance;
    const projection = relative.dot(direction), discriminant = projection ** 2 + minimum ** 2 - relative.lengthSq();
    return Math.max(distance, -projection + Math.sqrt(Math.max(0, discriminant)) + .005);
  }
  function updateCamera(at, offsets) {
    target.set(cameraTargetCurves[0](at), cameraTargetCurves[1](at), cameraTargetCurves[2](at));
    const az = THREE.MathUtils.degToRad(clampRevealAzimuth(cameraAzimuth(at)));
    const el = THREE.MathUtils.degToRad(cameraElevation(at));
    const { F, L, U } = model.machineFrame;
    direction.copy(F).multiplyScalar(Math.cos(el) * Math.cos(az))
      .addScaledVector(L, Math.cos(el) * Math.sin(az)).addScaledVector(U, Math.sin(el));
    const distance = distanceOutsideCenterRadius(cameraDistance(at));
    position.copy(target).addScaledVector(direction, distance);
    if (at < REVEAL_TIMES.WALL_FADE_START || at >= REVEAL_TIMES.WALL_FADE_END) pushOutOfBox(cameraEnvelope(offsets));
  }
  function machineCoordinates(point) {
    const relative = point.clone().sub(model.center), { F, U, L } = model.machineFrame;
    return { F: +(relative.dot(F) * 1000).toFixed(1), U: +(relative.dot(U) * 1000).toFixed(1), L: +(relative.dot(L) * 1000).toFixed(1) };
  }
  function logCameraPoses(at, offsets) {
    for (const mark of DEBUG_CAMERA_MARKS) {
      if (cameraPoseMarks.has(mark) || at < mark) continue;
      updateCamera(mark, revealVectors(mark));
      const cameraPoint = position.clone(), targetPoint = target.clone();
      updateCamera(at, offsets);
      console.info("[reveal-debug] camera pose", { at: mark, positionMm: machineCoordinates(cameraPoint), targetMm: machineCoordinates(targetPoint) });
      cameraPoseMarks.add(mark);
    }
  }
  function resetSightlineDebug() {
    sightlineChecks = 0; sightlineUnavailable = 0; sightlineBlocked = 0; sightlineExamples = []; sightlineReported = false;
    cameraPoseMarks = new Set();
  }
  function debugSightline(at, offsets) {
    if (!debugSightlines) return;
    const inBeat = at >= REVEAL_TIMES.COMPRESSOR_START && at <= REVEAL_TIMES.COMPRESSOR_END;
    const needsCameraMarks = cameraPoseMarks.size < DEBUG_CAMERA_MARKS.length;
    if ((inBeat || (at > REVEAL_TIMES.COMPRESSOR_END && needsCameraMarks)) && viewer.isActive("journey")) {
      const result = viewer.debugRevealSightline("journey", "nen");
      if (inBeat) {
        sightlineChecks += 1;
        if (!result.ready) sightlineUnavailable += 1;
        else if (Object.keys(result.blockers).length) {
          sightlineBlocked += 1;
          if (sightlineExamples.length < 8) sightlineExamples.push({ at: +at.toFixed(3), blockers: result.blockers });
        }
      }
      if (result.ready) logCameraPoses(at, offsets);
    }
    if (at > REVEAL_TIMES.COMPRESSOR_END && !sightlineReported) {
      sightlineReported = true;
      console.info("[reveal-debug] compressor sightline", { checks: sightlineChecks, unavailable: sightlineUnavailable,
        blocked: sightlineBlocked, examples: sightlineExamples });
    }
  }
  function applyCompressor(at) {
    if (!compressorMotion) return;
    const elapsed = Math.min((at - REVEAL_TIMES.COMPRESSOR_START) / (REVEAL_TIMES.COMPRESSOR_END - REVEAL_TIMES.COMPRESSOR_START) * COMPRESSOR_DURATION, COMPRESSOR_DURATION - 1);
    const phase = phaseAt(elapsed, COMPRESSOR_STAGES);
    compressorMotion.apply(phase.main, phase.lower);
    viewer.highlightHost("journey", compressorMotion.highlights(phase.stage.phase));
    compressorRunning = true;
  }
  function ensureCompressor() {
    if (compressorMotion || compressorLoading || compressorFailed) return;
    compressorLoading = true;
    const request = ++compressorRequest;
    void (async () => {
      try {
        const compressor = await viewer.mountCompressor("journey");
        if (!compressor) return;
        buildCamera();
        const { definitions } = await cluster03Connections();
        const next = cluster03MotionFor(compressor, definitions);
        if (request !== compressorRequest || !enabled) { next.reset(); return; }
        compressorMotion = next; compressorMotion.reset();
        if (viewer.isActive("journey") && time >= REVEAL_TIMES.COMPRESSOR_START && time < REVEAL_TIMES.COMPRESSOR_END) applyCompressor(time);
      } catch (error) {
        compressorFailed = true;
        console.warn("The reveal film runs without compressor motion:", error);
      } finally { compressorLoading = false; }
    })();
  }
  function stopCompressor() {
    if (!compressorRunning) return;
    compressorMotion?.reset(); viewer.highlightHost("journey", []); compressorRunning = false;
  }
  function update() {
    if (!enabled || !loaded) return;
    if (!cameraAzimuth && !buildCamera()) return;
    const at = time;

    const offsets = revealVectors(at);
    viewer.setReveal("journey", offsets);
    viewer.setRevealOpacity("journey", "rightWall", opacityAt("rightWall", at));
    viewer.setRevealOpacity("journey", "rightShell", opacityAt("rightShell", at));

    const hideFasteners = at >= REVEAL_TIMES.OPEN && at < REVEAL_TIMES.SHELL_CLOSE;
    if (fastenersHidden !== hideFasteners) {
      fastenersHidden = hideFasteners; viewer.setPartsVisible("journey", "oc", !hideFasteners);
    }
    const nextLighting = at >= REVEAL_TIMES.STUDIO && at < REVEAL_TIMES.RETURN_END ? "studio" : "flat";
    if (lighting !== nextLighting) {
      lighting = nextLighting; viewer.film("journey", { lighting }, { duration: 0 });
    }
    viewer.setScreenLevel("journey", clamp((at - REVEAL_TIMES.SCREEN_START) / REVEAL_TIMES.SCREEN_DURATION));

    updateCamera(at, offsets);
    viewer.setCamera("journey", position, target);

    if (at >= REVEAL_TIMES.WALL_FADE_START && at < REVEAL_TIMES.COMPRESSOR_END && viewer.isActive("journey")) {
      ensureCompressor();
      if (at >= REVEAL_TIMES.COMPRESSOR_START) applyCompressor(at);
    } else stopCompressor();
    debugSightline(at, offsets);

    host.style.setProperty("--teaser-opacity", first && !motion.matches ? clamp(at) : 1);
    if (!sheen && first && playing && !motion.matches) { sheen = true; $("teaser-sheen").classList.add("is-playing"); }
  }
  function tick(now) {
    frame = 0; if (!playing) return;
    if (previous !== null) time += Math.max(0, now - previous) / 1000;
    previous = now;
    if (time >= REVEAL_TIMES.LOOP) { time %= REVEAL_TIMES.LOOP; first = false; resetSightlineDebug(); }
    update(); frame = requestAnimationFrame(tick);
  }
  function gate() {
    if (!enabled) return;
    const next = loaded && visible && !document.hidden && viewer.isActive("journey") && !userPaused;
    if (next === playing) return;
    playing = next; previous = null;
    if (frame) cancelAnimationFrame(frame); frame = 0;
    viewer.film("journey", { filmPlaying: playing }, { duration: 0 });
    update(); if (playing) frame = requestAnimationFrame(tick);
  }
  document.addEventListener("visibilitychange", gate);
  viewer.onActivity(() => { if (enabled) { gate(); update(); } });
  motion.addEventListener("change", () => {
    userPaused = motion.matches;
    if (motion.matches) { time = REVEAL_TIMES.END; first = false; sheen = false; $("teaser-sheen").classList.remove("is-playing"); }
    else { time = 0; first = true; sheen = false; $("teaser-sheen").classList.remove("is-playing"); }
    if (enabled) { gate(); update(); }
  });
  if (typeof IntersectionObserver !== "undefined") {
    const observer = new IntersectionObserver(entries => { visible = entries[0].intersectionRatio >= .5; gate(); }, { threshold: [0, .5, 1] }); observer.observe(host);
  } else {
    const check = () => { const rect = host.getBoundingClientRect(); visible = Math.max(0, Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0)) >= rect.height * .5; gate(); };
    window.addEventListener("scroll", check, { passive: true }); window.addEventListener("resize", check); check();
  }
  return {
    ready(readyModel) { model = readyModel || viewer.getModel("journey"); loaded = !!model; update(); gate(); },
    enable() {
      enabled = true; time = motion.matches ? REVEAL_TIMES.END : 0; userPaused = motion.matches;
      resetSightlineDebug();
      previous = null; lighting = ""; fastenersHidden = null; first = true; sheen = false;
      $("teaser-sheen").classList.remove("is-playing");
      viewer.film("journey", { pathControlled: true, filmPlaying: false, focus: null, focusParts: null, clearClusters: null, ghostOpacity: null,
        tint: null, revealActive: false, shellMode: "show", lighting: "flat", annotationIds: [], markerIds: [], highlightIds: [],
        flows: [], flowOpacity: {}, cutoffs: {} }, { duration: 0 });
      viewer.setPartsVisible("journey", "oc", true); viewer.setScreenLevel("journey", 0);
      update(); gate();
    },
    disable() {
      if (!enabled) return;
      enabled = false; playing = false; previous = null; first = false; compressorRequest += 1;
      if (frame) cancelAnimationFrame(frame); frame = 0;
      stopCompressor(); compressorMotion?.reset(); viewer.highlightHost("journey", []);
      viewer.setReveal("journey", null); viewer.setPartsVisible("journey", "oc", true); viewer.setScreenLevel("journey", 1);
      viewer.film("journey", { pathControlled: false, filmPlaying: false, revealActive: false, focus: null, focusParts: null,
        clearClusters: null, ghostOpacity: null, tint: null, shellMode: "show", lighting: "studio", flows: [], flowOpacity: {}, highlightIds: [] });
      host.style.removeProperty("--teaser-opacity"); $("teaser-sheen").classList.remove("is-playing");
    }
  };
}
