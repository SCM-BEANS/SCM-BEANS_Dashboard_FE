"use client";

import { useEffect, useState } from "react";
import { demoFieldsSchema, demoRecordSchema, type DemoRecord } from "@/schemas/doloresDemo";

const STORAGE_KEY = "dolores-demo-flow-v1";
const RECORDS_KEY = "dolores-demo-records-v2";

type DemoFlow = Record<string, string>;

function getFlow(): DemoFlow {
  if (typeof window === "undefined") return {};
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([, value]) => typeof value === "string")) as DemoFlow;
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

function getRecords(): Record<string, unknown> {
  if (typeof window === "undefined") return {};
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(RECORDS_KEY) ?? "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  } catch { return {}; }
}

export function readDemoRecord(id: string): DemoRecord | undefined {
  const parsed = demoRecordSchema.safeParse(getRecords()[id]);
  return parsed.success && parsed.data.id === id ? parsed.data : undefined;
}

export function writeDemoRecord(id: string, status: string, payload: Record<string, string>, version = 1): boolean {
  if (typeof window === "undefined") return false;
  const parsed = demoRecordSchema.safeParse({ schemaVersion: 2, id, status, payload, version });
  if (!parsed.success) return false;
  try {
    window.localStorage.setItem(RECORDS_KEY, JSON.stringify({ ...getRecords(), [id]: parsed.data }));
    window.dispatchEvent(new CustomEvent("dolores-demo-flow", { detail: { key: id } }));
    return true;
  } catch { return false; }
}

export function useDemoRecord(id: string) {
  const [state, setState] = useState<{ id: string; record?: DemoRecord; loaded: boolean }>({ id, loaded: false });
  useEffect(() => {
    const update = () => {
      const next = readDemoRecord(id);
      setState(current => current.id === id && current.loaded && JSON.stringify(current.record) === JSON.stringify(next) ? current : { id, record: next, loaded: true });
    };
    update();
    window.addEventListener("dolores-demo-flow", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("dolores-demo-flow", update);
      window.removeEventListener("storage", update);
    };
  }, [id]);
  return state.id === id ? { record: state.record, loaded: state.loaded } : { record: undefined, loaded: false };
}

export function isRetrievalAssessment(record: DemoRecord | undefined): boolean {
  return record?.id === "technician:retrieval:YC-017" && record.status === "retrieved-assessed"
    && record.payload.machine === "S-018" && record.payload.contract === "C-204"
    && (record.payload.damage === "yes" || record.payload.damage === "no")
    && typeof record.payload.notes === "string";
}

export function readDemoFields(record: DemoRecord | undefined): [string, string][] {
  try {
    const parsed = demoFieldsSchema.safeParse(JSON.parse(record?.payload.fields ?? '[]'));
    return parsed.success ? parsed.data : [];
  } catch { return []; }
}
