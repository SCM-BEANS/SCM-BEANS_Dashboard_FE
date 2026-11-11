// Lucian UX/UI Prompt #201 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#201
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { boardFlowData, boardFlowAt } from "./flow.js";

// Front face of the 13.77 mm STM32 package, measured in control.glb's CAD coordinates.
const MCU = { x: .070758615, y: .04573868, z: .001598931, half: .0075 };
const escapeText = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const curve = value => value < .5 ? 2 * value * value : 1 - (-2 * value + 2) ** 2 / 2;

export function createBoardDiagram(root) {
  root.classList.add("u201");
  root.innerHTML = `<div class="u201-board" role="img" aria-label="Bo điều khiển Uni Cafe V2.25 và chip STM32F407"><span class="u201-loading" role="status">Đang tải bo mạch…</span></div><svg class="u201-cv" aria-hidden="true"><g class="u201-wires"></g><polygon class="u201-chip-ring"/></svg><div class="u201-mcu"><span class="u201-s" aria-hidden="true"></span><span><b>STM32F407</b><small>Xử lý lệnh</small></span></div><div class="u201-ls" role="list" tabindex="0" aria-label="Các bước của luồng điều khiển"></div><div class="u201-announcement sr-only" role="status"></div>`;
  const host = root.querySelector(".u201-board"), svg = root.querySelector(".u201-cv");
  const wires = root.querySelector(".u201-wires"), ring = root.querySelector(".u201-chip-ring");
  const list = root.querySelector(".u201-ls"), mcu = root.querySelector(".u201-mcu");
  const announcement = root.querySelector(".u201-announcement");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let renderer, scene, camera, part, board, loading = false, visible = false;
  let data, signature = "", nodes = [], paths = [], dots = [], lengths = [], anchor;
  let frame = 0, started = 0, pausedAt = 0, playing = false, stateKey = "", compactState = "";

  function routes() {
    if (!anchor || !nodes.length) return;
    const bounds = root.getBoundingClientRect();
    const point = node => { const rect = node.getBoundingClientRect(); return { x: rect.left - bounds.left, y: rect.top - bounds.top + rect.height / 2 }; };
    const source = point(nodes[0]);
    const inputPath = `M${source.x} ${source.y}C${source.x - 50} ${source.y},${anchor.x} ${anchor.y - 60},${anchor.x} ${anchor.y}`;
    const outputPaths = nodes.slice(1).map((node, index) => {
      const end = point(node), startX = anchor.x + 8;
      return `M${startX} ${anchor.y}C${startX + 50 + index * 6} ${anchor.y},${end.x - 35} ${end.y},${end.x} ${end.y}`;
    });
    [inputPath, ...outputPaths].forEach((d, index) => paths[index].setAttribute("d", d));
    lengths = paths.map(path => path.getTotalLength());
  }

  function layout() {
    if (!board) return;
    const width = root.clientWidth, height = root.clientHeight;
    let compact = width < 460 || height < 340;
    root.classList.toggle("is-compact", compact);
    if (!width || !height || !host.clientWidth || !host.clientHeight) {
      anchor = null;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      return;
    }
    const nodeWidth = Math.max(168, Math.min(196, width * .34));
    if (!compact) nodes.forEach((node, index) => {
      node.style.width = `${nodeWidth}px`;
      node.style.left = `${width - nodeWidth - 12}px`;
    });
    const outputHeight = nodes.slice(1).reduce((sum, node) => sum + node.offsetHeight, 0) + Math.max(0, nodes.length - 2) * 18;
    if (!compact && nodes.length && height < outputHeight + nodes[0].offsetHeight + 116) {
      compact = true; root.classList.add("is-compact");
    }
    renderer.setSize(host.clientWidth, host.clientHeight, false);
    camera.aspect = host.clientWidth / host.clientHeight;
    const size = new THREE.Box3().setFromObject(board).getSize(new THREE.Vector3());
    const distance = Math.max(size.y, size.x / camera.aspect) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.24;
    camera.position.set(distance * .10, -distance * .10, distance);
    camera.lookAt(0, 0, 0); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
    renderer.render(scene, camera);
    const rootRect = root.getBoundingClientRect(), hostRect = host.getBoundingClientRect();
    const project = (x, y) => {
      const point = part.localToWorld(new THREE.Vector3(x, y, MCU.z + .0001)).project(camera);
      return { x: hostRect.left - rootRect.left + (point.x + 1) * host.clientWidth / 2, y: hostRect.top - rootRect.top + (1 - point.y) * host.clientHeight / 2 };
    };
    anchor = project(MCU.x, MCU.y);
    if (!compact && nodes.length) {
      let top = Math.max(nodes[0].offsetHeight + 92, Math.min(height - outputHeight - 24, anchor.y - outputHeight / 2));
      nodes[0].style.top = `${Math.max(60, top - nodes[0].offsetHeight - 26)}px`;
      nodes.slice(1).forEach(node => { node.style.top = `${top}px`; top += node.offsetHeight + 18; });
    }
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => project(MCU.x + x * MCU.half, MCU.y + y * MCU.half));
    ring.setAttribute("points", corners.map(point => `${point.x},${point.y}`).join(" "));
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    mcu.style.left = `${anchor.x}px`; mcu.style.top = `${Math.max(...corners.map(point => point.y)) + 8}px`;
    routes();
    schedule();
  }

  function setState(node, state) {
    node.classList.toggle("is-run", state === "run"); node.classList.toggle("is-done", state === "done");
  }

  function paint(elapsed) {
    if (!data || !anchor) return;
    const state = boardFlowAt(reduced.matches ? Infinity : elapsed, data.outputs.length);
    const key = [state.input, state.process, ...state.outputs].join(":");
    if (key !== stateKey) {
      stateKey = key;
      setState(nodes[0], state.input); setState(mcu, state.process);
      root.dataset.phase = state.process;
      state.outputs.forEach((value, index) => setState(nodes[index + 1], value));
      [...nodes, mcu].forEach((node, index) => {
        const value = index === nodes.length ? state.process : index === 0 ? state.input : state.outputs[index - 1];
        const text = value === "done" ? "hoàn tất" : value === "run" ? "đang thực hiện" : "chờ";
        node.setAttribute("aria-label", `${node.dataset.description || node.textContent.trim()}, ${text}`);
      });
      if (root.classList.contains("is-compact") && compactState !== key) {
        compactState = key;
        const active = state.outputs.findIndex(value => value === "run");
        list.scrollTop = active >= 0 ? nodes[active + 1].offsetTop - 8 : 0;
        routes();
      }
    }
    paths.forEach((path, index) => {
      const progress = index === 0 ? state.inputTravel : state.outputTravel;
      path.classList.toggle("is-on", progress > 0);
      const dot = dots[index], moving = progress > 0 && progress < 1 && !reduced.matches;
      dot.style.opacity = moving ? "1" : "0";
      if (moving) { const point = path.getPointAtLength(lengths[index] * curve(progress)); dot.setAttribute("cx", point.x); dot.setAttribute("cy", point.y); }
    });
    if (state.done) {
      playing = false;
      announcement.textContent = "Luồng điều khiển hoàn tất.";
    }
  }

  function tick(now) {
    frame = 0;
    if (!playing || !visible || !anchor || document.hidden) return;
    paint(now - started);
    if (playing && !reduced.matches) frame = requestAnimationFrame(tick);
  }
  function schedule() { if (!frame && playing && visible && board && anchor && !document.hidden) frame = requestAnimationFrame(tick); }
  function start() {
    if (!board || !data) return;
    if (frame) cancelAnimationFrame(frame);
    frame = 0; started = performance.now(); pausedAt = !visible || document.hidden ? started : 0;
    playing = true; stateKey = ""; compactState = "";

    list.scrollTop = 0; routes(); paint(0); schedule();
  }
  function visibility() {
    const now = performance.now();
    if (!visible || document.hidden) { if (!pausedAt) pausedAt = now; if (frame) cancelAnimationFrame(frame); frame = 0; }
    else { if (pausedAt) started += now - pausedAt; pausedAt = 0; schedule(); }
  }

  async function load() {
    if (loading) return;
    loading = true;
    const draco = new DRACOLoader();
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.toneMapping = THREE.ACESFilmicToneMapping;
      scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(32, 1, .001, 10);
      const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
      scene.environment = pmrem.fromScene(room).texture; room.dispose(); pmrem.dispose();
      scene.add(new THREE.HemisphereLight(0xffffff, 0x61736a, 2));
      const light = new THREE.DirectionalLight(0xffffff, 3); light.position.set(-1, 2, 3); scene.add(light);
      draco.setDecoderPath("/draco-gltf/");
      const gltf = await new GLTFLoader().setDRACOLoader(draco).loadAsync("/models/boards/control.glb");
      part = gltf.scene.children.find(node => /^PCB_Uni_Cafe_Machine_Control/.test(node.userData.name || node.name));
      if (!part) throw new Error("Missing control board part");
      board = new THREE.Group(); board.add(part); scene.add(board);
      part.position.sub(new THREE.Box3().setFromObject(part).getCenter(new THREE.Vector3()));
      host.replaceChildren(renderer.domElement); root.classList.add("is-ready"); layout(); start();
    } catch (error) {
      console.warn("Cannot display control board:", error); renderer?.dispose();
      host.textContent = "Chưa tải được bo mạch"; announcement.textContent = "Chưa tải được luồng điều khiển";
    } finally { draco.dispose(); }
  }

  new ResizeObserver(layout).observe(root);
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; if (visible) void load(); visibility(); }).observe(root);
  document.addEventListener("visibilitychange", visibility);
  reduced.addEventListener("change", () => { if (data && board) start(); });
  list.addEventListener("scroll", routes, { passive: true });
  return {
    update(active, current) {
      const next = boardFlowData(active, current), key = JSON.stringify(next);
      if (key === signature) return;
      signature = key; data = next;
      if (frame) cancelAnimationFrame(frame); frame = 0;
      const cards = [data.input, ...data.outputs];
      list.innerHTML = cards.map((card, index) => `<div class="u201-nd" role="listitem" data-node="${index}" data-description="${escapeText(`${card.title}, ${card.detail || card.pins || ""}`)}" title="${escapeText(card.detail || card.pins || "")}"><span class="u201-ic" aria-hidden="true">${String(index + 1).padStart(2, "0")}</span><span class="u201-tx"><b>${escapeText(card.title)}</b><span>${escapeText(card.pins || "")}</span></span><span class="u201-s" aria-hidden="true"></span></div>`).join("");
      nodes = [...list.querySelectorAll(".u201-nd")]; mcu.querySelector("small").textContent = data.process;
      mcu.dataset.description = `STM32F407, ${data.process}`;
      wires.innerHTML = cards.map(() => `<path/><circle r="4"/>`).join("");
      paths = [...wires.querySelectorAll("path")]; dots = [...wires.querySelectorAll("circle")];
      layout(); start();
    }
  };
}
