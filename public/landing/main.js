import { COPY, STEPS, LOGIN_URL } from "./clusters.js";

import { annotationData, createAnnotations } from "./annotations.js";
import { createTeaser } from "./teaser.js";
import { createSyncSection } from "./sync/section.js";
import { createProcessSection } from "./process/section.js";
import { createLandingTail } from "./tail/index.js";
import { createIntroWave } from "./intro.js";

const $ = id => document.getElementById(id);
const motion = matchMedia("(prefers-reduced-motion: reduce)");
const previousOverflow = document.body.style.overflow;
document.body.style.overflow = "hidden";
createIntroWave($("intro"));
// Visitors see a short, actionable message; the setup hint for developers goes to the console.
const LOAD_ERROR = "Chưa tải được mô hình 3D. Hãy tải lại trang.";
const escape = value => String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
const brand = `<a class="brand" href="#top" aria-label="Dolores, về trang chủ"><span class="brand-mark"><img src="./landing/assets/dolores-mark.png" alt=""></span><strong>dolores.</strong></a>`;
const navigation = [["Máy pha", "ben-trong"], ["Quy trình pha", "qua-trinh"], ["Nền tảng", "nen-tang"], ["Hỗ trợ", "lien-he"]];
const navLinks = navigation.map(([title, id]) => `<a href="#${id}">${title}</a>`).join("");
$("desktop-nav").innerHTML = navLinks;
$("mobile-nav").innerHTML = navLinks;

function setMenu(open, returnFocus = false) {
  $("mobile-nav").hidden = !open;
  $("menu-toggle").setAttribute("aria-expanded", String(open));
  $("menu-toggle").setAttribute("aria-label", open ? "Đóng menu" : "Mở menu");
  $("menu-toggle").firstElementChild.textContent = open ? "×" : "☰";
  if (returnFocus) $("menu-toggle").focus();
}
$("menu-toggle").addEventListener("click", () => setMenu($("mobile-nav").hidden));
$("mobile-nav").addEventListener("click", event => { if (event.target.closest("a")) setMenu(false); });
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !$("mobile-nav").hidden) setMenu(false, true);
});
document.addEventListener("pointerdown", event => {
  if (!$("mobile-nav").contains(event.target) && !$("menu-toggle").contains(event.target)) setMenu(false);
});
matchMedia("(min-width: 1024px)").addEventListener("change", event => { if (event.matches) setMenu(false); });

const overviewIcons = ["coffee", "file-description", "receipt", "headset"];
$("product-content").innerHTML = `<div class="overview-panel">
  <div class="overview-copy">
    <h2 id="overview-title"><span>${escape(COPY.PRODUCT.TITLE)}</span><span><em>${escape(COPY.PRODUCT.TITLE_ACCENT)}</em> ${escape(COPY.PRODUCT.TITLE_END)}</span></h2>
    <p>${escape(COPY.PRODUCT.DESCRIPTION)}</p>
  </div>
  <figure class="overview-connections" aria-label="Các nhóm thông tin trên nền tảng Dolores">
    <img src="./landing/assets/platform-connections.svg" alt="" width="700" height="280" loading="lazy">
    <div class="overview-legend">
      <strong class="overview-wordmark" aria-hidden="true">dolores.</strong>
      <ul class="overview-areas">${COPY.PRODUCT.AREAS.map((area, index) => `<li><svg class="overview-area-icon" viewBox="0 0 24 24" aria-hidden="true"><use href="./landing/assets/platform-connections.svg#${overviewIcons[index]}"></use></svg><span>${escape(area)}</span></li>`).join("")}</ul>
    </div>
  </figure>
</div>
<ul class="overview-benefits">${COPY.PRODUCT.BENEFITS.map(benefit => `<li><h3>${escape(benefit.TITLE)}</h3><p>${escape(benefit.DESCRIPTION)}</p></li>`).join("")}</ul>
<div class="overview-action"><a class="button primary" href="#nen-tang">${escape(COPY.PRODUCT.ACTION)}</a></div>`;
createLandingTail(COPY, brand);
// The login address can be set per deployment with <meta name="dolores-login">. A localhost address only works
// on a developer's machine, so elsewhere the login links are hidden rather than left dead.
const loginUrl = document.querySelector('meta[name="dolores-login"]')?.content || LOGIN_URL;
const localPage = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
const localLogin = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/.test(loginUrl);
document.querySelectorAll("[data-login]").forEach(link => {
  if (localLogin && !localPage) link.hidden = true;
  else { link.href = loginUrl; link.target = "_top"; }
});

