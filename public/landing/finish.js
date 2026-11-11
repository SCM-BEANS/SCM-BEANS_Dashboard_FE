import * as THREE from "three";

export const DECOR_ENABLED = true;

// Nearest matching ancestor wins; within an ancestor, table order wins.
const MATERIALS = [
  ["paint", /^(CV0[1-5]|TN01_Op)/i, THREE.MeshPhysicalMaterial, { color: "#a80f24", flatColor: "#c41f33", roughness: .42, metalness: 0, clearcoat: .45, clearcoatRoughness: .25, envMapIntensity: .65 }],
  ["grate", /^TN05_Luoi/i, THREE.MeshStandardMaterial, { color: "#141414", roughness: .5, metalness: .1 }],
  ["trayInner", /^(TN02_Ga|TN06_ChanLuoi|TN07_Pheu|TN04_Ongthoat)/i, THREE.MeshStandardMaterial, { color: "#2a2a2a", roughness: .6 }],
  ["chrome", /^HK02_Chande/i, THREE.MeshStandardMaterial, { color: "#e8e8e8", metalness: 1, roughness: .15 }],
  ["glass", /^CC02_Thanh/i, THREE.MeshPhysicalMaterial, { color: "#d5dadd", metalness: .05, roughness: .45, transparent: true, opacity: .72, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.5 }],
  ["frosted", /^(CC01_Day|CC04_TamGat|CC04_Ong)/i, THREE.MeshStandardMaterial, { color: "#c8cbce", roughness: .55, metalness: .1 }],
  ["lid", /^CC03_Nap/i, THREE.MeshStandardMaterial, { color: "#e6e6e6", roughness: .35, metalness: .2 }],
  ["bezel", /^(TL07_Opngoai|TL09_Opngoai)/i, THREE.MeshStandardMaterial, { color: "#b4b6b8", roughness: .45, metalness: .3 }],
  ["innerSteel", /^(TL0[3468]|MirrorTL04)/i, THREE.MeshStandardMaterial, { color: "#9da2a6", roughness: .3, metalness: 1 }],
  ["tablet", /^Redmi_PadSE/i, THREE.MeshStandardMaterial, { color: "#202020", roughness: .3, metalness: .2 }],
  ["steel", /^(TB01|Assem_HeRaCafe|HK11_GaHeDauRa|DR\d|PCF-G)/i, THREE.MeshStandardMaterial, { color: "#d3d7da", metalness: 1, roughness: .2 }],
  ["frame", /^(HK0[13456]|HK08|HK09|HK10|GaCodinh|CC09|CC10)/i, THREE.MeshStandardMaterial, { color: "#9ca2a7", roughness: .34, metalness: 1 }],
  ["fasteners", /screw|nut|washer/i, THREE.MeshStandardMaterial, { color: "#b4b6b8", metalness: 1, roughness: .3 }]
].map(([key, re, Type, { flatColor, ...parameters }]) => {
  const material = new Type(parameters);
  if (flatColor !== undefined) material.userData.flatColor = flatColor;
  return { key, re, material };
});

