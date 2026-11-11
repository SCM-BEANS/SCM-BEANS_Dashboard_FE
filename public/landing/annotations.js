import * as THREE from "three";
import { CLUSTERS } from "./clusters.js";

// Shared by the viewer and page: one request, with no annotation copy in JavaScript.
export const annotationData = fetch("./landing/parts.json").then(response => {
  if (!response.ok) throw new Error("Không tải được chú thích");
  return response.json();
});
const escape = value => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export function resolveParts(root, modelId, data) {
  return data.parts.filter(part => part.model === modelId).map(part => {
    const regex = new RegExp(part.match, "i"), instances = [];
    root.traverse(node => {
      if (!regex.test(node.userData.name || "")) return;
      for (let parent = node.parent; parent; parent = parent.parent) {
        if (regex.test(parent.userData.name || "")) return;
      }
      const meshes = [];
      node.traverse(child => { if (child.isMesh) meshes.push(child); });
      if (meshes.length) instances.push({ name: node.userData.name, meshes });
    });
    return { ...part, instances, meshes: [...new Set(instances.flatMap(instance => instance.meshes))] };
  }).filter(part => part.instances.length);
}
export function meshBox(meshes) {
  const box = new THREE.Box3();
  for (const mesh of meshes) {
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    box.union(mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld));
  }
  return box;
}
export const partAnchor = part => meshBox(part.instances[0].meshes).getCenter(new THREE.Vector3());