let annotations = null, partsData = null, brainData = null;
const journeyList = document.createElement("div"); journeyList.className = "annotation-list";
const journeyCard = document.createElement("div"); journeyCard.className = "part-card journey-part-card"; journeyCard.hidden = true;
let viewer = null, teaser = null;
window.addEventListener("scroll", updateNavigation, { passive: true });
window.addEventListener("resize", updateNavigation);
function updateNavigation() {
  document.querySelector(".topbar").classList.toggle("is-scrolled", scrollY > 24);
  let active = null;
  for (const [, id] of navigation) if ($(id).getBoundingClientRect().top <= 100) active = id;
  if (innerHeight + scrollY >= document.documentElement.scrollHeight - 2) active = "lien-he";
  document.querySelectorAll("#desktop-nav a, #mobile-nav a").forEach(link => {
    if (link.hash === `#${active}`) link.setAttribute("aria-current", "true");
    else link.removeAttribute("aria-current");
  });
}
const revealSections = [...document.querySelectorAll("main > section:not(.hero):not(.u318)")];
let revealObserver;
function setupReveals() {
  revealObserver?.disconnect();
  if (motion.matches || typeof IntersectionObserver === "undefined") {
    revealSections.forEach(section => section.classList.remove("reveal-pending")); return;
  }
  revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.remove("reveal-pending"); revealObserver.unobserve(entry.target); }
  }), { threshold: 0, rootMargin: "0px 0px -16px 0px" });
  revealSections.forEach(section => {
    if (section.dataset.revealSeen) return;
    section.dataset.revealSeen = "true";
    section.classList.add("section-reveal", "reveal-pending"); revealObserver.observe(section);
  });
}
updateNavigation(); setupReveals();
motion.addEventListener("change", setupReveals);

// The intro only covers the screen; data and models start loading underneath it straight away.
let finishIntro;
const introFinished = new Promise(resolve => { finishIntro = resolve; });
function dismissIntro() {
  if (!$("intro")) return;
  document.body.style.overflow = previousOverflow;
  $("intro").remove();
  finishIntro();
}
function showLoadError() {
  $("film-poster")?.classList.add("is-error");
  if ($("film-loading")) $("film-loading").textContent = LOAD_ERROR;
}
async function startViewer() {
  try {
    const response = await fetch("./landing/brain.json");
    if (!response.ok) throw new Error("brain.json");
    brainData = await response.json();
    const { createViewer } = await import("./viewer.js");
    partsData = await annotationData;
    annotations = createAnnotations(partsData, {
      highlight: meshes => viewer?.highlight(meshes),
      openDetail: () => location.assign("./machine.html")
    });
    viewer = createViewer(annotations, partsData, brainData);
    annotations.register("journey", $("journey-host"), journeyList, journeyCard);
    viewer.registerHost("journey", $("journey-host"), { view: STEPS[0].view, filmControlled: true });
    viewer.registerHost("sync", $("sync-host"), { modelId: "c03", view: { az: 70, el: 12 } });
    createSyncSection({ viewer, root: $("tu-may-len-nen-tang") });
    createProcessSection({ viewer, root: $("qua-trinh"), brain: brainData });
    teaser = createTeaser({ viewer });
    void introFinished.then(() => teaser.enable());
    viewer.onProgress(({ modelId, percent, error }) => {
      if (modelId === "body") {
        if (error) showLoadError();
        else if ($("film-loading")) $("film-loading").textContent = `Đang tải mô hình 3D… ${Math.round(percent)}%`;
      }
    });
    const body = await viewer.load("body");
    teaser.ready(body);
    const poster = $("film-poster");
    if (poster) {
      poster.classList.add("is-ready");
      setTimeout(() => poster.remove(), 400);
    }
  } catch (error) {
    console.warn("The landing viewer could not start. Run node serve.mjs with SCM-BEANS_Dashboard_FE next to this repo, or set DASHBOARD_PUBLIC.", error);
    // Keep the loading message visible when the 3D film cannot start.
    showLoadError();
    for (const id of ["process-host", "sync-host"]) {
      if ($(id).querySelector(".viewer-status")) continue;
      const message = document.createElement("p");
      message.className = "viewer-status load-error"; message.setAttribute("role", "status");
      message.textContent = LOAD_ERROR;
      $(id).appendChild(message);
    }
  }
}
void startViewer();
setTimeout(dismissIntro, 1400);
