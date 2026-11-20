// Live telemetry loader for the anomaly demo. It goes through the same layers as the rest of the FE:
// axiosClient (token + refresh), the Dolores proxy base URL, and the zod schemas in telemetry.schema.ts.
// The telemetry API pages with limit<=500 and offset<=100000, so the window is cut into 1-hour chunks to stay
// under the offset cap (a machine reports ~24 fields every 2 s, ~43k points per hour).
import { machinesApi } from "@/apis/machines.api";
import { axiosClient, DOLORES_API_BASE_URL } from "@/lib/http";
import { MachineIdSchema } from "@/schema/machines.schema";
import {
  TelemetryPointListSchema,
  TelemetryPointsParamsSchema,
  type TelemetryPoint,
} from "@/schema/telemetry.schema";
import type { RawPoint } from "./analysis";

const PAGE = 500;
const MAX_OFFSET = 100_000;
const CHUNK_MS = 3_600_000;
const CONCURRENCY = 3;

export interface LoadProgress { points: number; chunksDone: number; chunksTotal: number }
export interface LoadResult { points: RawPoint[]; truncatedChunks: number }

// Mock mode (?data=live&mock=1): serve public/anomaly-demo/sample-points.json through the same paging code,
// without calling the server. Built with demo-anomaly/export_sample.py from saved real telemetry.
interface Sample { machineId: string; serial: string; endMs: number; points: RawPoint[] }
let samplePromise: Promise<{ sample: Sample; times: number[] }> | null = null;
function loadSample() {
  samplePromise ??= fetch("/anomaly-demo/sample-points.json").then(async (r) => {
    if (!r.ok) throw new Error("Chưa có file mẫu. Chạy: python export_sample.py trong thư mục demo-anomaly.");
    const sample = (await r.json()) as Sample;
    return { sample, times: sample.points.map((p) => Date.parse(p.timestamp)) };
  });
  return samplePromise;
}
export async function mockAnchorMs() {
  return (await loadSample()).sample.endMs;
}

export async function listMachines(mock: boolean, signal?: AbortSignal) {
  if (mock) {
    const { sample } = await loadSample();
    return [{ id: sample.machineId, label: `${sample.serial} · mẫu đã lưu (không gọi server)` }];
  }
  const machines = await machinesApi.list(signal);
  return machines.map((m) => ({
    id: m.id,
    label: `${m.serialNumber ?? m.id.slice(0, 8)} · ${m.status ?? "?"}${m.machineType ? ` · ${m.machineType}` : ""}`,
  }));
}

async function fetchPage(
  machineId: string, from: number, to: number, offset: number, mock: boolean, signal?: AbortSignal,
): Promise<RawPoint[]> {
  if (mock) {
    const { sample, times } = await loadSample();
    const out: RawPoint[] = [];
    let seen = 0;
    for (let i = 0; i < times.length && out.length < PAGE; i += 1) {
      if (times[i] < from || times[i] >= to) continue;
      if (seen >= offset) out.push(sample.points[i]);
      seen += 1;
    }
    return out;
  }
  const params = TelemetryPointsParamsSchema.parse({
    from: new Date(from).toISOString(), to: new Date(to).toISOString(), limit: PAGE, offset,
  });
  const response = await axiosClient.get<unknown>(
    `/telemetry-query/machines/${encodeURIComponent(machineId)}/points`,
    { baseURL: DOLORES_API_BASE_URL, params, signal, timeout: 30_000 },
  );
  const page: TelemetryPoint[] = TelemetryPointListSchema.parse(response.data);
  if (page.some((p) => p.machineId !== machineId)) {
    throw new Error("Dolores returned telemetry for a different machine UUID.");
  }
  return page.map((p) => ({ timestamp: p.timestamp, field: p.field, value: p.value, subState: p.subState }));
}

async function fetchChunk(machineId: string, from: number, to: number, mock: boolean, signal?: AbortSignal) {
  const out: RawPoint[] = [];
  for (let offset = 0; offset <= MAX_OFFSET; offset += PAGE) {
    const page = await fetchPage(machineId, from, to, offset, mock, signal);
    out.push(...page);
    if (page.length < PAGE) return { points: out, truncated: false };
  }
  return { points: out, truncated: true };
}

export async function loadPoints(
  rawMachineId: string,
  fromMs: number,
  toMs: number,
  onProgress: (p: LoadProgress) => void,
  mock: boolean,
  signal?: AbortSignal,
): Promise<LoadResult> {
  const machineId = MachineIdSchema.parse(rawMachineId);
  const chunks: [number, number][] = [];
  for (let t = fromMs; t < toMs; t += CHUNK_MS) chunks.push([t, Math.min(t + CHUNK_MS, toMs)]);
  const points: RawPoint[] = [];
  let truncatedChunks = 0;
  let done = 0;
  let next = 0;
  const worker = async () => {
    while (next < chunks.length) {
      const [a, b] = chunks[next];
      next += 1;
      const r = await fetchChunk(machineId, a, b, mock, signal);
      points.push(...r.points);
      if (r.truncated) truncatedChunks += 1;
      done += 1;
      onProgress({ points: points.length, chunksDone: done, chunksTotal: chunks.length });
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, chunks.length) }, worker));
  return { points, truncatedChunks };
}