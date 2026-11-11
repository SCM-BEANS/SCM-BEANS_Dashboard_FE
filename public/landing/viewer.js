import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { OutlinePass } from "three/addons/postprocessing/OutlinePass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { annotationData, resolveParts, partAnchor } from "./annotations.js";
import { createSignals } from "./signals.js";
import { createFlows } from "./flows.js";
import { applyInteriorMaterials, applyMetalEnvironment, applyStudioMaterials, createStudioFinish, DECOR_ENABLED } from "./finish.js";
import { MODELS, RULES, DEFAULT_VIEW } from "./clusters.js";
import { REVEAL_GROUPS } from "./reveal.js";

const rawName = object => object.userData.name || object.name || "";
const baseName = name => name.replace(/-\d+$/, "").replace(/\.(step|sldprt|sldasm)$/i, "").trim();
const hasMesh = object => {
  let found = false;
  object.traverse(child => { if (child.isMesh) found = true; });
  return found;
};
const materials = mesh => Array.isArray(mesh.material) ? mesh.material : [mesh.material];
const ENCLOSED_CLUSTERS = new Set(["nen", "nhiet", "nuoc", "dien", "xoay"]);
// Maps cluster-03/final.glb onto the may_ne_coffe block of the body GLB (both in their own file frames).
// Same part at a quarter-turn: found by matching sampled vertices over the 24 axis rotations, then refining the
// offset. Median gap 0.18 mm, 90% of samples within 0.75 mm, 94% of samples matched (measured 04/11/2026).
const COMPRESSOR_FIT = new THREE.Matrix4().fromArray([0, 0, -1, 0, -1, 0, 0, 0, 0, 1, 0, 0, -0.5697153, 0.2064912, -0.0941819, 1]);
// Hosts that play a scripted show: no drag, the dark-stage look and the outline glow.
const SHOW_HOSTS = new Set(["journey", "process"]);
const FLAT_EDGE_RULES = new Set(["paint", "glass", "frosted", "lid", "bezel", "tablet", "steel", "grate", "trayInner", "chrome"]);
const ease = t => t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
const ZERO = new THREE.Vector3();
const BOARDS = [
  { file: "./models/boards/control.glb", match: /^PCB_Uni_Cafe_Machine_Control/ },
  { file: "./models/boards/load.glb", match: /^PCB_Load_V2/ }
];

function mountBoard(body, board, spec) {
  // The saved SOLIDWORKS view is separate from the identity-transform part root.
  for (const node of [...board.scene.children]) {
    if (rawName(node) === "current") node.removeFromParent();
  }
  const part = board.scene.children.find(node => spec.match.test(rawName(node)));
  let mount;
  body.scene.traverse(node => {
    if (!mount && spec.match.test(node.userData.name || "")) mount = node;
  });
  if (!mount || !part) {
    console.warn(`Cannot mount circuit board ${spec.file}: missing mount or part root`);
    return;
  }
  // Keep the mount's CAD placement and every component's local transform intact.
  mount.add(part);
}

function partLabel(spec, name) {
  const base = baseName(name);
  if (spec.dict?.[base]) return spec.dict[base];
  const arm = /^arm_(left|right)_(\d+)$/.exec(base);
  return arm ? `Tay đòn ${arm[1] === "left" ? "trái" : "phải"} ${arm[2]}` : base;
}

// Match before flattening: a nested pump must override its heat assembly ancestor.
function bodyRule(mesh) {
  for (let object = mesh; object; object = object.parent) {
    const rule = RULES.find(candidate => candidate.re.test(rawName(object)));
    if (rule) return rule;
  }
  return RULES.find(rule => rule.key === "khung");
}

