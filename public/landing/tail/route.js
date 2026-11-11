// Lucian UX/UI Prompt #318 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#318
const clamp = value => Math.max(0, Math.min(1, value));
const escapeText = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
export const serviceRouteProgress = (top, height, stageHeight, stickyTop) => clamp((stickyTop - top) / Math.max(1, height - stageHeight));
export function routeLengthAt(table, coordinate) {
  if (coordinate <= table[0][0]) return 0;
  for (let index = 1; index < table.length; index++) {
    if (table[index][0] >= coordinate) {
      const before = table[index - 1], after = table[index];
      return before[1] + (after[1] - before[1]) * (coordinate - before[0]) / Math.max(.01, after[0] - before[0]);
    }
  }
  return table.at(-1)[1];
}
export function serviceRoutePath(points, vertical) {
  let d = `M${points[0][0]} ${points[0][1]}`;
  for (let index = 1; index < points.length; index++) {
    const a = points[index - 1], b = points[index];
    if (vertical) { const mid = (a[1] + b[1]) / 2; d += ` C${a[0]} ${mid} ${b[0]} ${mid} ${b[0]} ${b[1]}`; }
    else { const mid = (a[0] + b[0]) / 2; d += ` C${mid} ${a[1]} ${mid} ${b[1]} ${b[0]} ${b[1]}`; }
  }
  return d;
}

export function createServiceRoute(root, copy) {
  root.innerHTML = `<div class="u318-stage"><div class="wrap u318-inner"><header class="u318-heading"><p>Đồng hành cùng Dolores</p><h2 id="services-title">${copy.TITLE.split("\n").map(line => `<span>${escapeText(line)}</span>`).join("")}</h2></header>
    <div class="u318-map"><svg aria-hidden="true"><path class="u318-guide"/><path class="u318-route"/><g class="u318-dots">${copy.POINTS.map(() => `<circle class="u318-dot" r="10"/><circle class="u318-dotc" r="5"/>`).join("")}</g><g class="u318-marker"><ellipse rx="10" ry="7"/><path d="M-6 4C-2 2 2-2 6-4"/></g></svg>
      <ol class="u318-cards">${copy.POINTS.map((point, index) => `<li class="u318-card"><span class="u318-number">${String(index + 1).padStart(2, "0")}</span><h3>${escapeText(point.TITLE)}</h3><p>${escapeText(point.DESCRIPTION)}</p></li>`).join("")}</ol>
    </div></div></div>`;
  const stage = root.querySelector(".u318-stage"), map = root.querySelector(".u318-map");
  const svg = map.querySelector("svg"), route = map.querySelector(".u318-route"), guide = map.querySelector(".u318-guide"), marker = map.querySelector(".u318-marker");
  const cards = [...map.querySelectorAll(".u318-card")], dots = [...map.querySelectorAll(".u318-dot")], centers = [...map.querySelectorAll(".u318-dotc")];
  const mobile = matchMedia("(max-width: 800px)"), reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let length = 0, table = [], stops = [], frame = 0, visible = true;

  function draw() {
    frame = 0;
    if (!length) return;
    const progress = serviceRouteProgress(root.getBoundingClientRect().top, root.offsetHeight, stage.offsetHeight, parseFloat(getComputedStyle(stage).top) || 0);
    const drawn = reduced.matches ? length : mobile.matches
      ? routeLengthAt(table, innerHeight * .58 - map.getBoundingClientRect().top) : progress * length;
    const amount = Math.max(0, Math.min(length, drawn));
    route.style.strokeDashoffset = (length - amount).toFixed(1);
    const p = route.getPointAtLength(amount), before = route.getPointAtLength(Math.max(0, amount - 2)), after = route.getPointAtLength(Math.min(length, amount + 2));
    const angle = Math.atan2(after.y - before.y, after.x - before.x) * 180 / Math.PI;
    marker.setAttribute("transform", `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${angle.toFixed(1)})`);
    stops.forEach((stop, index) => {
      const on = amount >= stop - 2;
      dots[index].classList.toggle("on", on); centers[index].classList.toggle("on", on); cards[index].classList.toggle("on", on);
    });
  }
  function queue() { if (!frame && visible) frame = requestAnimationFrame(draw); }
  function layout() {
    const width = map.clientWidth, height = map.clientHeight;
    if (!width || !height) return;
    const points = mobile.matches ? [[width * .14, height * .1], [width * .83, height * .44], [width * .14, height * .8]] : [[width * .13, height * .2], [width * .5, height * .44], [width * .87, height * .2]];
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    const d = serviceRoutePath(points, mobile.matches); route.setAttribute("d", d); guide.setAttribute("d", d);
    length = route.getTotalLength(); route.style.strokeDasharray = `${length} ${length}`;
    const axis = mobile.matches ? "y" : "x";
    table = Array.from({ length: 201 }, (_, index) => { const position = length * index / 200; return [route.getPointAtLength(position)[axis], position]; });
    stops = points.map((point, index) => {
      dots[index].setAttribute("cx", point[0]); dots[index].setAttribute("cy", point[1]);
      centers[index].setAttribute("cx", point[0]); centers[index].setAttribute("cy", point[1]);
      const cardWidth = cards[index].offsetWidth;
      const left = mobile.matches ? point[0] > width / 2 ? point[0] - cardWidth - 32 : point[0] + 32 : point[0] - cardWidth / 2;
      cards[index].style.left = `${Math.max(8, Math.min(width - cardWidth - 8, left))}px`;
      cards[index].style.top = `${mobile.matches ? point[1] - 14 : point[1] + 32}px`;
      return routeLengthAt(table, point[mobile.matches ? 1 : 0]);
    });
    draw();
  }
  addEventListener("scroll", queue, { passive: true });
  new ResizeObserver(layout).observe(map);
  if (typeof IntersectionObserver !== "undefined") new IntersectionObserver(entries => { visible = entries[0].isIntersecting; if (visible) queue(); }).observe(root);
  mobile.addEventListener("change", layout); reduced.addEventListener("change", layout);
  layout();
}