// Interior finish, after product teardown films: zinc-plated sheet steel, brushed stainless, black plastics,
// and only the real accents (red and yellow labels, gauge, knobs) kept in colour. The CAD export carries
// SOLIDWORKS default whites and random pastel appearances, which read as toy plastic.
const interior = (color, roughness, metalness, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, metalness, envMapIntensity: 1.1, ...extra });
const INTERIOR = {
  galvanized: interior("#a3a9ae", .32, 1),
  aluminum: interior("#c0c4c8", .26, 1),
  stainless: interior("#e0e3e5", .14, 1),
  darkSteel: interior("#5a5f64", .28, 1),
  brass: interior("#c9a046", .22, 1),
  blackPlastic: interior("#1c1d20", .42, 0, { envMapIntensity: .8 }),
  ivory: interior("#e2ded6", .55, 0, { envMapIntensity: .7 }),
  pcb: interior("#1f4a33", .5, .1),
  red: interior("#b3232c", .35, 0),
  yellow: interior("#d8ab36", .45, 0)
};
// Named parts first (nearest ancestor wins); everything else is sorted by its CAD colour.
const INTERIOR_NAMES = [
  ["pcb", /^PCB_/i],
  ["blackPlastic", /^(ULKA EX5-|SUNON|AC_Power_Socket|PSL601A|FlowMeter|gac_coffee|DauVaosua)/i],
  ["stainless", /^(BOILER|HN0[1-4]_|head_nen|truc_|oc_left|oc_right)/i],
  ["darkSteel", /^(gear_|wiper_gear|arm_)/i],
  ["aluminum", /^(body_may|box_nen|251101)/i],
  ["ivory", /^(Assem01_BinhNuoc|DauVaoNuoc)/i]
];
// Accents stay only where the CAD colour means something (labels, knobs, gauge); the compressors use random hues.
const NO_ACCENTS = /^(may_ne_coffe|Mayxoay)/i;
function interiorFor(mesh, material) {
  let noAccents = false;
  for (let node = mesh; node; node = node.parent) {
    const name = node.userData.name || "";
    const named = INTERIOR_NAMES.find(([, re]) => re.test(name));
    if (named) return INTERIOR[named[0]];
    if (NO_ACCENTS.test(name)) noAccents = true;
  }
  const hsl = {}; material.color.getHSL(hsl);
  const luminance = .2126 * material.color.r + .7152 * material.color.g + .0722 * material.color.b;
  if (!noAccents && hsl.s > .6 && hsl.l > .25 && hsl.l < .8) {
    if (hsl.h < .04 || hsl.h > .95) return INTERIOR.red;
    // Yellow in this CAD marks the brass fittings; the orange one is the warning label.
    if (hsl.h > .12 && hsl.h < .18) return INTERIOR.brass;
    if (hsl.h > .09 && hsl.h <= .12) return INTERIOR.yellow;
  }
  if (luminance < .08) return INTERIOR.blackPlastic;
  if (luminance < .3) return INTERIOR.darkSteel;
  return hsl.s > .25 ? INTERIOR.aluminum : INTERIOR.galvanized;
}
// Metal reads as metal only when it mirrors something with contrast. The shared RoomEnvironment is soft and even,
// so metals get their own studio: a dark room with a top softbox and tall strip lights, which lay the bright
// streaks and dark bands along edges that product renders show. Paint and plastics keep the shared environment.
const STUDIO_METALS = new Set(["chrome", "steel", "frame", "fasteners", "innerSteel"]);
const metalMaterials = () => [...MATERIALS.filter(rule => STUDIO_METALS.has(rule.key)).map(rule => rule.material),
  ...Object.values(INTERIOR).filter(material => material.metalness >= 1)];
export function applyMetalEnvironment(renderer) {
  const scene = new THREE.Scene(), disposables = [];
  const add = (geometry, color, intensity, position, side = THREE.FrontSide) => {
    const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position); if (side !== THREE.BackSide) mesh.lookAt(0, 0, 0);
    scene.add(mesh); disposables.push(geometry, material);
  };
  add(new THREE.BoxGeometry(12, 12, 12), "#6b6e72", 1, [0, 0, 0], THREE.BackSide);
  add(new THREE.PlaneGeometry(9, 6), "#ffffff", 3, [0, 5.8, 0]);
  add(new THREE.PlaneGeometry(1.6, 8), "#ffffff", 6, [-5.8, .5, 2]);
  add(new THREE.PlaneGeometry(1.6, 8), "#ffffff", 4.5, [5.8, .5, -2]);
  add(new THREE.PlaneGeometry(6, 2.2), "#fff6ec", 3, [2, 1.2, 5.8]);
  add(new THREE.PlaneGeometry(1.2, 6), "#ffffff", 4, [-2, .8, -5.8]);
  add(new THREE.PlaneGeometry(12, 12), "#8e9093", 1, [0, -5.8, 0]);
  const pmrem = new THREE.PMREMGenerator(renderer), texture = pmrem.fromScene(scene, .02).texture;
  pmrem.dispose(); disposables.forEach(item => item.dispose());
  for (const material of metalMaterials()) { material.envMap = texture; material.needsUpdate = true; }
  return texture;
}
// Runs on every model (body after its studio rules, the detailed clusters on their own).
export function applyInteriorMaterials(root) {
  root.traverse(mesh => {
    if (!mesh.isMesh || mesh.userData.studioRule) return;
    const swap = material => !material || material.transparent || material.opacity < 1 || !material.color ? material : interiorFor(mesh, material);
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(swap) : swap(mesh.material);
  });
}

