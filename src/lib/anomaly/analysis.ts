// TypeScript port of the demo-anomaly pipeline (quality gate -> episode features -> bucketed table ->
// rules + per-machine baseline/EWMA -> status, evidence, step-vs-drift). It runs in the browser on telemetry
// points returned by the existing Dolores API. Thresholds are assumptions, not calibrated values.

export interface RawPoint {
  timestamp: string;
  field: string;
  value: unknown;
  subState?: string | null;
}

export type Status = "ON_DINH" | "CAN_THEO_DOI" | "CAN_KIEM_TRA" | "CHUA_DU_DU_LIEU";
export type ChangeKind = "STEP" | "DRIFT" | "UNCLEAR";

export interface Change {
  type: ChangeKind;
  onset_day: number;
  gap_days: number;
  text: string;
  action: string;
}
export interface Evidence {
  feature: string;
  value: number;
  baseline: number;
  ewma_z: number;
  check_first: string;
  change: Change | null;
}
export interface ComponentReport {
  status: Status;
  status_vi: string;
  since_day: number;
  rules: string[];
  evidence: Evidence[];
  label: string;
}
export interface MachineReport {
  id: string;
  overall: Status;
  overallVi: string;
  risk: number;
  components: Record<string, ComponentReport>;
  truth: { faultType: string; onsetDay: number | null; component: string | null };
  series: { features: Record<string, (number | null)[]>; status: Record<string, Status[]> };
}
export interface HealthReport {
  note: string;
  seed: number;
  days: number;
  baselineDays: number;
  unit: string;
  componentLabels: Record<string, string>;
  featureMeta: Record<string, { label: string; unit: string; component: string }>;
  rules: { component: string; id: string; text: string }[];
  evaluation: { detector: string; detected: string; medianDelayDays: number | null; falseAlarmRate: number | null }[];
  machines: MachineReport[];
}

export const COMPONENT_FEATURES: Record<string, string[]> = {
  THERMAL: ["heat_time_s", "hold_dev_mean", "hold_sd", "flat_frac_hold", "flat_frac_heat", "hold_triac_mean"],
  WATER: ["flow_per_pwm", "ratio_out_in", "pwm_mean"],
  MOTOR: ["enc_range"],
  MILK: ["mixer_rpm", "mixer_current_ma"],
};
const COMPONENT_LABEL: Record<string, string> = {
  THERMAL: "Hệ thống nhiệt", WATER: "Bơm và đường nước", MOTOR: "Motor / piston", MILK: "Cụm sữa",
};
const FEATURE_META: Record<string, [string, string]> = {
  heat_time_s: ["Thời gian gia nhiệt", "s"], hold_dev_mean: ["Lệch nhiệt so với setpoint", "°C"],
  hold_sd: ["Dao động nhiệt khi giữ", "°C"], flat_frac_hold: ["Tỉ lệ giá trị đứng (giữ nhiệt)", ""],
  flat_frac_heat: ["Tỉ lệ giá trị đứng (gia nhiệt)", ""], hold_triac_mean: ["Công suất triac khi giữ", "%"],
  flow_per_pwm: ["Lưu lượng trên mỗi % PWM", "Hz/%"], ratio_out_in: ["Tỉ lệ lưu lượng ra/vào", ""],
  pwm_mean: ["PWM bơm khi pha", "%"], enc_range: ["Hành trình encoder", "count"],
  mixer_rpm: ["Tốc độ mixer", "rpm"], mixer_current_ma: ["Dòng mixer", "mA"],
};
const SUGGEST: Record<string, string> = {
  heat_time_s: "Heater/triac/relay, cảm biến nhiệt, cặn bám boiler",
  hold_dev_mean: "Cảm biến nhiệt, cách nhiệt, hiệu chuẩn setpoint",
  hold_sd: "PID, relay/triac, độ ổn định nguồn",
  flat_frac_hold: "Cảm biến nhiệt đứng giá trị: giắc, dây, cảm biến",
  flat_frac_heat: "Cảm biến nhiệt đứng giá trị: giắc, dây, cảm biến",
  hold_triac_mean: "Công suất giữ nhiệt bất thường: heater, cách nhiệt",
  flow_per_pwm: "Nghẹt đường nước/lọc, van điện từ, bơm yếu",
  ratio_out_in: "Flowmeter (dây, kẹt, sai hệ số) hoặc rò rỉ giữa vào và ra",
  pwm_mean: "Bơm xuống cấp (PWM tăng để giữ lưu lượng), cặn, lọc",
  enc_range: "Kẹt cơ khí, encoder, driver motor, hộp số",
  mixer_rpm: "Cánh trộn, vòng bi, nghẹt cụm sữa",
  mixer_current_ma: "Cánh trộn, vòng bi, nghẹt cụm sữa",
};
const STATUS_VI: Record<Status, string> = {
  ON_DINH: "Ổn định", CAN_THEO_DOI: "Cần theo dõi", CAN_KIEM_TRA: "Cần kiểm tra", CHUA_DU_DU_LIEU: "Chưa đủ dữ liệu",
};
const RANK: Record<Status, number> = { ON_DINH: 0, CHUA_DU_DU_LIEU: 1, CAN_THEO_DOI: 2, CAN_KIEM_TRA: 3 };
const RISK_BASE = [0, 20, 35, 70];
const REL_FLOOR = 0.02;
const ABS_FLOOR: Record<string, number> = {
  flat_frac_hold: 0.05, flat_frac_heat: 0.05, pwm_mean: 1, enc_range: 5, hold_dev_mean: 0.1, hold_sd: 0.02,
  hold_triac_mean: 1, heat_time_s: 10, flow_per_pwm: 0.03, ratio_out_in: 0.01, mixer_rpm: 15, mixer_current_ma: 4,
};
const Z_ALERT = 4;
const Z_WATCH = 2.5;
const ALPHA = 0.5;
const MIN_COVERAGE = 0.7;
const MIN_POST = 3;
const OFF_GAP_MS = 60_000;
const TICK_MS = 2000;
const HOLD_BLOCK = 150;
const IDLE_STATES = new Set(["BREW_STATE_IDLE", "BREW_STATE_COMPLETE"]);
const REQUIRED = ["boiler_c", "pump_pwm_pct", "flowmeter_in_hz", "flowmeter_out_hz", "carriage_enc"];
const STEP_ACTION = "Kiểm tra có đổi firmware/app/cấu hình không; nếu có thì lập baseline mới, nếu không thì kiểm tra phần cứng";
const DRIFT_ACTION = "Theo dõi xu hướng và lên lịch kiểm tra trước khi hỏng hẳn";

