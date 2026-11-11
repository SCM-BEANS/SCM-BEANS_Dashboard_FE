export const OPERATION_STAGES = Object.freeze([
  { phase: "grinding", label: "Xay", durationMs: 1600 },
  { phase: "dosing", label: "Định lượng", durationMs: 1100 },
  { phase: "closing", label: "Đóng", durationMs: 1200, main: [0, 1], lower: [1, 1] },
  { phase: "tamping", label: "Nén", durationMs: 1600, main: [1, 1], lower: [1, 0.5] },
  { phase: "extraction", label: "Chiết xuất", durationMs: 2200 },
  { phase: "opening", label: "Mở", durationMs: 1100, main: [1, 0], lower: [0.5, 0.5] },
  { phase: "ejecting", label: "Đẩy bã", durationMs: 1300, main: [0, 0], lower: [0.5, 0] },
  { phase: "scraping", label: "Gạt", durationMs: 2200, main: [0, 0.6196234683], lower: [0, 0] }
]);

export const CYCLE_DURATION_MS = OPERATION_STAGES.reduce((total, stage) => total + stage.durationMs, 0);

export function phaseAt(elapsedMs, stages = OPERATION_STAGES) {
  const durationMs = stages === OPERATION_STAGES ? CYCLE_DURATION_MS : stages.reduce((total, stage) => total + stage.durationMs, 0);
  let remaining = ((elapsedMs % durationMs) + durationMs) % durationMs;
  let main = 0, lower = 0;
  for (let index = 0; index < stages.length; index += 1) {
    const stage = stages[index];
    if (remaining < stage.durationMs || index === stages.length - 1) {
      const progress = Math.min(1, remaining / stage.durationMs);
      return {
        index,
        stage,
        progress,
        main: stage.main ? stage.main[0] + (stage.main[1] - stage.main[0]) * progress : main,
        lower: stage.lower ? stage.lower[0] + (stage.lower[1] - stage.lower[0]) * progress : lower
      };
    }
    remaining -= stage.durationMs;
    if (stage.main) main = stage.main[1];
    if (stage.lower) lower = stage.lower[1];
  }
  return { index: 0, stage: stages[0], progress: 0, main: 0, lower: 0 };
}

export function phaseStartMs(index) {
  return OPERATION_STAGES.slice(0, index).reduce((total, stage) => total + stage.durationMs, 0);
}