const originalTabletMaterials = new WeakMap();

const glassEdgeMaterial = new THREE.LineBasicMaterial({
  color: "#6f7a80", transparent: true, opacity: .85, depthWrite: false, depthTest: true
});
export function applyStudioMaterials(root) {
  root.traverse(mesh => {
    if (!mesh.isMesh) return;
    for (let node = mesh; node; node = node.parent) {
      const rule = MATERIALS.find(candidate => candidate.re.test(node.userData.name || ""));
      if (!rule) continue;
      if (rule.key === "tablet" && !originalTabletMaterials.has(mesh)) originalTabletMaterials.set(mesh, mesh.material);
      mesh.userData.cadMaterial ??= (Array.isArray(mesh.material)
        ? mesh.material.find(material => material?.name)?.name
        : mesh.material?.name) || "";
      mesh.userData.studioRule = rule.key;
      // prepare() immediately clones each slot and records its studio base values.
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(() => rule.material) : rule.material;
      if (rule.re.test("CC02_Thanh") && !mesh.userData.glassEdges) {
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 20), glassEdgeMaterial.clone());
        edges.renderOrder = 2;
        edges.userData.baseOpacity = edges.material.opacity;
        edges.userData.decor = true;
        mesh.add(edges); mesh.userData.glassEdges = edges;
      }
      break;
    }
  });
}

let logoImage;
function loadLogo() {
  logoImage ||= new THREE.ImageLoader().loadAsync(new URL("./assets/dolores-mark.png", import.meta.url).href);
  return logoImage;
}

function canvasTexture(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return { canvas, ctx: canvas.getContext("2d"), texture };
}

function word(ctx, text, x, y, size, spacing, color) {
  ctx.font = `bold ${size}px Arial`;
  ctx.fillStyle = color; ctx.textBaseline = "middle";
  const width = [...text].reduce((sum, letter) => sum + ctx.measureText(letter).width, 0) + (text.length - 1) * spacing;
  for (const letter of text) {
    ctx.fillText(letter, x, y);
    x += ctx.measureText(letter).width + spacing;
  }
  return width;
}

function wordWidth(ctx, size, spacing) {
  ctx.font = `bold ${size}px Arial`;
  return [..."DOLORES"].reduce((sum, letter) => sum + ctx.measureText(letter).width, 0) + 6 * spacing;
}

function mark(ctx, image, x, y, size, color) {
  const stamp = document.createElement("canvas"); stamp.width = stamp.height = 512;
  const pen = stamp.getContext("2d");
  // Crop to the emblem; the machine face adds its own full-size wordmark.
  const crop = Math.min(image.width, image.height) * .8;
  pen.drawImage(image, (image.width - crop) / 2, 0, crop, crop, 0, 0, 512, 512);
  pen.globalCompositeOperation = "source-in"; pen.fillStyle = color; pen.fillRect(0, 0, 512, 512);
  ctx.drawImage(stamp, x, y, size, size);
}