type Num = number | null;
type Table = Record<string, Num[]>;

const RULES: { component: string; id: string; text: string; test: (v: Record<string, Num>) => boolean }[] = [
  { component: "THERMAL", id: "TH-01", text: "Gia nhiệt chậm: heat_time_s > 850 s", test: (v) => gt(v.heat_time_s, 850) },
  { component: "THERMAL", id: "TH-05", text: "Cảm biến nhiệt đứng giá trị: flat_frac_hold > 0.9", test: (v) => gt(v.flat_frac_hold, 0.9) },
  { component: "THERMAL", id: "TH-03", text: "Lệch setpoint > 8 °C khi giữ nhiệt", test: (v) => v.hold_dev_mean != null && Math.abs(v.hold_dev_mean) > 8 },
  { component: "WATER", id: "PW-01", text: "Bơm chạy nhưng lưu lượng thấp: flow_per_pwm < 1.3 Hz/%", test: (v) => lt(v.flow_per_pwm, 1.3) },
  { component: "WATER", id: "PW-02", text: "Tỉ lệ lưu lượng ra/vào lệch > 30%", test: (v) => lt(v.ratio_out_in, 0.7) || gt(v.ratio_out_in, 1.3) },
  { component: "WATER", id: "PW-03", text: "PWM bơm gần bão hòa: pwm_mean > 95", test: (v) => gt(v.pwm_mean, 95) },
  { component: "MOTOR", id: "MK-01", text: "Motor chạy nhưng encoder gần như không đổi: enc_range < 100", test: (v) => lt(v.enc_range, 100) },
  { component: "MILK", id: "ML-01", text: "Dòng mixer > 624 mA và RPM < 3360", test: (v) => gt(v.mixer_current_ma, 624) && lt(v.mixer_rpm, 3360) },
];

function gt(x: Num | undefined, t: number) { return x != null && x > t; }
function lt(x: Num | undefined, t: number) { return x != null && x < t; }
function median(a: number[]): number {
  if (!a.length) return NaN;
  const s = [...a].sort((x, y) => x - y);
  const n = s.length;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
}
const fin = (x: Num | undefined): x is number => x != null && Number.isFinite(x);
const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;

interface Row { t: number; sub: string; v: Record<string, number>; seq: number; seg: number; ok: boolean }
interface Episode { type: "BREW" | "HOLD"; rows: Row[] }

