import { createPlatform } from "./platform.js";
import { createServiceRoute } from "./route.js";
const escapeText = value => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));

export function createLandingTail(copy, brand) {
  createPlatform(document.getElementById("technology-content"), copy.TECHNOLOGY);
  createServiceRoute(document.getElementById("dong-hanh"), copy.SERVICES);
  document.getElementById("contact-content").innerHTML = `<div class="tail-contact-copy"><h2 id="contact-title">${copy.CONTACT.TITLE.split("\n").map(line => `<span>${escapeText(line)}</span>`).join("")}</h2><div class="button-row"><a class="button primary" href="mailto:${copy.CONTACT.EMAIL}">${escapeText(copy.CONTACT.CONSULT_ACTION)}</a><a class="button" data-login>${escapeText(copy.CONTACT.DASHBOARD_ACTION)}</a></div></div><span class="tail-contact-wordmark" aria-hidden="true">dolores.</span>`;
  document.getElementById("footer-content").innerHTML = `<div class="tail-footer-brand">${brand}<p>${escapeText(copy.FOOTER.DESCRIPTION)}</p><small>© ${new Date().getFullYear()} DOLORES COFFEE</small></div><div class="tail-footer-navigation"><nav aria-label="Điều hướng cuối trang"><a href="#ben-trong">Máy pha</a><a href="#qua-trinh">Quy trình pha</a><a href="#nen-tang">Nền tảng</a><a href="#lien-he">Liên hệ</a></nav><a class="tail-footer-email" href="mailto:${copy.CONTACT.EMAIL}">${escapeText(copy.CONTACT.EMAIL)}</a></div>`;
}