function branding(kind, color, requestRender, aspect = 1.6) {
  const screen = kind === "screen", markOnly = kind === "mark", textOnly = kind === "word";
  const result = canvasTexture(screen ? 1024 : markOnly ? 512 : 1024, screen ? 640 : markOnly ? 512 : 204);
  const { canvas, ctx, texture } = result;
  if (screen) canvas.height = Math.max(1, Math.round(canvas.width / aspect));
  if (textOnly) {
    ctx.font = "bold 160px Arial";
    const metrics = ctx.measureText("DOLORES"), spacing = 160 * .12;
    canvas.width = Math.ceil(wordWidth(ctx, 160, spacing));
    canvas.height = Math.ceil(metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent);
    ctx.font = "bold 160px Arial"; ctx.textBaseline = "alphabetic"; ctx.fillStyle = color;
    let x = 0;
    for (const letter of "DOLORES") {
      ctx.fillText(letter, x, metrics.actualBoundingBoxAscent);
      x += ctx.measureText(letter).width + spacing;
    }
    texture.needsUpdate = true;
    return texture;
  }
  function draw(image) {
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    if (screen) {
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = "#d9d9d9"; ctx.lineWidth = 6; ctx.strokeRect(3, 3, w - 6, h - 6);
    }
    const size = screen ? h * .34 : markOnly ? h : h * .9;
    const font = screen ? h * .16 : h * .64, spacing = font * .12;
    const textWidth = wordWidth(ctx, font, spacing), gap = screen ? 28 : 24;
    const total = markOnly ? size : textOnly ? textWidth : size + gap + textWidth;
    const x = (w - total) / 2;
    if (!textOnly && image) mark(ctx, image, x, (h - size) / 2, size, color);
    if (!markOnly) word(ctx, "DOLORES", textOnly ? x : x + size + gap, h / 2, font, spacing, color);
    texture.needsUpdate = true;
  }
  draw(null);
  loadLogo().then(image => { draw(image); requestRender(); }).catch(error => console.warn("Studio logo could not load", error));
  return texture;
}

function namedBox(root, regex) {
  let found;
  root.traverse(node => {
    if (!found && regex.test(node.userData.name || "")) found = node;
  });
  return found ? new THREE.Box3().setFromObject(found) : null;
}

// Measure the glass after the model transforms, in the same space as the other decals.
function tabletScreenPlane(root) {
  let tablet;
  root.traverse(node => {
    if (!tablet && /^Redmi_PadSE/i.test(node.userData.name || "")) tablet = node;
  });
  if (!tablet) return null;
  tablet.updateWorldMatrix(true, true);
  let screen, fewestVertices, vertexCount = Infinity;
  tablet.traverse(mesh => {
    if (!mesh.isMesh || mesh.userData.decor) return;
    if (!screen && mesh.userData.cadMaterial === "color-39") screen = mesh;
    const positions = mesh.geometry?.getAttribute("position");
    if (positions && positions.count < vertexCount) {
      vertexCount = positions.count;
      fewestVertices = mesh;
    }
  });
  const target = screen || fewestVertices;
  if (!target) return null;
  const normal = new THREE.Vector3(), center = new THREE.Vector3(), vertices = [];
  let totalArea = 0;
  target.traverse(mesh => {
    if (!mesh.isMesh || mesh.userData.decor) return;
    const geometry = mesh.geometry, positions = geometry?.getAttribute("position");
    if (!positions) return;
    const indices = geometry.index, count = indices ? indices.count : positions.count;
    for (let i = 0; i + 2 < count; i += 3) {
      const triangle = [0, 1, 2].map(offset => new THREE.Vector3()
        .fromBufferAttribute(positions, indices ? indices.getX(i + offset) : i + offset)
        .applyMatrix4(mesh.matrixWorld));
      const [a, b, c] = triangle;
      const cross = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
      const twiceArea = cross.length();
      // Cross products already carry the triangle area as their weight.
      if (twiceArea === 0 || cross.x / twiceArea <= .3) continue;
      normal.add(cross);
      center.addScaledVector(new THREE.Vector3().copy(a).add(b).add(c), twiceArea / 3);
      totalArea += twiceArea;
      vertices.push(...triangle);
    }
  });
  if (!totalArea) return null;
  normal.normalize(); center.divideScalar(totalArea);
  // The body holds two Redmi_PadSE instances about 2 mm apart; the logo must clear the glass of both.
  let maxDistance = 0;
  const vertex = new THREE.Vector3();
  root.traverse(mesh => {
    if (!mesh.isMesh || mesh.userData.decor) return;
    let owner = mesh;
    while (owner && !/^Redmi_PadSE/i.test(owner.userData.name || "")) owner = owner.parent;
    if (!owner) return;
    const positions = mesh.geometry?.getAttribute("position");
    if (!positions) return;
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i).applyMatrix4(mesh.matrixWorld).sub(center);
      maxDistance = Math.max(maxDistance, vertex.dot(normal));
    }
  });
  const up = new THREE.Vector3(0, 1, 0).addScaledVector(normal, -normal.y).normalize();
  const right = new THREE.Vector3().crossVectors(up, normal).normalize();
  let minR = Infinity, maxR = -Infinity, minU = Infinity, maxU = -Infinity;
  for (const vertex of vertices) {
    const relative = vertex.clone().sub(center), r = relative.dot(right), u = relative.dot(up);
    minR = Math.min(minR, r); maxR = Math.max(maxR, r);
    minU = Math.min(minU, u); maxU = Math.max(maxU, u);
  }
  const width = .94 * (maxR - minR), height = .94 * (maxU - minU);
  if (!(width > 0 && height > 0)) return null;
  center.addScaledVector(right, (minR + maxR) / 2).addScaledVector(up, (minU + maxU) / 2);
  center.addScaledVector(normal, maxDistance);
  return { width, height, center, normal, right, up };
}