function prepare(gltf, id, data, requestRender) {
  const spec = MODELS[id], root = gltf.scene, holder = new THREE.Group();
  const annotations = resolveParts(root, id, data);
  const drop = [];
  root.traverse(object => { if (object.isLight || object.isCamera) drop.push(object); });
  drop.forEach(object => object.removeFromParent());
  if (id === "body") applyStudioMaterials(root);
  applyInteriorMaterials(root);
  root.traverse(object => {
    if (!object.isMesh) return;
    const own = material => {
      const clone = material.clone();
      clone.userData.base = { color: clone.color?.clone(), opacity: clone.opacity, transparent: clone.transparent, depthWrite: clone.depthWrite };
      if (clone.emissive) {
        clone.userData.base.emissive = clone.emissive.clone();
        clone.userData.base.emissiveIntensity = clone.emissiveIntensity;
      }
      return clone;
    };
    object.material = Array.isArray(object.material) ? object.material.map(own) : own(object.material);
    object.userData.originalMaterial = object.material;
  });
  holder.add(root);
  root.updateMatrixWorld(true);
  const nodeMap = new Map(), initialMatrices = new Map();
  root.traverse(object => {
    const name = rawName(object);
    if (!name) return;
    if (!nodeMap.has(name)) nodeMap.set(name, object);
    if (!initialMatrices.has(name)) initialMatrices.set(name, object.matrixWorld.toArray());
  });
  const original = new THREE.Box3().setFromObject(root), center = original.getCenter(new THREE.Vector3());
  const F = new THREE.Vector3(1, 0, 0), U = new THREE.Vector3(0, 1, 0);
  if (id === "body") {
    const front = new THREE.Box3();
    root.traverse(mesh => {
      if (!mesh.isMesh) return;
      for (let object = mesh; object; object = object.parent) {
        if (/^CV05_Mattruoc/.test(rawName(object))) { front.expandByObject(mesh); break; }
        if (object === root) break;
      }
    });
    if (!front.isEmpty()) {
      const direction = front.getCenter(new THREE.Vector3()).sub(center); direction.y = 0;
      if (direction.lengthSq() > 1e-12) F.copy(direction).normalize();
    }
  }
  const machineFrame = { F, U, L: new THREE.Vector3().crossVectors(F, U).normalize() };
  if (id === "body") {
    // The compressor (may_ne_coffe) is the newer version of the old brewing unit (Mayphacafe) and fills the same space.
    const retired = [];
    root.traverse(object => { if (/^Mayphacafe/i.test(rawName(object))) retired.push(object); });
    for (const object of retired) object.removeFromParent();
  }
  if (id !== "c03") root.position.set(-center.x, -original.min.y, -center.z);
  holder.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(holder), entries = new Map();
  const decor = id === "body" ? createStudioFinish(root, holder, box, requestRender) : null;
  let parts = [];
  if (id !== "body") {
    let assembly = root;
    for (;;) {
      const kids = assembly.children.filter(hasMesh);
      if (kids.length === 1 && kids[0].children.some(child => child.userData.name && hasMesh(child))) assembly = kids[0];
      else break;
    }
    parts = assembly.children.filter(hasMesh);
    if (!parts.length) parts = [assembly];
    if (spec.expand) parts = parts.flatMap(part => spec.expand.test(rawName(part)) ? part.children.filter(hasMesh) : [part]);
  }
  // Motion models keep their CAD hierarchy: the kinematics move part nodes, so their meshes must stay under them.
  const keepHierarchy = id === "c03";
  const assignments = [];
  root.traverse(mesh => {
    if (!mesh.isMesh) return;
    let owner = mesh;
    while (!owner.userData.name && owner.parent && owner !== root) owner = owner.parent;
    let rule;
    if (id === "body") {
      const board = annotations.some(part => ["pcb-control", "pcb-load"].includes(part.id) && part.meshes.includes(mesh));
      mesh.userData.brainBoard = board;
      rule = board ? RULES.find(rule => rule.key === "dien") : bodyRule(mesh);
    }
    else {
      let part = mesh;
      while (!parts.includes(part) && part.parent && part !== root) part = part.parent;
      rule = { key: baseName(rawName(part)), title: partLabel(spec, rawName(part)) };
      owner = part;
    }
    if (!entries.has(rule.key)) entries.set(rule.key, { ...rule, group: keepHierarchy ? null : new THREE.Group(), explodeOffset: new THREE.Vector3(), revealOffset: new THREE.Vector3(), nodes: [], members: [], parts: new Set(), tris: 0 });
    const entry = entries.get(rule.key);
    if (keepHierarchy && !entry.nodes.includes(owner)) entry.nodes.push(owner);
    entry.members.push(mesh); entry.parts.add(owner.uuid);
    entry.tris += (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3;
    let revealName = null;
    if (id === "body") for (let node = mesh; node; node = node.parent) {
      const match = Object.entries(REVEAL_GROUPS).find(([, group]) => group.entry === rule.key && group.re?.test(rawName(node)));
      if (match) { revealName = match[0]; break; }
      if (node === root) break;
    }
    assignments.push([mesh, entry, revealName]);
  });
  const revealGroups = {}, revealEntries = {}, revealDecor = {}, woodDecor = {}, revealBoxes = {};
  if (keepHierarchy) {
    for (const entry of entries.values()) for (const node of entry.nodes) node.userData.restPosition = node.position.clone();
  } else {
    for (const entry of entries.values()) holder.add(entry.group);
    if (id === "body") for (const [name, group] of Object.entries(REVEAL_GROUPS)) {
      const entry = entries.get(group.entryKey || group.entry);
      if (!entry?.group) continue;
      if (group.entryKey) {
        revealGroups[name] = entry.group; revealEntries[name] = entry;
      } else {
        const child = new THREE.Group(); child.name = `reveal-${name}`;
        child.userData.revealRestPosition = child.position.clone(); entry.group.add(child); revealGroups[name] = child;
      }
    }
    // Independent groups preserve world transforms and avoid moving nested children twice.
    for (const [mesh, entry, revealName] of assignments) (revealGroups[revealName] || entry.group).attach(mesh);
    if (id === "body") for (const [decorName, revealName] of [["left-logo", "leftShell"], ["right-logo", "rightShell"], ["studio-screen", "hmi"]]) {
      const mesh = decor?.getObjectByName(decorName), group = revealGroups[revealName];
      if (mesh && group) { group.attach(mesh); revealDecor[decorName] = mesh; }
    }
    if (id === "body") for (const name of ["studio-wood-band", "wood-mark", "wood-wordmark"]) {
      const mesh = decor?.getObjectByName(name);
      if (mesh) woodDecor[name] = mesh;
    }
    root.removeFromParent();
  }
  if (id === "body") {
    holder.updateMatrixWorld(true);
    for (const [name, group] of Object.entries(revealGroups)) revealBoxes[name] = new THREE.Box3().setFromObject(group);
  }
  for (const entry of entries.values()) {
    const bounds = new THREE.Box3();
    for (const mesh of entry.members) bounds.expandByObject(mesh);
    entry.center = bounds.getCenter(new THREE.Vector3());
    entry.tris = Math.round(entry.tris);
  }
  return { annotations, holder, machineFrame, decor, revealGroups, revealEntries, revealDecor, woodDecor, revealBoxes, revealOffsets: {}, revealOpacity: {}, rootOffset: root.position.clone(), entries: [...entries.values()], box, center: box.getCenter(new THREE.Vector3()), radius: box.getSize(new THREE.Vector3()).length() / 2, nodeMap, initialMatrices };
}

export function createViewer(annotations, data, brainData) {
  // The standalone compressor uses Z-up CAD; reuse its installed orientation for this presentation only.
  const syncPresentation = new THREE.Group();
  syncPresentation.quaternion.setFromRotationMatrix(COMPRESSOR_FIT);
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const coarsePointer = matchMedia("(pointer: coarse)");
  const screenColor = new THREE.Color(), screenDark = new THREE.Color("#111111"), screenLight = new THREE.Color("#ffffff");
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.localClippingEnabled = true;
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  const canvas = renderer.domElement;
  canvas.setAttribute("aria-label", "Mô hình 3D máy pha Dolores. Kéo để xoay.");
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(35, 1, .001, 100);
  // Post-processing renders into its own target, which skips the canvas antialiasing: give it 4x MSAA so edges stay clean.
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { samples: 4, type: THREE.HalfFloatType }));
  composer.addPass(new RenderPass(scene, camera));
  const outline = new OutlinePass(new THREE.Vector2(1, 1), scene, camera);
  outline.visibleEdgeColor.set("#b81724"); outline.hiddenEdgeColor.set("#39070b");
  outline.edgeStrength = 4; outline.edgeThickness = 1.5; outline.edgeGlow = 0; outline.enabled = false;
  composer.addPass(outline); composer.addPass(new OutputPass());
  const flows = createFlows(scene), signals = createSignals(scene);
  const xrayMaterial = new THREE.MeshBasicMaterial({ color: "#8a9696", transparent: true, opacity: .07, depthWrite: false });
  const edgeMaterial = new THREE.LineBasicMaterial({ color: "#706561", transparent: true, opacity: .35, depthWrite: false });
  const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment(renderer);
  const environment = pmrem.fromScene(room, .04);
  scene.environment = environment.texture; room.dispose(); pmrem.dispose();
  applyMetalEnvironment(renderer);
  const light = new THREE.DirectionalLight(0xffffff, 1.1);
  light.position.set(2, 4, 3); scene.add(light);
  const rimLight = new THREE.DirectionalLight(0xffffff, .6);
  rimLight.position.set(-2, 3, 2.5); scene.add(rimLight);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true; controls.dampingFactor = .09;
  controls.enablePan = false; controls.autoRotateSpeed = .5;
  const loader = new GLTFLoader(), draco = new DRACOLoader();
  loader.setDRACOLoader(draco);
  const dracoReady = fetch("/draco-gltf/draco_decoder.wasm", { method: "HEAD" })
    .then(response => {
      if (!response.ok) throw new Error("Draco");
      draco.setDecoderPath("/draco-gltf/");
    }).catch(() => {
      draco.setDecoderPath("/draco-gltf/"); draco.setDecoderConfig({ type: "js" });
    });
  const hosts = new Map(), cache = new Map(), pending = new Map(), progress = new Map(), listeners = new Set();
  const revealDebug = new URLSearchParams(location.search).get("reveal-debug") === "1";
  let compressorCentersLogged = false;
  let active = null, current = null, token = 0, dirty = true, animation = null, frame = 0, previous = 0;
  const activityListeners = new Set();
  let baseHighlight = [], motionHighlight = null;
  let wipe = null;
  let explodeTween = null, outlineTween = null, shellTween = null, filmDrift = 0, appliedDrift = 0, filmScale = 1.5, slowFrames = 0, fastFrames = 0;
  const activity = () => activityListeners.forEach(callback => callback(active?.name, !!current));

  // Console inspection of hopper edges on the currently active host.
  window.__doloresDebug = {
    glassEdges: () => (current?.entries || []).flatMap(entry => entry.members
      .filter(mesh => mesh.userData.glassEdges)
      .map(mesh => ({
        visible: mesh.userData.glassEdges.visible,
        opacity: mesh.userData.glassEdges.material.opacity,
        parentVisible: mesh.visible
      })))
  };

  function notify(id, percent, error = null) {
    progress.set(id, { percent, error });
    for (const host of hosts.values()) if (host.state.modelId === id) status(host);
    listeners.forEach(callback => callback({ modelId: id, percent, error }));
  }
  function status(host) {
    const id = host.state.modelId, state = progress.get(id);
    const ready = cache.has(id);
    host.element.classList.toggle("model-ready", ready);
    host.message.hidden = ready;
    host.message.classList.toggle("load-error", !!state?.error);
    host.message.textContent = state?.error
      ? "Chưa tải được mô hình 3D. Hãy tải lại trang."
      : `Đang tải mô hình… ${Math.round(state?.percent || 0)}%`;
  }
  function load(id) {
    if (cache.has(id)) return Promise.resolve(cache.get(id));
    if (pending.has(id)) return pending.get(id);
    const spec = MODELS[id];
    const task = (async () => {
      try {
        notify(id, 0); await dracoReady;
        const bodyTask = loader.loadAsync("/models/" + spec.file, event => {
          notify(id, Math.min(99, event.loaded / (event.total || spec.mb * 1e6) * 100));
        });
        const boards = id === "body" ? BOARDS : [];
        // Keep progress below 100 until the body and both optional boards finish.
        const [gltf, ...loadedBoards] = await Promise.all([
          bodyTask,
          ...boards.map(board => loader.loadAsync(board.file).catch(error => {
            console.warn(`Cannot load circuit board ${board.file}`, error);
            return null;
          }))
        ]);
        loadedBoards.forEach((board, index) => { if (board) mountBoard(gltf, board, boards[index]); });
        const model = prepare(gltf, id, await annotationData, requestRender); cache.set(id, model); notify(id, 100); return model;
      } catch (error) {
        console.warn(`Model ${id} did not load. Run node serve.mjs with SCM-BEANS_Dashboard_FE next to this repo, or set DASHBOARD_PUBLIC.`, error);
        notify(id, 0, error); throw error;
      }
      finally { pending.delete(id); }
    })();
    pending.set(id, task); return task;
  }
  function requestRender() {
    dirty = true;
    if (active && !document.hidden && !frame) frame = requestAnimationFrame(loop);
  }
  controls.addEventListener("change", requestRender);
  controls.addEventListener("start", () => { animation = null; });
  controls.addEventListener("end", saveCamera);

  function resize() {
    if (!active) return;
    const { clientWidth: width, clientHeight: height } = active.element;
    if (!width || !height) return;
    // The full-bleed film renders at a lower pixel ratio, lowered further if playback runs slow.
    // Only the full-bleed teaser trims its resolution (and only while it plays slowly); the other stages render sharp.
    const ratio = active.name === "journey" ? Math.min(devicePixelRatio, width > 1400 ? 1.25 : 1.5, filmScale) : Math.min(devicePixelRatio, 1.75);
    if (renderer.getPixelRatio() !== ratio) { renderer.setPixelRatio(ratio); composer.setPixelRatio(ratio); }
    renderer.setSize(width, height, false); composer.setSize(width, height);
    const scale = coarsePointer.matches ? .5 : 1;
    outline.resolution.set(width * scale, height * scale);
    outline.setSize(width * renderer.getPixelRatio() * scale, height * renderer.getPixelRatio() * scale);
    camera.aspect = width / height;
    if (active.state.pathControlled && active.pathPose) {
      const { position, target } = active.pathPose;
      camera.position.copy(position).sub(target).multiplyScalar(Math.max(1, height / width)).add(target);
      controls.target.copy(target);
      active.pose.position.copy(camera.position);
    }
    // The transparent header covers the top of the film, so the subject stays centred in the full stage.
    camera.clearViewOffset();
    requestRender();
  }
  function applyExplode(model, amount) {
    for (const entry of model.entries) {
      const direction = entry.center.clone().sub(model.center); direction.y *= .6;
      const length = direction.length();
      const offset = entry.shell || model.entries.length < 2 ? new THREE.Vector3()
        : (length < 1e-6 ? new THREE.Vector3(0, 1, 0) : direction.divideScalar(length))
          .multiplyScalar((length * 1.15 + model.radius * .12) * amount);
      if (entry.group) { entry.explodeOffset.copy(offset); entry.group.position.copy(offset).add(entry.revealOffset || ZERO); continue; }
      for (const node of entry.nodes) {
        node.parent.updateWorldMatrix(true, false);
        const local = node.parent.worldToLocal(offset.clone()).sub(node.parent.worldToLocal(new THREE.Vector3()));
        node.position.copy(node.userData.restPosition).add(local);
      }
    }
    model.holder.updateMatrixWorld(true);
  }
  function localOffset(parent, offset) {
    parent.updateWorldMatrix(true, false);
    return parent.worldToLocal(offset.clone()).sub(parent.worldToLocal(new THREE.Vector3()));
  }
  function updateWoodVisibility(model) {
    const moved = ["roofShell", "leftShell", "rightShell"].some(name => model.revealOffsets[name]?.lengthSq() > 1e-12);
    for (const mesh of Object.values(model.woodDecor)) mesh.visible = !moved;
  }
  function applyRevealOpacity(model, name, opacity) {
    const group = model.revealGroups[name];
    if (!group) return;
    group.traverse(mesh => {
      if (!mesh.isMesh) return;
      const source = mesh.userData.originalMaterial || mesh.material;
      const originals = Array.isArray(source) ? source : [source];
      for (const [index, material] of materials(mesh).entries()) {
        const original = originals[index] || originals[0];
        const base = original?.userData.base || {};
        const baseline = original ? (original.userData.revealBase ||= {
          opacity: base.opacity ?? original.opacity ?? 1,
          transparent: base.transparent ?? original.transparent ?? false,
          depthWrite: base.depthWrite ?? original.depthWrite ?? true
        }) : {};
        material.opacity = (baseline.opacity ?? 1) * opacity;
        material.depthWrite = opacity < 1 ? false : (baseline.depthWrite ?? true);
        const transparent = opacity < 1 || (baseline.transparent ?? false);
        if (material.transparent !== transparent) { material.transparent = transparent; material.needsUpdate = true; }
      }
    });
  }
  function applyRevealOpacities(model) {
    if (model !== cache.get("body") || active?.name !== "journey" || current !== model) return;
    for (const [name, opacity] of Object.entries(model.revealOpacity || {})) applyRevealOpacity(model, name, opacity);
  }
  function resetReveal(model) {
    if (!model?.revealGroups) return;
    for (const name of Object.keys(model.revealOpacity)) applyRevealOpacity(model, name, 1);
    model.revealOpacity = {};
    model.revealOffsets = {};
    for (const [name, group] of Object.entries(model.revealGroups)) {
      model.revealOffsets[name] = new THREE.Vector3();
      const entry = model.revealEntries[name];
      if (entry) entry.revealOffset.set(0, 0, 0);
      else group.position.copy(group.userData.revealRestPosition);
    }
    const journey = hosts.get("journey");
    if (journey) journey.state.revealActive = false;
    updateWoodVisibility(model);
    if (model === cache.get("body") && journey?.name === active?.name && current === model) {
      applyExplode(model, journey.explodeAmount ?? journey.state.explode);
      applyLook(model, journey.state); requestRender();
    }
  }
  // The film and the machine-to-platform demo are shows, not viewers: they never take drag, zoom or picks.
  // Detail always does; brain only with a mouse.
  const canInteract = name => name === "detail" || (!SHOW_HOSTS.has(name) && name !== "sync" && !coarsePointer.matches);
  const outlineLevel = () => ["process", "sync"].includes(active?.name) ? 2.5 : SHOW_HOSTS.has(active?.name) ? (coarsePointer.matches ? 5 : 8) : 4;
  // While the process host shows the body, the detailed compressor replaces the plain block in the same place.
  const mountedCompressor = model => model?.compressorMount?.children.length ? model.compressorModel : null;
  const membersOf = (model, entry) => entry.key === "nen" && mountedCompressor(model)
    ? model.compressorModel.entries.flatMap(item => item.members) : entry.members;
  function unmountCompressor() {
    const body = cache.get("body");
    if (!body?.compressorMount) return;
    body.compressorMount.clear();
    for (const mesh of body.entries.find(entry => entry.key === "nen")?.members || []) mesh.visible = true;
  }
  function applyLook(model, state) {
    const hideEnclosed = state.modelId === "body" && state.shellMode === "show" && !state.focus && !state.tint && state.shellReveal == null && !state.revealActive;
    const brain = active?.name === "brain", film = SHOW_HOSTS.has(active?.name);
    // A host can ask for a stronger ghost, e.g. the exploded teaser keeps the other clusters visible as context.
    const ghostOpacity = state.ghostOpacity ?? (brain ? .10 : film ? .02 : .06);
    // Shared edge material must be restored whenever the canvas changes host.
    // The film plays on a dark stage: a faint light X-ray lets the highlighted cluster carry the frame.
    edgeMaterial.color.set(brain ? "#8a7f7a" : film ? "#cfc6c2" : "#706561");
    edgeMaterial.opacity = brain ? .6 : film ? .16 : .35;
    xrayMaterial.color.set(film ? "#e8e2de" : "#8a9696"); xrayMaterial.opacity = film ? .035 : .07;
    if (model.decor) model.decor.visible = DECOR_ENABLED && state.shellMode === "show" && !state.focus;
    for (const mesh of Object.values(model.revealDecor || {})) mesh.visible = DECOR_ENABLED && state.shellMode === "show" && !state.focus;
    rimLight.visible = state.modelId === "body";
    // focusParts narrows a focused cluster to the named parts, so brackets of the same cluster do not hide them.
    const keepParts = state.focusParts ? new Set(model.annotations.filter(part => state.focusParts.includes(part.id)).flatMap(part => part.meshes)) : null;
    // showParts stay solid whatever the focus, e.g. the control board that every process step starts from.
    const showParts = state.showParts ? new Set(model.annotations.filter(part => state.showParts.includes(part.id)).flatMap(part => part.meshes)) : null;
    for (const entry of model.entries) {
      const clusterGhost = state.focus && !state.focus.includes(entry.key);
      // clearClusters are faded right down even when the host keeps a stronger ghost: they stand in front of the part being shown.
      const entryGhostOpacity = state.clearClusters?.includes(entry.key) ? .02 : ghostOpacity;
      const focused = state.modelId === "body" && state.tintFocus !== false && ((!brain && state.focus?.includes(entry.key)) || state.tint?.includes(entry.key));
      if (membersOf(model, entry) !== entry.members) for (const mesh of entry.members) mesh.visible = false;
      for (const mesh of membersOf(model, entry)) {
        const ghost = !showParts?.has(mesh) && (clusterGhost || (keepParts && !entry.shell && !keepParts.has(mesh)));
        mesh.material = mesh.userData.originalMaterial;
        mesh.visible = !state.hiddenParts?.includes(entry.key) && !(state.shellMode === "hide" && entry.shell) && !(hideEnclosed && ENCLOSED_CLUSTERS.has(entry.key));
        // hideUnfocused shows only the parts in play as solid models, with no ghosts around them.
        if (state.hideUnfocused && ghost && !entry.shell) {
          mesh.visible = false;
          if (mesh.userData.glassEdges) mesh.userData.glassEdges.visible = false;
          if (mesh.userData.xrayEdges) mesh.userData.xrayEdges.visible = false;
          continue;
        }
        if (mesh.userData.glassEdges) {
          const edges = mesh.userData.glassEdges;
          edges.visible = mesh.visible;
          edges.material.opacity = brain && ghost && !entry.shell ? entryGhostOpacity
            : state.shellMode === "xray" ? .35 : ghost ? .08 : edges.userData.baseOpacity;
        }
        const xray = state.shellMode === "xray" && entry.shell;
        if (xray && entry.key !== "oc" && !mesh.userData.xrayEdges) {
          const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 30), edgeMaterial);
          mesh.add(edges); mesh.userData.xrayEdges = edges;
        }
        if (mesh.userData.xrayEdges) mesh.userData.xrayEdges.visible = xray;
        if (xray) { mesh.material = xrayMaterial; continue; }
        for (const material of materials(mesh)) {
          const base = material.userData.base, transparent = !!ghost || base.transparent;
          if (material.transparent !== transparent) { material.transparent = transparent; material.needsUpdate = true; }
          material.opacity = ghost ? entryGhostOpacity : base.opacity;
          material.depthWrite = ghost ? false : base.depthWrite;
          if (base.color) {
            material.color.copy(base.color);
            if (focused && !mesh.userData.brainBoard) material.color.lerp(new THREE.Color(entry.color), .45);
          }
          if (material.emissive) {
            if (focused && !mesh.userData.brainBoard) {
              material.emissive.set(entry.color);
              material.emissiveIntensity = .22;
            } else {
              material.emissive.copy(base.emissive);
              material.emissiveIntensity = base.emissiveIntensity;
            }
          }
        }
      }
    }
    applyRevealOpacities(model);
  }
  function clearWipe() {
    if (!wipe) return;
    for (const item of wipe.items) {
      item.mesh.material = item.original;
      item.ghost.removeFromParent();
      item.solid.forEach(material => material.dispose()); item.ghost.material.dispose();
    }
    wipe = null;
  }
  function applyWipe(amount) {
    if (!current || active?.name !== "journey" || amount == null) { clearWipe(); return; }
    if (!wipe) {
      const U = current.machineFrame.U, box = current.box;
      const heights = [];
      for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) heights.push(new THREE.Vector3(x, y, z).dot(U));
      wipe = { min: Math.min(...heights), max: Math.max(...heights),
        below: new THREE.Plane(U.clone().negate(), 0), above: new THREE.Plane(U.clone(), 0), items: [] };
      for (const entry of current.entries.filter(entry => entry.shell)) for (const mesh of entry.members) {
        const original = mesh.material;
        const solid = materials(mesh).map(source => { const material = source.clone(); material.clippingPlanes = [wipe.below]; return material; });
        const glass = xrayMaterial.clone(); glass.clippingPlanes = [wipe.above];
        const ghost = new THREE.Mesh(mesh.geometry, glass); ghost.raycast = () => {}; mesh.add(ghost);
        mesh.material = Array.isArray(original) ? solid : solid[0];
        if (mesh.userData.xrayEdges) mesh.userData.xrayEdges.visible = false;
        wipe.items.push({ mesh, original, solid, ghost });
      }
    }
    const height = THREE.MathUtils.lerp(wipe.max, wipe.min, amount);
    wipe.below.constant = height; wipe.above.constant = -height;
  }
  function flatMaterial(source) {
    if (!source.userData.flat) {
      source.userData.flat = new THREE.MeshBasicMaterial({
        color: source.userData.flatColor ?? source.userData.base?.color ?? source.color,
        map: source.map,
        opacity: source.opacity, transparent: source.transparent,
        depthWrite: source.depthWrite, side: source.side, toneMapped: false
      });
    }
    return source.userData.flat;
  }
  function applyLighting(model, state) {
    const flat = state.lighting === "flat";
    // OutputPass applies renderer tone mapping even to offscreen unlit materials.
    renderer.toneMapping = flat ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
    for (const entry of model.entries) {
      for (const mesh of membersOf(model, entry)) {
        // applyLook has already restored and updated the studio appearance.
        if (flat) mesh.material = Array.isArray(mesh.material) ? mesh.material.map(flatMaterial) : flatMaterial(mesh.material);
        if (flat && FLAT_EDGE_RULES.has(mesh.userData.studioRule) && !mesh.userData.flatEdges) {
          const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 30), new THREE.LineBasicMaterial({
            color: "#2b1d1d", transparent: true, opacity: .28, toneMapped: false
          }));
          edges.userData.decor = true;
          mesh.add(edges); mesh.userData.flatEdges = edges;
        }
        if (mesh.userData.flatEdges) mesh.userData.flatEdges.visible = flat;
        // The flat form lines replace the studio hopper lines in this host.
        if (flat && mesh.userData.glassEdges) mesh.userData.glassEdges.visible = false;
      }
    }
    model.holder.traverse(object => {
      if (!object.userData.decor || !object.material) return;
      if (object.isMesh) {
        object.userData.originalMaterial ||= object.material;
        const source = object.userData.originalMaterial;
        object.material = flat ? (Array.isArray(source) ? source.map(flatMaterial) : flatMaterial(source)) : source;
      } else {
        for (const material of materials(object)) {
          material.userData.studioToneMapped ??= material.toneMapped;
          const toneMapped = flat ? false : material.userData.studioToneMapped;
          if (material.toneMapped !== toneMapped) {
            material.toneMapped = toneMapped; material.needsUpdate = true;
          }
        }
      }
    });
    applyRevealOpacities(model);
  }
  function focusBox(stepFlows = active.name === "journey"
    ? data.flows.filter(flow => (active.state.flows || data.stepFlows[active.state.step] || []).includes(flow.id)) : []) {
    const box = new THREE.Box3(), state = active.state;
    if (active.name === "brain" && state.mode === "boards") {
      for (const part of current.annotations.filter(part => ["pcb-control", "pcb-load"].includes(part.id))) {
        for (const mesh of part.meshes) box.expandByObject(mesh);
      }
      return box.isEmpty() ? current.box : box;
    }
    if (active.name === "brain" && state.mode === "machine") {
      signals.expandBounds(box);
      return box.isEmpty() ? current.box : box;
    }
    for (const entry of current.entries) {
      if (state.focus && !state.focus.includes(entry.key)) continue;
      for (const mesh of entry.members) if (mesh.visible) box.expandByObject(mesh);
    }
    for (const flow of stepFlows) {
      for (const id of flow.through) {
        const part = current.annotations.find(part => part.id === id);
        if (part) box.expandByPoint(partAnchor(part));
      }
    }
    return box.isEmpty() ? current.box : box;
  }
  function frameBox(box, instant, view = DEFAULT_VIEW, duration = 650) {
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const vertical = THREE.MathUtils.degToRad(camera.fov / 2), horizontal = Math.atan(Math.tan(vertical) * camera.aspect);
    const brainMachine = active.name === "brain" && active.state.mode === "machine";
    const focused = active.name === "brain" ? brainMachine : !!active.state.focus;
    const padding = focused ? 1.25 : active.name === "sync" ? 1.02 : 1.06;
    // The film keeps the machine as context: aim partway between the cluster and the machine centre.
    if (active.name === "journey" && focused && active.state.modelId === "body") sphere.center.lerp(current.center, .15);
    let distance = sphere.radius / Math.sin(Math.min(vertical, horizontal)) * padding;
    if (focused && !brainMachine && active.state.modelId === "body") distance = Math.max(distance, current.radius * (active.name === "journey" ? 1.7 : .9));
    const { F, L, U } = current.machineFrame;
    const az = THREE.MathUtils.degToRad((view || DEFAULT_VIEW).az), el = THREE.MathUtils.degToRad((view || DEFAULT_VIEW).el);
    const direction = F.clone().multiplyScalar(Math.cos(el) * Math.cos(az))
      .addScaledVector(L, Math.cos(el) * Math.sin(az)).addScaledVector(U, Math.sin(el));
    const to = { target: sphere.center.clone(), position: sphere.center.clone().add(direction.normalize().multiplyScalar(distance)) };
    camera.near = Math.max(sphere.radius / 200, .0005); camera.far = sphere.radius * 60 + distance; camera.updateProjectionMatrix();
    if (instant || motion.matches) {
      animation = null; camera.position.copy(to.position); controls.target.copy(to.target); controls.update();
    } else {
      const from = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
      const destination = new THREE.Spherical().setFromVector3(to.position.clone().sub(to.target));
      if (from.radius < 1e-12) from.copy(destination);
      const delta = destination.theta - from.theta;
      destination.theta = from.theta + Math.atan2(Math.sin(delta), Math.cos(delta));
      animation = { start: performance.now(), duration, from: { target: controls.target.clone(), offset: from }, to, offset: destination };
    }
    requestRender();
  }
  function saveCamera() {
    if (active && current) active.pose = { position: camera.position.clone(), target: controls.target.clone(), near: camera.near, far: camera.far };
  }
  async function activate(host, instant = true) {
    clearWipe();
    if (host?.name !== "process" && host?.name !== "journey") unmountCompressor();
    if (host?.name !== "journey") resetReveal(cache.get("body"));
    const ticket = ++token;
    if (host !== active) {
      saveCamera(); active?.element.classList.remove("has-canvas");
      active = host; animation = null;
      for (const item of hosts.values()) item.element.querySelector(".annotation-layer")?.setAttribute("hidden", "");
    }
    if (current) current.holder.removeFromParent();
    syncPresentation.removeFromParent();
    current = null; flows.clear(); signals.clear(); outline.enabled = false;
    baseHighlight = []; motionHighlight = null;
    explodeTween = null; outlineTween = null; shellTween = null; xrayMaterial.opacity = .07;
    filmDrift = 0; appliedDrift = 0; activity();
    if (!host) { annotations.sync(null); controls.autoRotate = false; return; }
    host.element.appendChild(canvas); host.element.classList.add("has-canvas");
    if (!cache.has(host.state.modelId)) canvas.style.visibility = "hidden";
    const interactive = host.state.interactive;
    controls.enabled = interactive;
    canvas.style.touchAction = interactive ? "none" : "pan-y";
    canvas.style.cursor = interactive ? "grab" : "default";
    controls.enableZoom = !!host.state.zoom;
    controls.autoRotate = !!host.state.autoRotate && !motion.matches;
    resize(); status(host);
    try {
      const model = cache.get(host.state.modelId) || await load(host.state.modelId);
      // Both the destination and requested state may change during Draco decoding.
      if (ticket !== token || active !== host) return;
      current = model;
      if (host.name === "sync") {
        scene.add(syncPresentation); syncPresentation.add(model.holder);
        syncPresentation.updateMatrixWorld(true);
      } else scene.add(model.holder);
      outline.edgeStrength = 4;
      // The film outlines the part being narrated with a soft, slowly pulsing glow.
      const filmHost = SHOW_HOSTS.has(host.name);
      // Touch screens render the outline at half resolution, so the glow is kept thinner there.
      outline.edgeGlow = host.name === "process" ? 0 : filmHost ? (coarsePointer.matches ? .5 : 1) : 0;
      outline.edgeThickness = ["process", "sync"].includes(host.name) ? 1 : filmHost && !coarsePointer.matches ? 2.5 : 1.5;
      outline.pulsePeriod = filmHost && host.name !== "process" && !motion.matches ? 2.4 : 0;
      // Hidden compressor edges stay soft against the light synchronization stage.
      outline.hiddenEdgeColor.set(filmHost ? "#e7a3a9" : host.name === "sync" ? "#d8a4aa" : "#39070b");
      applyExplode(model, host.state.explode); host.explodeAmount = host.state.explode;
      applyLook(model, host.state); applyLighting(model, host.state);
      applyWipe(host.state.shellReveal);
      annotations.sync(host.name, model, host.state);
      if (SHOW_HOSTS.has(host.name)) {
        outline.selectedObjects = model.annotations.filter(part => (host.state.highlightIds || []).includes(part.id)).flatMap(part => part.meshes);
        outline.enabled = outline.selectedObjects.length > 0;
      }
      host.element.querySelector(".annotation-layer")?.removeAttribute("hidden");
      const stepFlows = SHOW_HOSTS.has(host.name)
        ? data.flows.filter(flow => (host.state.flows || data.stepFlows[host.state.step] || []).includes(flow.id)) : [];
      if (host.name === "brain") signals.rebuild(model, brainData, host.state);
      if (host.name === "process" && host.state.signalData) signals.rebuild(model, host.state.signalData, host.state);
      const box = focusBox(stepFlows);
      if (SHOW_HOSTS.has(host.name)) flows.sync(model, stepFlows, model.radius, host.state.cutoffs, host.state.flowOpacity);
      if (host.name === "brain") {
        highlightBrain();
      }
      if (host.pose) {
        animation = null; camera.position.copy(host.pose.position); controls.target.copy(host.pose.target);
        camera.near = host.pose.near; camera.far = host.pose.far; camera.updateProjectionMatrix(); controls.update();
      } else {
        frameBox(box, instant, host.state.view);
      }
      if (host.name === "journey") {
        filmDrift = THREE.MathUtils.degToRad(host.state.drift || 0);
        appliedDrift = host.pose ? filmDrift : 0;
      }
      canvas.style.visibility = "visible"; requestRender();
      activity();
      host.element.querySelector(".model-placeholder")?.remove();
    } catch { /* The host status already explains how to serve the model. */ }
  }
  function highlightBrain() {
    const state = active.state;
    const channel = brainData.channels.find(channel => channel.id === (state.hoverChannel || state.channel));
    const target = channel ? channel.target : "pcb-control";
    outline.selectedObjects = current.annotations.find(part => part.id === target)?.meshes || [];
    outline.enabled = outline.selectedObjects.length > 0;
    outline.edgeStrength = channel ? 4 : 1.5;
  }
  function chooseHost() {
    const best = [...hosts.values()].filter(host => host.area > 0).sort((a, b) => b.area - a.area)[0] || null;
    if (best !== active) void activate(best);
  }
  let hostFallback = false, hostScrollTimer = null;
  function chooseVisibleHost() {
    if (!hostFallback) return;
    for (const host of hosts.values()) {
      const rect = host.element.getBoundingClientRect();
      host.area = Math.max(0, Math.min(rect.right, innerWidth) - Math.max(rect.left, 0))
        * Math.max(0, Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 76));
    }
    chooseHost();
  }
  window.addEventListener("scroll", () => {
    if (!hostFallback || hostScrollTimer !== null) return;
    hostScrollTimer = setTimeout(() => { hostScrollTimer = null; chooseVisibleHost(); }, 100);
  }, { passive: true });
  window.addEventListener("resize", chooseVisibleHost);
  const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(entries => {
    for (const entry of entries) {
      const host = [...hosts.values()].find(item => item.element === entry.target);
      host.observed = true;
      clearTimeout(host.observerTimer);
      host.area = entry.isIntersecting ? entry.intersectionRect.width * entry.intersectionRect.height : 0;
    }
    if ([...hosts.values()].every(host => host.observed)) hostFallback = false;
    if (hostFallback) chooseVisibleHost();
    else chooseHost();
  }, { rootMargin: "-76px 0px 0px", threshold: Array.from({ length: 101 }, (_, index) => index / 100) });
  const resizer = new ResizeObserver(() => {
    resize();
    if (current && active && !active.pose && !active.state.pathControlled) frameBox(focusBox(), true, active.state.view);
  });
  function loop(now) {
    frame = 0;
    if (!active || document.hidden) return;
    if (animation) {
      const t = Math.min(1, (now - animation.start) / animation.duration), k = ease(t);
      controls.target.lerpVectors(animation.from.target, animation.to.target, k);
      const from = animation.from.offset, to = animation.offset;
      const offset = new THREE.Spherical(
        THREE.MathUtils.lerp(from.radius, to.radius, k),
        THREE.MathUtils.lerp(from.phi, to.phi, k),
        THREE.MathUtils.lerp(from.theta, to.theta + (active.name === "journey" ? filmDrift : 0), k)
      );
      camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(offset));
      appliedDrift = filmDrift;
      dirty = true; if (t === 1) animation = null;
    }
    if (SHOW_HOSTS.has(active.name) && current) {
      if (!animation && filmDrift !== appliedDrift) {
        const offset = camera.position.clone().sub(controls.target);
        offset.applyAxisAngle(current.machineFrame.U, filmDrift - appliedDrift);
        camera.position.copy(controls.target).add(offset); appliedDrift = filmDrift; dirty = true;
      }
      if (explodeTween) {
        const t = Math.min(1, (now - explodeTween.start) / explodeTween.duration);
        active.explodeAmount = THREE.MathUtils.lerp(explodeTween.from, explodeTween.to, ease(t));
        applyExplode(current, active.explodeAmount); dirty = true;
        if (t === 1) explodeTween = null;
      }
      if (shellTween) {
        const t = Math.min(1, (now - shellTween.start) / shellTween.duration);
        for (const item of shellTween.materials) {
          item.material.opacity = THREE.MathUtils.lerp(item.from, item.to, ease(t));
          if (t === 1) { item.material.transparent = item.transparent; item.material.depthWrite = item.depthWrite; item.material.needsUpdate = true; }
        }
        dirty = true; if (t === 1) shellTween = null;
      }
      if (active.state.filmControlled) flows.sync(current, data.flows.filter(flow => (active.state.flows || []).includes(flow.id)), current.radius, active.state.cutoffs, active.state.flowOpacity);
      if (outlineTween) {
        const t = Math.min(1, (now - outlineTween.start) / 300);
        // Fade the old group out, then the single new group in.
        if (t >= .5) outline.selectedObjects = outlineTween.meshes;
        outline.edgeStrength = t < .5 ? outlineTween.from * (1 - ease(t * 2)) : outlineLevel() * ease((t - .5) * 2);
        outline.enabled = outline.selectedObjects.length > 0; dirty = true;
        if (t === 1) outlineTween = null;
      }
    }
    if (active.name === "journey" && active.state.filmPlaying && previous && now - previous < 250) {
      slowFrames = now - previous > 28 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
      fastFrames = now - previous < 20 ? fastFrames + 1 : 0;
      if (slowFrames > 45 && filmScale > .75) { filmScale -= .25; slowFrames = 0; fastFrames = 0; resize(); }
      // Give the sharpness back once playback has been smooth for a few seconds.
      else if (fastFrames > 300 && filmScale < 1.5) { filmScale += .25; fastFrames = 0; resize(); }
    }
    const changed = controls.update(previous ? Math.min(.05, (now - previous) / 1000) : 1 / 60);
    previous = now;
    const filmPlaying = SHOW_HOSTS.has(active.name) && active.state.filmPlaying && active.area > 0;
    const flowing = !motion.matches && ((filmPlaying && flows.visible) || ((active.name === "brain" || active.name === "process") && signals.visible));
    if (dirty || changed || flowing || filmPlaying) {
      flows.update(now / 1000, motion.matches);
      signals.update(now / 1000, motion.matches);
      composer.render(); annotations.render(active.name, camera); dirty = false;
    }
    if ((animation || explodeTween || outlineTween || shellTween || changed || controls.autoRotate || flowing || filmPlaying) && !frame) frame = requestAnimationFrame(loop);
  }
  motion.addEventListener("change", () => {
    controls.autoRotate = !!active?.state.autoRotate && !motion.matches;
    if (motion.matches && animation) {
      camera.position.copy(animation.to.position); controls.target.copy(animation.to.target); animation = null;
    }
    requestRender();
  });
  document.addEventListener("visibilitychange", requestRender);
  coarsePointer.addEventListener("change", () => {
    for (const [name, host] of hosts) host.state.interactive = canInteract(name);
    if (active) {
      controls.enabled = active.state.interactive;
      canvas.style.touchAction = active.state.interactive ? "none" : "pan-y";
      canvas.style.cursor = active.state.interactive ? "grab" : "default";
      resize(); requestRender();
    }
  });
  const raycaster = new THREE.Raycaster();
  let pointerStart = null;
  canvas.addEventListener("pointerdown", event => { pointerStart = { x: event.clientX, y: event.clientY }; });
  canvas.addEventListener("pointerup", event => {
    if (!active?.state.interactive || !pointerStart || Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 5) return;
    pointerStart = null;
    const rect = canvas.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1), camera);
    const hit = raycaster.intersectObjects(annotations.pickable().filter(mesh => !mesh.userData.decor), false)[0];
    if (hit && !active.state.pathControlled) annotations.pick(hit.object);
  });
  canvas.addEventListener("pointercancel", () => { pointerStart = null; });
  return {
    // Cinematic state changes never detach, reload, or re-add the active model.
    film(name, keyframe, { duration = 1600, shellDuration = 400, explodeDuration = 600 } = {}) {
      const host = hosts.get(name); if (!host) return;
      const previousIds = (host.state.annotationIds || []).join(",");
      const reframe = keyframe.view !== undefined || keyframe.focus !== undefined;
      const oldExplode = host.explodeAmount ?? host.state.explode;
      const oldShell = host.state.shellMode;
      host.state = { ...host.state, ...keyframe, filmControlled: true };
      if (reframe && !host.state.pathControlled) host.pose = null;
      if (keyframe.markerIds !== undefined) annotations.setMarkers(name, keyframe.markerIds);
      if (host !== active || !current) return;
      if (keyframe.explode !== undefined && oldExplode !== keyframe.explode) {
        if (motion.matches || !duration) { applyExplode(current, keyframe.explode); host.explodeAmount = keyframe.explode; explodeTween = null; }
        else explodeTween = { start: performance.now(), from: oldExplode, to: keyframe.explode, duration: explodeDuration };
      }
      if (keyframe.channels !== undefined) signals.setState(host.state);
      if (keyframe.focus !== undefined || keyframe.focusParts !== undefined || keyframe.clearClusters !== undefined || keyframe.ghostOpacity !== undefined || keyframe.tintFocus !== undefined || keyframe.hideUnfocused !== undefined || keyframe.shellMode !== undefined || keyframe.lighting !== undefined) {
        clearWipe();
        // Finish any interrupted material fade before changing material assignments.
        if (shellTween) for (const item of shellTween.materials) {
          item.material.opacity = item.to; item.material.transparent = item.transparent; item.material.depthWrite = item.depthWrite; item.material.needsUpdate = true;
        }
        shellTween = null;
        applyLook(current, host.state); applyLighting(current, host.state);
        if (oldShell !== host.state.shellMode && duration && !motion.matches) {
          const shellMaterials = [...new Set(current.entries.filter(entry => entry.shell).flatMap(entry => entry.members.flatMap(materials)))];
          shellTween = { start: performance.now(), duration: shellDuration, materials: shellMaterials.map(material => ({
            material, from: oldShell === "hide" ? 0 : oldShell === "xray" ? xrayMaterial.opacity : material.userData.base?.opacity ?? 1,
            to: material.opacity, transparent: material.transparent, depthWrite: material.depthWrite
          })) };
          for (const item of shellTween.materials) { item.material.opacity = item.from; item.material.transparent = true; item.material.depthWrite = false; item.material.needsUpdate = true; }
        }
      }
      if (previousIds !== (host.state.annotationIds || []).join(",") || keyframe.step !== undefined) annotations.sync(name, current, host.state);
      if (keyframe.highlightIds !== undefined) {
        const meshes = current.annotations.filter(part => keyframe.highlightIds.includes(part.id)).flatMap(part => part.meshes);
        if (motion.matches || !duration) { outline.selectedObjects = meshes; outline.enabled = meshes.length > 0; outline.edgeStrength = outlineLevel(); outlineTween = null; }
        else outlineTween = { start: performance.now(), from: outline.edgeStrength, meshes };
      }
      if (reframe && !host.state.pathControlled) { filmDrift = 0; appliedDrift = 0; frameBox(focusBox(data.flows.filter(flow => (host.state.flows || []).includes(flow.id))), !duration, host.state.view, duration); }
      applyWipe(host.state.shellReveal);
      if (keyframe.drift !== undefined) filmDrift = THREE.MathUtils.degToRad(keyframe.drift);
      requestRender();
    },
    // explode frames the parts where they sit at that explode amount; the model is put back afterwards.
    shotPose({ focus = null, parts = [], az = 35, el = 18, distance = 3.7, context = 0, explode = 0, revealOffsets = null, fit = false, padding = 1.12 } = {}) {
      const model = cache.get("body"); if (!model) return null;
      const journey = hosts.get("journey"), restExplode = journey?.explodeAmount ?? journey?.state.explode ?? 0;
      if (explode !== restExplode) applyExplode(model, explode);
      model.holder.updateMatrixWorld(true);
      const box = new THREE.Box3();
      if (revealOffsets) {
        box.copy(model.box);
        for (const [name, offset] of Object.entries(revealOffsets)) {
          const groupBox = model.revealBoxes[name];
          if (groupBox && offset) box.union(groupBox.clone().translate(offset));
        }
      } else for (const entry of model.entries) if (focus?.includes(entry.key)) for (const mesh of membersOf(model, entry)) box.expandByObject(mesh);
      for (const part of model.annotations) if (parts.includes(part.id)) box.expandByPoint(partAnchor(part));
      if (fit && box.isEmpty()) {
        if (focus?.includes("nen")) {
          const plainNen = model.entries.find(entry => entry.key === "nen");
          for (const mesh of plainNen?.members || []) box.expandByObject(mesh);
          if (box.isEmpty()) return null;
        } else box.copy(model.box);
      }
      const target = box.isEmpty() ? model.center.clone() : box.getCenter(new THREE.Vector3()).lerp(model.center, context);
      const { F, L, U } = model.machineFrame;
      const a = THREE.MathUtils.degToRad(az), e = THREE.MathUtils.degToRad(el);
      const direction = F.clone().multiplyScalar(Math.cos(e) * Math.cos(a)).addScaledVector(L, Math.cos(e) * Math.sin(a)).addScaledVector(U, Math.sin(e));
      let viewDistance = model.radius * distance;
      if (fit) {
        const sphere = box.getBoundingSphere(new THREE.Sphere());
        viewDistance = sphere.radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) * padding;
      }
      if (explode !== restExplode) { applyExplode(model, restExplode); model.holder.updateMatrixWorld(true); }
      return { position: target.clone().addScaledVector(direction, viewDistance), target };
    },
    // Camera pose that fits the given clusters (or named parts, or the whole body) from az/el in the body's frame.
    framePose({ focus = null, parts = null, extraParts = [], az = 35, el = 18, padding = 1.12 } = {}) {
      const model = cache.get("body"); if (!model) return null;
      model.holder.updateMatrixWorld(true);
      const box = new THREE.Box3();
      for (const part of model.annotations) { if (parts?.includes(part.id) || (focus && extraParts.includes(part.id))) for (const mesh of part.meshes) box.expandByObject(mesh); }
      if (!parts) for (const entry of model.entries) {
        if (focus ? !focus.includes(entry.key) : entry.shell) continue;
        for (const mesh of membersOf(model, entry)) box.expandByObject(mesh);
      }
      if (box.isEmpty()) box.copy(model.box);
      const sphere = box.getBoundingSphere(new THREE.Sphere());
      const half = THREE.MathUtils.degToRad(camera.fov / 2);
      const distance = sphere.radius / Math.sin(half) * padding;
      const { F, L, U } = model.machineFrame;
      const a = THREE.MathUtils.degToRad(az), e = THREE.MathUtils.degToRad(el);
      const direction = F.clone().multiplyScalar(Math.cos(e) * Math.cos(a)).addScaledVector(L, Math.cos(e) * Math.sin(a)).addScaledVector(U, Math.sin(e));
      return { position: sphere.center.clone().addScaledVector(direction, distance), target: sphere.center.clone() };
    },
    setCamera(name, position, target) {
      const host = hosts.get(name); if (!host) return;
      host.pathPose = { position: position.clone(), target: target.clone() };
      const aspect = host.element.clientWidth / Math.max(1, host.element.clientHeight);
      const framedPosition = position.clone().sub(target).multiplyScalar(Math.max(1, 1 / aspect)).add(target);
      host.pose = { position: framedPosition, target: target.clone(), near: .0005, far: cache.get("body").radius * 80 };
      if (host !== active || !current) return;
      animation = null; filmDrift = 0; appliedDrift = 0;
      camera.position.copy(framedPosition); controls.target.copy(target);
      camera.near = host.pose.near; camera.far = host.pose.far; camera.updateProjectionMatrix(); controls.update(); requestRender();
    },
    shellWipe(name, amount = null) {
      const host = hosts.get(name); if (!host) return;
      if (host.state.shellReveal == null && amount == null) return;
      const starting = host.state.shellReveal == null && amount != null;
      host.state.shellReveal = amount;
      if (host !== active || !current) return;
      shellTween = null;
      if (amount == null || starting) {
        clearWipe(); applyLook(current, host.state); applyLighting(current, host.state);
      }
      applyWipe(amount); requestRender();
    },
    setReveal(name, offsets) {
      const host = hosts.get(name), model = cache.get("body");
      if (!host || !model?.revealGroups) return;
      if (offsets == null) { resetReveal(model); return; }
      if (host !== active || current !== model) return;
      let revealActive = false;
      for (const [groupName, group] of Object.entries(model.revealGroups)) {
        const offset = offsets[groupName] || ZERO;
        model.revealOffsets[groupName] = offset.clone();
        if (offset.lengthSq() > 1e-12) revealActive = true;
        const entry = model.revealEntries[groupName];
        if (entry) { entry.revealOffset.copy(offset); group.position.copy(entry.explodeOffset).add(offset); }
        else group.position.copy(group.userData.revealRestPosition).add(localOffset(group.parent, offset));
      }
      updateWoodVisibility(model);
      if (host.state.revealActive !== revealActive) {
        host.state.revealActive = revealActive; applyLook(model, host.state);
      }
      requestRender();
    },
    setRevealOpacity(name, groupName, opacity) {
      if (name !== "journey") return;
      const host = hosts.get(name), model = cache.get("body");
      if (!host || !model?.revealGroups?.[groupName] || host !== active || current !== model) return;
      const level = THREE.MathUtils.clamp(opacity, 0, 1);
      if (Math.abs((model.revealOpacity[groupName] ?? 1) - level) < 1e-4) return;
      applyRevealOpacity(model, groupName, level);
      if (level === 1) delete model.revealOpacity[groupName];
      else model.revealOpacity[groupName] = level;
      requestRender();
    },
    debugRevealSightline(name, targetEntry = "nen") {
      const host = hosts.get(name), model = cache.get("body"), compressor = mountedCompressor(model);
      if (name !== "journey" || !host || host !== active || current !== model || !compressor) return { ready: false, blockers: {} };
      model.holder.updateMatrixWorld(true); camera.updateMatrixWorld(true);
      const targetBox = new THREE.Box3().setFromObject(compressor.holder);
      if (targetBox.isEmpty()) return { ready: false, blockers: {} };
      const compressorCenter = targetBox.getCenter(new THREE.Vector3()), ray = compressorCenter.clone().sub(camera.position);
      const centerDistance = ray.length();
      if (centerDistance < 1e-6) return { ready: true, blockers: {} };
      const raycaster = new THREE.Raycaster(camera.position.clone(), ray.normalize(), 0, centerDistance);
      const visible = mesh => {
        for (let node = mesh; node; node = node.parent) if (!node.visible) return false;
        return true;
      };
      const targetMeshes = compressor.entries.flatMap(entry => entry.members).filter(mesh => mesh.isMesh && visible(mesh));
      const firstTargetDistance = raycaster.intersectObjects(targetMeshes, false)[0]?.distance ?? centerDistance;
      const groups = new Map();
      const inspect = (mesh, groupName) => {
        if (!mesh.isMesh || groups.has(mesh) || !visible(mesh)) return;
        if (!materials(mesh).some(material => (material?.opacity ?? 1) > .2)) return;
        groups.set(mesh, groupName);
      };
      for (const [groupName, group] of Object.entries(model.revealGroups)) {
        if (groupName === targetEntry) continue;
        group.traverse(mesh => inspect(mesh, groupName));
      }
      for (const entry of model.entries) {
        if (!entry.shell || entry.key === targetEntry) continue;
        for (const mesh of entry.members) inspect(mesh, entry.key);
      }
      const blockers = {}, hitMeshes = new Set();
      for (const hit of raycaster.intersectObjects([...groups.keys()], false)) {
        if (hit.distance >= firstTargetDistance - 1e-5 || hitMeshes.has(hit.object)) continue;
        hitMeshes.add(hit.object);
        const groupName = groups.get(hit.object);
        (blockers[groupName] ||= []).push({ name: rawName(hit.object) || groupName, distance: +hit.distance.toFixed(4) });
      }
      return { ready: true, blockers };
    },
    setPartsVisible(name, key, visible) {
      const host = hosts.get(name); if (!host) return;
      const hidden = new Set(host.state.hiddenParts || []);
      if (visible) hidden.delete(key); else hidden.add(key);
      const previous = host.state.hiddenParts || [], hiddenParts = [...hidden];
      if (hiddenParts.length === previous.length && hiddenParts.every(item => previous.includes(item))) return;
      host.state = { ...host.state, hiddenParts };
      if (host === active && current) { applyLook(current, host.state); requestRender(); }
    },
    setScreenLevel(name, level) {
      const host = hosts.get(name), model = cache.get("body");
      if (!host || !model) return;
      const screen = model.revealDecor["studio-screen"];
      if (!screen) return;
      screenColor.copy(screenDark).lerp(screenLight, THREE.MathUtils.clamp(level, 0, 1));
      for (const material of materials(screen)) material.color?.copy(screenColor);
      if (host === active && current === model) requestRender();
    },
    isActive(name) { return active?.name === name && !!current; },
    // Puts the detailed compressor (c03) in place of the body's plain block while `name` shows the body.
    async mountCompressor(name) {
      const body = cache.get("body"); if (!body) return null;
      const compressor = await load("c03");
      const host = hosts.get(name);
      if (active !== host || current !== body) return null;
      body.holder.updateMatrixWorld(true);
      const plainNen = body.entries.find(entry => entry.key === "nen"), plainNenBox = new THREE.Box3();
      for (const mesh of plainNen?.members || []) plainNenBox.expandByObject(mesh);
      if (!body.compressorMount) {
        const mount = new THREE.Group(); mount.matrixAutoUpdate = false;
        mount.matrix.makeTranslation(body.rootOffset.x, body.rootOffset.y, body.rootOffset.z).multiply(COMPRESSOR_FIT);
        plainNen.group.add(mount);
        body.compressorMount = mount;
      }
      body.compressorModel = compressor;
      body.compressorMount.add(compressor.holder);
      body.holder.updateMatrixWorld(true);
      if (revealDebug && name === "journey" && !compressorCentersLogged) {
        const compressorBox = new THREE.Box3().setFromObject(compressor.holder);
        const compressorCenter = compressorBox.isEmpty() ? null : compressorBox.getCenter(new THREE.Vector3());
        const plainCenter = plainNenBox.isEmpty() ? null : plainNenBox.getCenter(new THREE.Vector3());
        const gapMm = compressorCenter && plainCenter ? compressorCenter.distanceTo(plainCenter) * 1000 : null;
        const toMm = point => point?.toArray().map(value => +(value * 1000).toFixed(1)) || null;
        console.info("[reveal-debug] compressor mount centers", {
          c03WorldMm: toMm(compressorCenter), plainNenWorldMm: toMm(plainCenter),
          gapMm: gapMm === null ? null : +gapMm.toFixed(1), within30mm: gapMm !== null && gapMm <= 30
        });
        compressorCentersLogged = true;
      }
      applyLook(body, host.state); applyLighting(body, host.state); requestRender();
      return compressor;
    },
    onActivity(callback) { activityListeners.add(callback); return () => activityListeners.delete(callback); },
    registerHost(name, element, initialState = {}) {
      const message = document.createElement("p");
      message.className = "viewer-status"; message.setAttribute("role", "status"); element.appendChild(message);
      const host = { name, element, message, area: 0, pose: null, observed: false, state: { modelId: "body", lighting: "studio", view: DEFAULT_VIEW, focus: null, shellMode: "show", explode: 0, autoRotate: false, zoom: false, ...initialState, interactive: canInteract(name) } };
      hosts.set(name, host); status(host); observer?.observe(element); resizer.observe(element);
      host.observerTimer = setTimeout(() => {
        if (host.observed) return;
        hostFallback = true; chooseVisibleHost();
      }, 1500);
    },
    load,
    getModel(name) {
      const host = hosts.get(name);
      return host ? cache.get(host.state.modelId) || null : null;
    },
    requestRender,
    highlightHost(name, objects = []) {
      if (active?.name !== name || !current) return;
      motionHighlight = objects.length ? objects : null;
      const selected = motionHighlight || baseHighlight;
      outline.selectedObjects = selected;
      outline.enabled = selected.length > 0;
      outline.edgeStrength = outlineLevel();
      outline.edgeGlow = ["process", "sync"].includes(name) ? 0 : motionHighlight ? (coarsePointer.matches ? .5 : .8) : 0;
      requestRender();
    },
    highlight(meshes) {
      if (active?.name === "brain" && current) highlightBrain();
      else {
        baseHighlight = meshes;
        outline.selectedObjects = motionHighlight || meshes;
        outline.enabled = outline.selectedObjects.length > 0;
      }
      requestRender();
    },
    setState(name, partial) {
      const host = hosts.get(name);
      const changedKeys = Object.keys(partial).filter(key => JSON.stringify(host.state[key]) !== JSON.stringify(partial[key]));
      if (!changedKeys.length) return;
      if (changedKeys.every(key => key === "lighting")) {
        host.state = { ...host.state, ...partial };
        if (host === active && current) {
          applyLook(current, host.state); applyLighting(current, host.state); requestRender();
        }
        return;
      }
      const appearanceOnly = name === "brain" && Object.keys(partial).every(key => ["channel", "hoverChannel", "tint", "focus", "mode", "view", "annotationIds"].includes(key));
      const reframe = appearanceOnly && partial.mode !== undefined && partial.mode !== host.state.mode;
      host.state = { ...host.state, ...partial };
      if (appearanceOnly) {
        if (reframe) host.pose = null;
        if (host === active && current) {
          if (reframe) annotations.sync(name, current, host.state);
          applyLook(current, host.state); applyLighting(current, host.state); signals.setState(host.state); highlightBrain(); requestRender();
          if (reframe) frameBox(focusBox(), false, host.state.view);
        }
        return;
      }
      host.pose = null; status(host);
      if (host === active) void activate(host, false);
    },
    reset(name) {
      const host = hosts.get(name);
      host.pose = null; host.state.explode = 0;
      if (host === active) void activate(host, true);
    },
    stats(id, focusKeys = null) {
      const model = cache.get(id); if (!model) return null;
      const entries = model.entries.filter(entry => !focusKeys || focusKeys.includes(entry.key));
      return { parts: entries.reduce((sum, entry) => sum + entry.parts.size, 0), meshes: entries.reduce((sum, entry) => sum + entry.members.length, 0), tris: entries.reduce((sum, entry) => sum + entry.tris, 0), labels: entries.map(entry => entry.title) };
    },
    onProgress(callback) { listeners.add(callback); return () => listeners.delete(callback); }
  };
}
