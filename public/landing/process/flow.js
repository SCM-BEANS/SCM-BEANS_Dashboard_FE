// Lucian UX/UI Prompt #201 · MIT License (c) 2026 Seokwoooo · https://lucianlabs.dev/uxui-prompt/#201
const clamp = value => Math.max(0, Math.min(1, value));
const ports = signals => [...new Set(signals.flatMap(signal => signal.pin?.match(/P[A-K]\d{1,2}/g) || []))].join(" · ");

export function boardFlowData(active, current = {}) {
  const signals = [...new Map([...active.values()].flat().map(signal => [`${signal.dir}:${signal.label}:${signal.pin}`, signal])).values()];
  const inputs = signals.filter(signal => signal.dir === "in");
  const outputs = signals.filter(signal => signal.dir === "out");
  return {
    input: { title: current.flow?.input || (inputs.length > 1 ? "Đọc cảm biến" : inputs[0]?.label || "Nhận lệnh"), pins: ports(inputs) || "Lệnh điều khiển", detail: inputs.map(signal => signal.pin).filter(Boolean).join("; ") },
    process: current.flow?.process || "Xử lý lệnh",
    outputs: current.flow?.actions || (outputs.length ? outputs.map(signal => ({ title: signal.label, pins: ports([signal]) || signal.pin, detail: signal.pin })) : [{ title: "Bắt đầu pha", pins: "Đã nhận lệnh" }])
  };
}

export function boardFlowAt(elapsed, outputCount) {
  const state = (start, duration) => elapsed < start ? "pending" : elapsed < start + duration ? "run" : "done";
  return {
    input: state(0, 300), process: state(820, 1100),
    inputTravel: clamp((elapsed - 300) / 520), outputTravel: clamp((elapsed - 1920) / 640),
    outputs: Array.from({ length: outputCount }, (_, index) => state(2560, index === 0 ? 500 : 800)),
    done: elapsed >= (outputCount > 1 ? 3360 : 3060)
  };
}