function decorMesh(geometry, material, name) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name; mesh.userData.decor = true;
  return mesh;
}

function decal(group, texture, width, height, position, rotationY, name) {
  const mesh = decorMesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({
    map: texture, transparent: true, depthWrite: false, toneMapped: false
  }), name);
  mesh.position.set(...position); mesh.rotation.y = rotationY; group.add(mesh);
  return mesh;
}

function woodTexture() {
  const { ctx, texture } = canvasTexture(1024, 256);
  ctx.fillStyle = "#dcbf8f"; ctx.fillRect(0, 0, 1024, 256);
  for (let i = 0; i < 100; i++) {
    ctx.strokeStyle = i % 2 ? "#c9a873" : "#e6cfa6";
    ctx.globalAlpha = .15 + (i % 7) * .07; ctx.lineWidth = .5 + (i % 4) * .5;
    ctx.beginPath();
    for (let x = 0; x <= 1024; x += 16) {
      const y = i * 2.6 + Math.sin(x / 110 + i * 1.7) * 1.7;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(4, 1);
  texture.needsUpdate = true;
  return texture;
}

function addWood(group, left, right, back, requestRender) {
  const xBack = back.min.x, zLeft = left.max.z, zRight = right.min.z;
  const xFront = xBack + .312, yTop = left.max.y - .110;
  const thickness = .018, cap = thickness / 2, shape = new THREE.Shape();
  // Shape XY represents machine XZ. Rounded outer rear corners and front caps.
  shape.moveTo(xFront - cap, zLeft + thickness);
  shape.lineTo(xBack, zLeft + thickness);
  shape.absarc(xBack, zLeft, thickness, Math.PI / 2, Math.PI, false);
  shape.lineTo(xBack - thickness, zRight);
  shape.absarc(xBack, zRight, thickness, Math.PI, Math.PI * 1.5, false);
  shape.lineTo(xFront - cap, zRight - thickness);
  shape.absarc(xFront - cap, zRight - cap, cap, -Math.PI / 2, Math.PI / 2, false);
  shape.lineTo(xBack, zRight); shape.lineTo(xBack, zLeft);
  shape.lineTo(xFront - cap, zLeft);
  shape.absarc(xFront - cap, zLeft + cap, cap, -Math.PI / 2, Math.PI / 2, false);
  shape.closePath();
  const length = .624 + zLeft - zRight, middle = (zLeft + zRight) / 2;
  const uv = (vertices, index) => {
    const x = vertices[index * 3], z = vertices[index * 3 + 1], depth = vertices[index * 3 + 2];
    const along = x < xBack ? .312 + zLeft - z : z > middle ? xFront - x : .312 + zLeft - zRight + x - xBack;
    return new THREE.Vector2(along / length, depth / .095);
  };
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: .089, steps: 1, bevelEnabled: true, bevelThickness: .003, bevelSize: .001, bevelSegments: 3, curveSegments: 12,
    UVGenerator: {
      generateTopUV: (g, vertices, a, b, c) => [a, b, c].map(index => uv(vertices, index)),
      generateSideWallUV: (g, vertices, a, b, c, d) => [a, b, c, d].map(index => uv(vertices, index))
    }
  });
  const band = decorMesh(geometry, new THREE.MeshStandardMaterial({ map: woodTexture(), roughness: .55 }), "studio-wood-band");
  band.rotation.x = Math.PI / 2; band.position.y = yTop - .003; group.add(band);
  decal(group, branding("mark", "#9e1b24", requestRender), .05, .05,
    [xFront - .05, yTop - .0475, zLeft + thickness + .001 + .0006], 0, "wood-mark");
  const wordMap = branding("word", "#9e1b24", requestRender);
  decal(group, wordMap, .026 * wordMap.image.width / wordMap.image.height, .026,
    [xBack + .09, yTop - .0475, zRight - thickness - .001 - .0006], Math.PI, "wood-wordmark");
}