function buildRows(points: RawPoint[]): Row[] {
  const byT = new Map<number, Row>();
  for (const p of points) {
    const t = Date.parse(p.timestamp);
    if (!Number.isFinite(t)) continue;
    const num = typeof p.value === "number" ? p.value : typeof p.value === "string" ? Number(p.value) : NaN;
    let r = byT.get(t);
    if (!r) { r = { t, sub: "", v: {}, seq: 0, seg: 0, ok: false }; byT.set(t, r); }
    if (p.subState) r.sub = p.subState;
    if (Number.isFinite(num)) r.v[p.field] = num;
  }
  const rows = [...byT.values()].sort((a, b) => a.t - b.t)
    // start-up frames where every temperature is 0 carry no information
    .filter((r) => !["boiler_c", "thermoblock_c", "boiler_sp_c", "thermo_sp_c"].every((f) => r.v[f] === 0));
  let seq = 0;
  let seg = 0;
  rows.forEach((r, i) => {
    const dt = i ? r.t - rows[i - 1].t : 0;
    if (dt > OFF_GAP_MS) seg += 1;
    seq += i === 0 ? 0 : dt > OFF_GAP_MS ? 1 : Math.max(Math.round(dt / TICK_MS), 1);
    r.seq = seq;
    r.seg = seg;
    r.ok = REQUIRED.every((f) => r.v[f] !== undefined); // GPS-only / partial rows count for coverage but not for features
  });
  return rows;
}

function buildEpisodes(rows: Row[]): Episode[] {
  const eps: Episode[] = [];
  let i = 0;
  while (i < rows.length) {
    const busy = !IDLE_STATES.has(rows[i].sub || "UNKNOWN");
    let j = i;
    while (j < rows.length && rows[j].seg === rows[i].seg && !IDLE_STATES.has(rows[j].sub || "UNKNOWN") === busy) j += 1;
    const run = rows.slice(i, j);
    if (busy) eps.push({ type: "BREW", rows: run });
    else for (let k = 0; k < run.length; k += HOLD_BLOCK) eps.push({ type: "HOLD", rows: run.slice(k, k + HOLD_BLOCK) });
    i = j;
  }
  return eps;
}

function flatFrac(x: number[]): number | null {
  if (x.length < 2) return null;
  let same = 0;
  for (let k = 1; k < x.length; k += 1) if (x[k] === x[k - 1]) same += 1;
  return same / (x.length - 1);
}
const col = (rows: Row[], f: string) => rows.map((r) => r.v[f]).filter((x): x is number => x !== undefined);

function episodeFeatures(ep: Episode): Record<string, number> {
  const out: Record<string, number> = {};
  const r = ep.rows;
  if (ep.type === "HOLD" && r.length >= 10) {
    const b = col(r, "boiler_c");
    const sp = col(r, "boiler_sp_c");
    if (b.length === r.length && sp.length === r.length) {
      out.hold_dev_mean = mean(b.map((x, k) => x - sp[k]));
      const m = mean(b);
      out.hold_sd = Math.sqrt(mean(b.map((x) => (x - m) ** 2)));
      const ff = flatFrac(b);
      if (ff !== null) out.flat_frac_hold = ff;
    }
    const tr = col(r, "triac_boiler_pct");
    if (tr.length) out.hold_triac_mean = mean(tr);
  } else if (ep.type === "BREW") {
    // flow features only on pumped MAIN_EXTRACTION rows
    const pumped = r.filter((x) => x.sub.replace(/_/g, "").includes("MAINEXTRACTION") && (x.v.pump_pwm_pct ?? 0) > 50);
    if (pumped.length >= 3) {
      const pwm = mean(col(pumped, "pump_pwm_pct"));
      const fo = mean(col(pumped, "flowmeter_out_hz"));
      const fi = mean(col(pumped, "flowmeter_in_hz"));
      if ([pwm, fo, fi].every(Number.isFinite)) {
        out.pwm_mean = pwm;
        out.flow_per_pwm = fo / pwm;
        out.ratio_out_in = Math.min(fo / Math.max(fi, 1), 5);
      }
    }
    // encoder travel only means something if the motor was commanded (motor2_pwm); no command -> unknown
    if (r.length >= 10 && r.filter((x) => (x.v.motor2_pwm ?? 0) > 0).length >= 3) {
      const e = col(r, "carriage_enc");
      if (e.length) out.enc_range = Math.max(...e) - Math.min(...e);
    }
    const mixing = r.filter((x) => (x.v.mixer_rpm ?? 0) > 0);
    if (mixing.length >= 3) {
      out.mixer_rpm = mean(col(mixing, "mixer_rpm"));
      out.mixer_current_ma = mean(col(mixing, "mixer_current_ma"));
    }
  }
  return out;
}

