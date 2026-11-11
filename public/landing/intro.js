// Lucian UX/UI Prompt #205 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#205
const gaussian = (distance, spread) => Math.exp(-(distance * distance) / (2 * spread * spread));

export function createIntroWave(root) {
  const word = root?.querySelector(".intro-word");
  if (!word) return;

  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const label = word.textContent;
  word.replaceChildren();
  const letters = Array.from(label, character => {
    const element = document.createElement("span");
    element.className = "intro-letter";
    element.textContent = character;
    element.setAttribute("aria-hidden", "true");
    word.append(element);
    return { element, x: 0, y: 0, velocity: 0 };
  });

  let pointer = null, waveStart = motion.matches ? null : performance.now(), frame = 0, wordLeft = 0;
  function measure() {
    const rect = word.getBoundingClientRect();
    wordLeft = rect.left;
    letters.forEach(letter => { const letterRect = letter.element.getBoundingClientRect(); letter.x = letterRect.left + letterRect.width / 2 - rect.left; });
  }
  function schedule() { if (!frame && !motion.matches) frame = requestAnimationFrame(tick); }
  function tick(now) {
    frame = 0;
    if (!root.isConnected || motion.matches) return;
    let waveX = null;
    if (waveStart !== null) {
      const progress = (now - waveStart) / 1100;
      if (progress >= 1) waveStart = null;
      else waveX = -60 + (word.offsetWidth + 120) * progress;
    }

    let settling = false;
    letters.forEach(letter => {
      let target = pointer === null ? 0 : -34 * gaussian(letter.x - pointer, 34);
      if (waveX !== null) target -= 34 * 1.35 * gaussian(letter.x - waveX, 40.8);
      letter.velocity += (target - letter.y) * .16;
      letter.velocity *= .8;
      letter.y += letter.velocity;
      if (Math.abs(letter.velocity) > .02 || Math.abs(target - letter.y) > .05) settling = true;

      letter.element.style.setProperty("--y", `${letter.y}px`);
      letter.element.style.setProperty("--sy", 1 + Math.max(-.08, Math.min(.14, -letter.velocity * .02)));
    });
    if (settling || waveStart !== null) schedule();
  }

  word.addEventListener("pointermove", event => {
    if (motion.matches) return;
    pointer = event.clientX - wordLeft; schedule();
  }, { passive: true });
  word.addEventListener("pointerleave", () => { pointer = null; schedule(); });
  addEventListener("resize", measure, { passive: true });
  motion.addEventListener("change", event => {
    if (!event.matches) return;
    waveStart = pointer = null;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    letters.forEach(({ element }) => { element.style.removeProperty("--y"); element.style.removeProperty("--sy"); });
  });
  measure();
  if (!motion.matches) schedule();
}
