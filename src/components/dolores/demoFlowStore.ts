const STORAGE_KEY = "dolores-demo-flow-v1";

type DemoFlow = Record<string, string>;

function getFlow(): DemoFlow {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as DemoFlow;
  } catch {
    return {};
  }
}

export function readDemoFlow(key: string): string | undefined {
  return getFlow()[key];
}

export function writeDemoFlow(key: string, value: string) {
  if (typeof window === "undefined") return;
  const current = getFlow();
  current[key] = value;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  window.dispatchEvent(new CustomEvent("dolores-demo-flow", { detail: { key, value } }));
}