function changeType(zs: Num[], base: number, unit: string): Change | null {
  const obs = zs.map((v, i) => ({ i, v })).filter((o): o is { i: number; v: number } => fin(o.v));
  const post = obs.filter((o) => o.i >= base);
  const hit = post.find((o) => Math.abs(o.v) > Z_WATCH);
  if (!hit) return null;
  const onset = hit.i;
  const after = post.filter((o) => o.i >= onset);
  const before = obs.filter((o) => o.i < onset);
  const gap = before.length ? onset - before[before.length - 1].i - 1 : 0;
  let type: ChangeKind = "UNCLEAR";
  if (after.length >= MIN_POST) {
    const plateau = median(after.slice(-3).map((o) => o.v));
    type = plateau !== 0 && after[0].v / plateau >= 0.7 ? "STEP" : "DRIFT";
  }
  const text = {
    STEP: `Đổi mức đột ngột từ ${unit} ${onset}` + (gap ? ` (thiếu dữ liệu ${gap} ${unit} trước đó, chưa loại trừ trôi dần)` : ""),
    DRIFT: `Xấu dần từ ${unit} ${onset}`,
    UNCLEAR: `Lệch khỏi baseline từ ${unit} ${onset}, chưa đủ ${unit} để phân biệt đột ngột hay trôi dần`,
  }[type];
  const action = { STEP: STEP_ACTION, DRIFT: DRIFT_ACTION, UNCLEAR: `Theo dõi thêm vài ${unit}` }[type];
  return { type, onset_day: onset, gap_days: gap, text, action };
}

export interface AnalyseOptions {
  machineId: string;
  fromMs: number;
  toMs: number;
  buckets?: number;
  baselineBuckets?: number;
  unit?: string;
}