// The CAD lists the acrylic hopper sheets (CC06_TamMICA, CC07_TamMICATruoc) but they have no geometry,
// so the clear box from the product renders is rebuilt here: lid footprint, from the funnel rim's bottom to the lid.
function addHopperWalls(decor, root) {
  const lid = namedBox(root, /^CC03_Nap/i), funnel = namedBox(root, /^CC02_Thanh/i);
  if (!lid || !funnel || lid.isEmpty() || funnel.isEmpty()) return;
  const inset = .002;
  const width = lid.max.x - lid.min.x - inset * 2, depth = lid.max.z - lid.min.z - inset * 2;
  const bottom = funnel.min.y, height = lid.min.y - bottom;
  if (height <= 0) return;
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const walls = decorMesh(geometry, new THREE.MeshPhysicalMaterial({
    color: "#eef3f6", roughness: .05, metalness: 0, transparent: true, opacity: .14,
    depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.5
  }), "studio-hopper-walls");
  walls.position.set((lid.min.x + lid.max.x) / 2, bottom + height / 2, (lid.min.z + lid.max.z) / 2);
  walls.renderOrder = 3;
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), new THREE.LineBasicMaterial({
    color: "#6f7a80", transparent: true, opacity: .8, depthWrite: false
  }));
  edges.userData.decor = true; edges.renderOrder = 4; walls.add(edges);
  decor.add(walls);
}

export function createStudioFinish(root, holder, box, requestRender) {
  const decor = new THREE.Group(); decor.name = "studio-decor"; decor.visible = DECOR_ENABLED;
  decor.userData.decor = true; holder.add(decor);
  if (DECOR_ENABLED) {
    const glass = tabletScreenPlane(root);
    if (glass) {
      const { width, height, center, normal, right, up } = glass;
      const screen = decorMesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({
        map: branding("screen", "#c0152a", requestRender, width / height),
        toneMapped: false, transparent: false, depthWrite: true
      }), "studio-screen");
      screen.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, normal));
      screen.position.copy(center).addScaledVector(normal, .0004);
      decor.add(screen);
    }
    const left = namedBox(root, /^CV01_Mattrai/i), right = namedBox(root, /^CV02_Matphai/i);
    const back = namedBox(root, /^CV03_Matsau/i);
    const sideLogo = branding("side", "#ffffff", requestRender);
    if (left && !left.isEmpty()) decal(decor, sideLogo, .110, .022,
      [left.max.x - .090, left.max.y - .108, left.max.z + .0005], 0, "left-logo");
    // Rotate the plane (including its UVs), keeping type readable from -Z.
    if (right && !right.isEmpty()) decal(decor, sideLogo, .110, .022,
      [right.max.x - .090, right.max.y - .108, right.min.z - .0005], Math.PI, "right-logo");
    if (left && right && back && ![left, right, back].some(panel => panel.isEmpty())) addWood(decor, left, right, back, requestRender);
    addHopperWalls(decor, root);
  }
  const { ctx, texture } = canvasTexture(256, 256);
  const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, "rgba(0,0,0,.28)"); gradient.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 256, 256); texture.needsUpdate = true;
  const size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
  const shadow = decorMesh(new THREE.PlaneGeometry(size.x * 1.6, size.z * 1.6), new THREE.MeshBasicMaterial({
    map: texture, transparent: true, depthWrite: false, toneMapped: false
  }), "studio-soft-shadow");
  shadow.rotation.x = -Math.PI / 2; shadow.position.set(center.x, .001, center.z); holder.add(shadow);
  return decor;
}
