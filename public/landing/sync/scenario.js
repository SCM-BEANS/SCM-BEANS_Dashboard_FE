import { OPERATION_STAGES, phaseAt, phaseStartMs } from "../motion/cycle.js";

const LABELS = ["Đóng buồng", "Nén bột", "Chiết xuất", "Mở buồng", "Đẩy bã", "Gạt bã"];
let offset = 0;
export const SYNC_STAGES = Object.freeze(OPERATION_STAGES.slice(2).map((stage, index) => {
  const result = { ...stage, title: LABELS[index], start: offset / 1000, end: (offset + stage.durationMs) / 1000 };
  offset += stage.durationMs;
  return Object.freeze(result);
}));
export const TOTAL = offset / 1000;
const CYCLE_OFFSET = phaseStartMs(2);
const clampTime = t => Math.max(0, Math.min(TOTAL - .000001, t));

export function poseAt(t) {
  const time = clampTime(t);
  const position = phaseAt(CYCLE_OFFSET + time * 1000);
  return { main: position.main, lower: position.lower, progress: position.progress, phase: position.index - 2, stage: position.stage };
}

export function phaseTime(index, atEnd = false) {
  const stage = SYNC_STAGES[index];
  return atEnd ? stage.end - .000001 : stage.start;
}

// Preview telemetry follows the animation clock; pulse counts/PWM are not measurements or hardware calibration.
export function panelAt(t, { running = true, complete = false } = {}) {
  const pose = poseAt(t), encoder = Math.round((1 - pose.lower) * 2560);
  const moving = running && (pose.stage.phase === "tamping" || pose.stage.phase === "ejecting");
  const pwm = moving ? Math.round(42 + 12 * Math.sin(Math.PI * pose.progress)) : 0;
  const time = clampTime(t), points = [];
  for (let index = 0; index <= 48; index++) {
    const sample = time * index / 48;
    const value = (1 - poseAt(sample).lower) * 2560;
    points.push(`${(sample / TOTAL * 480).toFixed(2)},${(104 - value / 2560 * 88).toFixed(2)}`);
  }
  return {
    phase: pose.phase, title: SYNC_STAGES[pose.phase].title, encoder, pwm,
    direction: moving ? "Tiến" : "Dừng",
    status: complete ? "Hoàn tất" : running ? "Đang vận hành" : t > 0 ? "Tạm dừng" : "Sẵn sàng",
    tone: complete ? "success" : running ? "active" : "idle",
    trace: `M${points.join(" L")}`,
    cursor: { x: time / TOTAL * 480, y: 104 - encoder / 2560 * 88 }
  };
}