export function createAnnotations(data, { highlight, openDetail, onSelect }) {
  const hosts = new Map(), desktop = matchMedia("(min-width: 1024px)");
  let active = null;
  const svgNS = "http://www.w3.org/2000/svg";
  function emphasize(host) {
    const part = host.model?.annotations.find(item => item.id === (host.hover || host.selected));
    if (host === active) highlight(part?.meshes || []);
    for (const item of host.items) {
      const on = item.part.id === host.hover || item.part.id === host.selected;
      item.line?.classList.toggle("emphasized", on);
      for (const button of item.buttons) button.setAttribute("aria-pressed", String(item.part.id === host.selected));
    }
  }
  function card(host) {
    const part = host.parts.find(item => item.id === host.selected);
    host.card.hidden = !part;
    // The detail card overlays the viewer; cluster controls remain available.
    if (!part) { host.card.replaceChildren(); return; }
    const counts = new Map();
    for (const instance of part.instances) {
      const name = instance.name.replace(/-\d+$/, "");
      counts.set(name, (counts.get(name) || 0) + 1);
    }
    const materialCounts = new Map();
    for (const mesh of part.meshes) {
      const names = new Set((Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map(material =>
        data.materials[material.name.replace(/-\d+$/, "").toLowerCase()]).filter(Boolean));
      for (const name of names) materialCounts.set(name, (materialCounts.get(name) || 0) + 1);
    }
    const material = [...materialCounts].sort((a, b) => b[1] - a[1])[0]?.[0];
    const size = meshBox(part.meshes).getSize(new THREE.Vector3()).multiplyScalar(1000);
    const rows = [["Mã SOLIDWORKS", [...counts].map(([name, count]) => name + (count > 1 ? ` ×${count}` : "")).join(", ")],
      ["Kích thước bao", `${Math.round(size.x)} × ${Math.round(size.y)} × ${Math.round(size.z)} mm`],
      ...(material ? [["Vật liệu", material]] : []), ...(part.specs || [])];
    host.card.innerHTML = `<button class="annotation-back" type="button">${host.name === "detail" ? "← Quay lại cụm" : "Đóng thông số ×"}</button>
      <h4>${escape(part.title)}</h4><span class="part-kind">${escape(part.kind)}</span>
      ${part.status === "confirm" ? '<span class="confirm-badge">Cần xác nhận</span>' : ""}
      <p>${escape(part.desc)}</p><table><tbody>${rows.map(([key, value]) => `<tr><th scope="row">${escape(key)}</th><td>${escape(value)}</td></tr>`).join("")}</tbody></table>
      ${part.signal ? `<div class="part-signal"><strong>Tín hiệu điều khiển</strong><p>${escape(part.signal)}</p></div>` : ""}
      ${part.note ? `<p class="part-note">${escape(part.note)}</p>` : ""}
      ${part.confirm ? `<p class="part-confirm">${escape(part.confirm)}</p>` : ""}
      ${part.link ? `<button type="button" class="button" data-part-link="${escape(part.link)}">Mở cụm ${part.link.slice(1)}</button>` : ""}`;
    host.card.querySelector(".annotation-back").onclick = () => select(host, null);
    host.card.querySelector("[data-part-link]")?.addEventListener("click", () => openDetail(part.link));
  }
  function select(host, id) {
    host.selected = host.selected === id ? null : id;
    if (host.selected) onSelect?.(host.name, host.selected);
    card(host); emphasize(host);
  }
  function wire(button, host, part) {
    button.type = "button";
    button.setAttribute("aria-label", part.title);
    button.onclick = () => select(host, part.id);
    button.onpointerenter = button.onfocus = () => { host.hover = part.id; emphasize(host); };
    button.onpointerleave = button.onblur = () => { host.hover = null; emphasize(host); };
  }
  function sync(name, model, state) {
    const host = hosts.get(name);
    if (!host) { active = null; highlight([]); return; }
    active = host;
    const ids = state.annotationIds || [];
    const key = `${state.modelId}:${ids.join(",")}:${!!state.overview}:${state.step ?? ""}`;
    host.model = model;
    if (host.key === key) { card(host); emphasize(host); return; }
    host.key = key; host.selected = null; host.hover = null;
    host.parts = model.annotations.filter(part => ids.includes(part.id));
    host.layer.replaceChildren(); host.list.replaceChildren(); host.items = [];
    const svg = document.createElementNS(svgNS, "svg"); host.layer.append(svg);
    const parts = state.overview ? model.entries.filter(entry => !entry.shell).map(entry => ({
      id: entry.key, title: entry.title, color: entry.color, overview: true, meshes: entry.members,
      instances: [{ meshes: entry.members }]
    })) : host.parts;
    for (const [index, part] of parts.entries()) {
      const dot = document.createElement("button"); dot.className = "annotation-dot";
      dot.style.setProperty("--part-color", part.color || CLUSTERS.find(cluster => cluster.key === part.cluster)?.color || "#b81724");
      dot.textContent = part.overview ? "" : index + 1;
      dot.title = part.title;
      host.layer.append(dot);
      if (part.overview) {
        dot.classList.add("overview-dot"); dot.type = "button"; dot.setAttribute("aria-label", part.title);
        host.items.push({ part, dot, buttons: [] }); continue;
      }
      const label = document.createElement("button"); label.className = "annotation-label";
      label.innerHTML = `<strong>${index + 1}. ${escape(part.title)}${part.instances.length > 1 ? ` ×${part.instances.length}` : ""}</strong><small>${escape(part.kind)}</small>`;
      const mobile = label.cloneNode(true); mobile.classList.add("annotation-list-button");
      host.layer.append(label); host.list.append(mobile);
      const line = document.createElementNS(svgNS, "g"); svg.append(line);
      const leader = document.createElementNS(svgNS, "polyline"); line.append(leader);
      const endDot = document.createElementNS(svgNS, "circle");
      endDot.setAttribute("r", "2"); line.append(endDot);
      const buttons = [dot, label, mobile]; buttons.forEach(button => wire(button, host, part));
      host.items.push({ part, dot, label, line, leader, endDot, buttons });
    }
    card(host); emphasize(host);
  }
  function render(name, camera) {
    const host = hosts.get(name); if (!host || active !== host) return;
    const width = host.element.clientWidth, height = host.element.clientHeight;
    const columns = [[], []], visibleItems = [], top = name === "journey" ? 56 : name === "brain" ? 76 : 16, bottom = name === "journey" ? 72 : 16;
    for (const item of host.items) {
      const point = partAnchor(item.part).project(camera);
      const visible = (name !== "journey" || !host.markerIds || host.markerIds.includes(item.part.id)) && (item.part.overview || item.part.meshes.some(mesh => mesh.visible)) && point.z >= -1 && point.z <= 1 && Math.abs(point.x) <= 1 && Math.abs(point.y) <= 1;
      item.dot.hidden = !visible;
      if (item.label) { item.label.hidden = !visible || name === "journey"; item.line.style.display = visible && desktop.matches && name !== "journey" ? "" : "none"; }
      if (!visible) continue;
      item.x = (point.x + 1) * width / 2; item.y = (1 - point.y) * height / 2;
      visibleItems.push(item);
    }
    // Repeat pair separation because moving one dot can bring it near another.
    for (let pass = 0; pass < 100; pass++) {
      let adjusted = false;
      for (let i = 0; i < visibleItems.length; i++) {
        for (let j = i + 1; j < visibleItems.length; j++) {
          const a = visibleItems[i], b = visibleItems[j];
          const dx = b.x - a.x, dy = b.y - a.y, distance = Math.hypot(dx, dy);
          if (distance >= 26 - 1e-6) continue;
          const shift = (26 - distance) / 2;
          const ux = distance ? dx / distance : 1, uy = distance ? dy / distance : 0;
          a.x -= ux * shift; a.y -= uy * shift;
          b.x += ux * shift; b.y += uy * shift;
          adjusted = true;
        }
      }
      if (!adjusted) break;
    }
    for (const item of visibleItems) {
      // Keep the entire 22px dot below the mobile legend's 44px band.
      if (!desktop.matches) item.y = Math.max(55, Math.min(height - 11, item.y));
      item.dot.style.left = `${item.x}px`; item.dot.style.top = `${item.y}px`;
      if (item.label && desktop.matches && name !== "journey") columns[item.x < width / 2 ? 0 : 1].push(item);
    }
    for (const [side, items] of columns.entries()) {
      items.sort((a, b) => a.y - b.y);
      const labelWidth = Math.min(210, (width - 48) / 2);
      let next = top;
      for (const item of items) {
        item.label.style.width = `${labelWidth}px`;
        item.label.style.left = side ? "auto" : "16px"; item.label.style.right = side ? "16px" : "auto";
        item.labelY = Math.max(next, item.y - item.label.offsetHeight / 2);
        next = item.labelY + Math.max(40, item.label.offsetHeight + 6);
      }
      // Fit from the bottom as well, retaining each label's actual height.
      let limit = height - bottom;
      for (const item of [...items].reverse()) {
        item.labelY = Math.min(item.labelY, limit - item.label.offsetHeight);
        limit = item.labelY - 6;
      }
      for (const item of items) {
        item.label.style.top = `${Math.max(top, item.labelY)}px`;
        const endX = side ? width - 16 - labelWidth : 16 + labelWidth;
        const endY = Math.max(top, item.labelY) + item.label.offsetHeight / 2;
        const elbowX = endX + (side ? -28 : 28);
        item.leader.setAttribute("points", `${item.x},${item.y} ${elbowX},${item.y} ${elbowX},${endY} ${endX},${endY}`);
        item.endDot.setAttribute("cx", endX); item.endDot.setAttribute("cy", endY);
      }
    }
  }
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") for (const host of hosts.values()) { host.selected = null; host.hover = null; card(host); emphasize(host); }
  });
  return {
    register(name, element, list, cardElement) {
      const layer = document.createElement("div"); layer.className = "annotation-layer"; element.append(layer);
      hosts.set(name, { name, element, layer, list, card: cardElement, parts: [], items: [] });
    },
    setMarkers(name, ids) { const host = hosts.get(name); if (host) host.markerIds = ids; },
    sync, render,
    dismiss(name) { const host = hosts.get(name); if (host) { host.selected = null; host.hover = null; card(host); emphasize(host); } },
    pick(mesh) { if (!active) return; const part = active.parts.filter(part => part.meshes.includes(mesh)).sort((a, b) => a.meshes.length - b.meshes.length)[0]; if (part) select(active, part.id); },
    pickable() { return active?.parts.flatMap(part => part.meshes).filter(mesh => mesh.visible) || []; }
  };
}