export function analyse(points: RawPoint[], opt: AnalyseOptions): HealthReport {
  const nB = opt.buckets ?? 12;
  const base = opt.baselineBuckets ?? Math.max(2, Math.round(nB / 3));
  const unit = opt.unit ?? "khung";
  const bucketMs = (opt.toMs - opt.fromMs) / nB;
  const bucketOf = (t: number) => Math.min(nB - 1, Math.max(0, Math.floor((t - opt.fromMs) / bucketMs)));

  const rows = buildRows(points);
  const featureNames = Object.values(COMPONENT_FEATURES).flat();
  const samples: Record<string, number[][]> = Object.fromEntries(featureNames.map((f) => [f, Array.from({ length: nB }, () => [])]));
  for (const ep of buildEpisodes(rows.filter((r) => r.ok))) {
    const b = bucketOf(ep.rows[0].t);
    for (const [f, v] of Object.entries(episodeFeatures(ep))) if (Number.isFinite(v)) samples[f][b].push(v);
  }
  const table: Table = Object.fromEntries(featureNames.map((f) => [f, samples[f].map((a) => (a.length ? median(a) : null))]));

  // coverage by sequence gaps, per bucket
  const seqMin = Array<number>(nB).fill(Infinity);
  const seqMax = Array<number>(nB).fill(-Infinity);
  const count = Array<number>(nB).fill(0);
  for (const r of rows) {
    const b = bucketOf(r.t);
    count[b] += 1;
    seqMin[b] = Math.min(seqMin[b], r.seq);
    seqMax[b] = Math.max(seqMax[b], r.seq);
  }
  const coverage: Num[] = count.map((c, b) => (c ? c / (seqMax[b] - seqMin[b] + 1) : null));

  const codes = Object.keys(COMPONENT_FEATURES);
  const valid: Record<string, boolean[]> = {};
  for (const c of codes) {
    valid[c] = Array.from({ length: nB }, (_, b) =>
      (coverage[b] ?? 0) >= MIN_COVERAGE && COMPONENT_FEATURES[c].some((f) => table[f][b] != null));
  }

  // per machine baseline (median/MAD of the first `base` buckets) -> robust z -> EWMA(adjust=True, ignore NaN)
  const z: Table = {};
  const ewma: Table = {};
  const baseMed: Record<string, number> = {};
  for (const f of featureNames) {
    const bv = table[f].slice(0, base).filter(fin);
    z[f] = Array<Num>(nB).fill(null);
    ewma[f] = Array<Num>(nB).fill(null);
    if (bv.length < 2) continue;
    const m = median(bv);
    const mad = median(bv.map((x) => Math.abs(x - m)));
    const sigma = Math.max(1.4826 * mad, REL_FLOOR * Math.abs(m), ABS_FLOOR[f]);
    baseMed[f] = m;
    let num = 0;
    let den = 0;
    let cur: Num = null;
    for (let b = 0; b < nB; b += 1) {
      const x = table[f][b];
      if (x != null) {
        const zz = (x - m) / sigma;
        z[f][b] = zz;
        num = (1 - ALPHA) * num + zz;
        den = (1 - ALPHA) * den + 1;
        cur = num / den;
      }
      ewma[f][b] = cur; // carries the last EWMA over missing buckets
    }
  }

  const at = (b: number): Record<string, Num> => Object.fromEntries(featureNames.map((f) => [f, table[f][b]]));
  const debounced = (a: boolean[]) => a.map((x, b) => x && b > 0 && a[b - 1]);
  const status: Record<string, Status[]> = {};
  for (const c of codes) {
    const rule = Array.from({ length: nB }, (_, b) => RULES.some((r) => r.component === c && r.test(at(b))));
    const alert = Array.from({ length: nB }, (_, b) => COMPONENT_FEATURES[c].some((f) => fin(ewma[f][b]) && Math.abs(ewma[f][b] as number) > Z_ALERT));
    const watch = Array.from({ length: nB }, (_, b) => COMPONENT_FEATURES[c].some((f) => fin(ewma[f][b]) && Math.abs(ewma[f][b] as number) > Z_WATCH));
    const rd = debounced(rule);
    const ad = debounced(alert);
    status[c] = Array.from({ length: nB }, (_, b): Status =>
      !valid[c][b] ? "CHUA_DU_DU_LIEU" : rd[b] || ad[b] ? "CAN_KIEM_TRA" : watch[b] ? "CAN_THEO_DOI" : "ON_DINH");
  }

  let last = nB - 1;
  while (last > 0 && !featureNames.some((f) => table[f][last] != null)) last -= 1;

  const components: Record<string, ComponentReport> = {};
  for (const c of codes) {
    const s = status[c][last];
    const ev: Evidence[] = [];
    if (s === "CAN_THEO_DOI" || s === "CAN_KIEM_TRA") {
      for (const f of COMPONENT_FEATURES[c]) {
        const e = ewma[f][last];
        const x = table[f][last];
        if (fin(e) && Math.abs(e) > Z_WATCH && x != null) {
          ev.push({ feature: f, value: round(x, 3), baseline: round(baseMed[f] ?? NaN, 3), ewma_z: round(e, 1),
            check_first: SUGGEST[f], change: changeType(z[f], base, unit) });
        }
      }
      ev.sort((a, b) => Math.abs(b.ewma_z) - Math.abs(a.ewma_z));
    }
    let streak = 0;
    for (let b = last; b >= 0 && status[c][b] === s; b -= 1) streak += 1;
    components[c] = {
      status: s, status_vi: STATUS_VI[s], since_day: last - streak + 1,
      rules: RULES.filter((r) => r.component === c && r.test(at(last))).map((r) => r.id),
      evidence: ev.slice(0, 3), label: COMPONENT_LABEL[c],
    };
  }
  const overall = codes.map((c) => components[c].status).reduce((a, b) => (RANK[b] > RANK[a] ? b : a), "ON_DINH" as Status);
  const recent = Array.from({ length: Math.min(7, nB) }, (_, k) => {
    const b = nB - Math.min(7, nB) + k;
    return codes.some((c) => status[c][b] === "CAN_THEO_DOI" || status[c][b] === "CAN_KIEM_TRA");
  });
  const risk = RISK_BASE[RANK[overall]] + 30 * (recent.filter(Boolean).length / recent.length);

  return {
    note: `Dữ liệu thật, ${nB} ${unit} (baseline ${base} ${unit} đầu). Ngưỡng là giả định; không có nhãn lỗi nên không đo được độ chính xác.`,
    seed: 0, days: nB, baselineDays: base, unit,
    componentLabels: COMPONENT_LABEL,
    featureMeta: Object.fromEntries(Object.entries(COMPONENT_FEATURES).flatMap(([c, fs]) =>
      fs.map((f) => [f, { label: FEATURE_META[f][0], unit: FEATURE_META[f][1], component: c }]))),
    rules: RULES.map(({ component, id, text }) => ({ component, id, text })),
    evaluation: [],
    machines: [{
      id: opt.machineId, overall, overallVi: STATUS_VI[overall], risk: round(risk, 1), components,
      truth: { faultType: "UNKNOWN", onsetDay: null, component: null },
      series: { features: Object.fromEntries(featureNames.map((f) => [f, table[f].map((v) => (v == null ? null : round(v, 3)))])), status },
    }],
  };
}

function round(x: number, d: number) {
  const k = 10 ** d;
  return Math.round(x * k) / k;
}