import { COPY, LOGIN_URL } from "./clusters.js";

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

let viewer = null;
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

// Dismiss the brand intro independently of media loading.
function dismissIntro() {
  if (!$("intro")) return;
  document.body.style.overflow = previousOverflow;
  $("intro").remove();
}
const film = $("hero-video"), filmToggle = $("film-toggle");
const filmViewport = matchMedia("(max-width: 800px)");
let filmVisible = false, filmPaused = motion.matches;
function updateFilmSource() {
  film.poster = `/video/dolores-machine-reveal${filmViewport.matches ? "-mobile" : ""}.jpg`;
  film.load(); updateFilm();
}
function updateFilm() {
  if (filmVisible && !document.hidden && !filmPaused) void film.play().catch(() => {});
  else film.pause();
}
function updateFilmButton() {
  filmToggle.textContent = film.paused ? "▶" : "Ⅱ";
  filmToggle.setAttribute("aria-label", film.paused ? "Phát hoạt ảnh máy pha" : "Tạm dừng hoạt ảnh máy pha");
}
filmToggle.addEventListener("click", () => { filmPaused = !film.paused; updateFilm(); });
film.addEventListener("play", updateFilmButton);
film.addEventListener("pause", updateFilmButton);
document.addEventListener("visibilitychange", updateFilm);
motion.addEventListener("change", () => { filmPaused = motion.matches; updateFilm(); });
filmViewport.addEventListener("change", updateFilmSource);
updateFilmSource();
if (typeof IntersectionObserver !== "undefined") {
  new IntersectionObserver(([entry]) => { filmVisible = entry.isIntersecting; updateFilm(); }).observe(film);
} else { filmVisible = true; updateFilm(); }

async function startViewer() {
  try {
    const [{ annotationData, createAnnotations }, { createViewer }, { createSyncSection }, { createProcessSection }, response] = await Promise.all([
      import("./annotations.js"), import("./viewer.js"), import("./sync/section.js"), import("./process/section.js"), fetch("./landing/brain.json")
    ]);
    if (!response.ok) throw new Error("brain.json");
    const brainData = await response.json();
    const partsData = await annotationData;
    const annotations = createAnnotations(partsData, {
      highlight: meshes => viewer?.highlight(meshes),
      openDetail: () => location.assign("./machine.html")
    });
    viewer = createViewer(annotations, partsData, brainData);
    viewer.registerHost("sync", $("sync-host"), { modelId: "c03", view: { az: 70, el: 12 } });
    createSyncSection({ viewer, root: $("tu-may-len-nen-tang") });
    createProcessSection({ viewer, root: $("qua-trinh"), brain: brainData });
  } catch (error) {
    console.warn("The interactive machine sections could not start.", error);
    for (const id of ["process-host", "sync-host"]) {
      if ($(id).querySelector(".viewer-status")) continue;
      const message = document.createElement("p");
      message.className = "viewer-status load-error"; message.setAttribute("role", "status");
      message.textContent = LOAD_ERROR;
      $(id).appendChild(message);
    }
  }
}
// Interactive sections load only when approached; the hero and login use exported video.
if (typeof IntersectionObserver !== "undefined") {
  const observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); void startViewer(); }
  }, { rootMargin: "200px" });
  observer.observe($("qua-trinh")); observer.observe($("tu-may-len-nen-tang"));
} else void startViewer();
setTimeout(dismissIntro, 1400);
