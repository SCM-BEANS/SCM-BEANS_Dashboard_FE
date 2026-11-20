import { useQuery } from "@tanstack/react-query";
import type { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import type { HealthReport } from "@/lib/anomaly/analysis";
import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { z } from "zod";
import styles from "./anomaly-demo.module.css";
import { LiveControls } from "./anomaly-live-controls";

// Standalone demo page. Reads static synthetic results (public/anomaly-demo/fe_demo.json) produced by
// the demo-anomaly project. It does not call the backend and is hidden in production builds.

const StatusSchema = z.enum(["ON_DINH", "CAN_THEO_DOI", "CAN_KIEM_TRA", "CHUA_DU_DU_LIEU"]);
type Status = z.infer<typeof StatusSchema>;

const EvidenceSchema = z.object({
  feature: z.string(), value: z.number(), baseline: z.number(), ewma_z: z.number(), check_first: z.string(),
  change: z.object({
    type: z.enum(["STEP", "DRIFT", "UNCLEAR"]), onset_day: z.number(), gap_days: z.number(), text: z.string(), action: z.string(),
  }).nullish(),
});
const ComponentSchema = z.object({
  status: StatusSchema, status_vi: z.string(), since_day: z.number(), rules: z.array(z.string()),
  evidence: z.array(EvidenceSchema), label: z.string(),
});
const MachineSchema = z.object({
  id: z.string(), overall: StatusSchema, overallVi: z.string(), risk: z.number(),
  components: z.record(ComponentSchema),
  truth: z.object({ faultType: z.string(), onsetDay: z.number().nullable(), component: z.string().nullable() }),
  series: z.object({
    features: z.record(z.array(z.number().nullable())), status: z.record(z.array(StatusSchema)),
  }),
});
const DemoSchema = z.object({
  note: z.string(), seed: z.number(), days: z.number(), baselineDays: z.number(), unit: z.string().default("ngày"),
  componentLabels: z.record(z.string()),
  featureMeta: z.record(z.object({ label: z.string(), unit: z.string(), component: z.string() })),
  rules: z.array(z.object({ component: z.string(), id: z.string(), text: z.string() })),
  evaluation: z.array(z.object({
    detector: z.string(), detected: z.string(), medianDelayDays: z.number().nullable(), falseAlarmRate: z.number().nullable(),
  })),
  machines: z.array(MachineSchema),
});
type Demo = z.infer<typeof DemoSchema>;
type Machine = z.infer<typeof MachineSchema>;

const STATUS_VI: Record<Status, string> = {
  ON_DINH: "Ổn định", CAN_THEO_DOI: "Cần theo dõi", CAN_KIEM_TRA: "Cần kiểm tra", CHUA_DU_DU_LIEU: "Chưa đủ dữ liệu",
};
const DETECTOR_VI: Record<string, string> = {
  rules: "Luật ngưỡng cố định", stat: "Baseline thống kê", iforest: "Isolation Forest", hybrid: "Hợp nhất",
};

async function loadDemo(dataset: string): Promise<Demo> {
  const res = await fetch(`/anomaly-demo/${dataset}.json`);
  if (!res.ok) throw new Error("Chưa có dữ liệu demo. Chạy: python export_fe.py trong thư mục demo-anomaly.");
  return DemoSchema.parse(await res.json());
}

function Badge({ status }: { status: Status }) {
  return <span className={`${styles.badge} ${styles[status]}`}>{STATUS_VI[status]}</span>;
}

function median(values: number[]) {
  const s = [...values].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
}

function ComponentCard({ code, machine, active, onPick, unit }: {
  code: string; machine: Machine; active: boolean; onPick: () => void; unit: string;
}) {
  const c = machine.components[code];
  return (
    <button type="button" onClick={onPick}
      className={`${styles.comp} ${active ? styles.compActive : ""}`}>
      <div className={styles.compHead}>
        <span>{c.label}</span>
        <Badge status={c.status} />
      </div>
      {c.status === "CHUA_DU_DU_LIEU" && (
        <p className={styles.muted}>Thiếu dữ liệu hoặc độ phủ thấp: không đánh giá là ổn định.</p>
      )}
      {c.evidence.map((e) => (
        <div key={e.feature} className={styles.evidence}>
          <div className={styles.mono}>{e.feature}: {e.value} <span className={styles.muted}>(baseline {e.baseline}, z {e.ewma_z})</span></div>
          <div>Kiểm tra trước: {e.check_first}</div>
          {e.change && <div><strong>{e.change.text}.</strong> {e.change.action}.</div>}
        </div>
      ))}
      {(c.status === "CAN_KIEM_TRA" || c.status === "CAN_THEO_DOI") && (
        <div className={styles.muted}>
          Từ {unit} {c.since_day}{c.rules.length ? ` · luật: ${c.rules.join(", ")}` : ""}
        </div>
      )}
    </button>
  );
}

function Timeline({ machine, demo }: { machine: Machine; demo: Demo }) {
  return (
    <div className={styles.tl}>
      {Object.keys(demo.componentLabels).map((code) => (
        <div key={code} className={styles.tlRow}>
          <span className={styles.tlLabel}>{demo.componentLabels[code]}</span>
          <div className={styles.tlCells}>
            {machine.series.status[code].map((s, day) => (
              <span key={day} title={`${demo.unit} ${day}: ${STATUS_VI[s]}`} className={`${styles.cell} ${styles["cell_" + s]}`} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Detail({ machine, demo, showTruth }: { machine: Machine; demo: Demo; showTruth: boolean }) {
  const codes = Object.keys(demo.componentLabels);
  const worst = codes.find((c) => machine.components[c].status === "CAN_KIEM_TRA")
    ?? codes.find((c) => machine.components[c].status !== "ON_DINH") ?? codes[0];
  const [code, setCode] = useState<string>(worst);
  const features = Object.entries(demo.featureMeta).filter(([, m]) => m.component === code);
  const [feature, setFeature] = useState<string>(
    Object.entries(demo.featureMeta).find(([, m]) => m.component === worst)![0],
  );
  const active = demo.featureMeta[feature]?.component === code ? feature : features[0][0];
  const values = machine.series.features[active];
  const data = values.map((v, day) => ({ day, value: v }));
  const base = median(values.slice(0, demo.baselineDays).filter((v): v is number => v !== null));
  const meta = demo.featureMeta[active];
  const pick = (c: string) => {
    setCode(c);
    setFeature(Object.entries(demo.featureMeta).find(([, m]) => m.component === c)![0]);
  };
  return (
    <div className={styles.detail}>
      <div className={styles.detailHead}>
        <h2>{machine.id}</h2>
        <Badge status={machine.overall} />
        <span className={styles.muted}>Điểm rủi ro {machine.risk}</span>
        {showTruth && machine.truth.faultType !== "UNKNOWN" && (
          <span className={styles.truthTag}>
            Đáp án: {machine.truth.faultType}{machine.truth.onsetDay !== null ? ` từ ngày ${machine.truth.onsetDay}` : ""}
          </span>
        )}
      </div>
      <div className={styles.comps}>
        {Object.keys(demo.componentLabels).map((c) => (
          <ComponentCard key={c} code={c} machine={machine} active={c === code} onPick={() => pick(c)} unit={demo.unit} />
        ))}
      </div>
      <section className={styles.card}>
        <div className={styles.chartHead}>
          <h3>Xu hướng theo {demo.unit}</h3>
          <select value={active} onChange={(e) => setFeature(e.target.value)}>
            {features.map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
          </select>
          <span className={styles.muted}>{meta.unit}</span>
        </div>
        <div className={styles.chartBox}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis domain={["auto", "auto"]} width={56} />
              <Tooltip />
              <ReferenceLine y={base} stroke="#64748b" strokeDasharray="4 4" label={{ value: "baseline", fontSize: 10 }} />
              <ReferenceLine x={demo.baselineDays - 1} stroke="#94a3b8" />
              {showTruth && machine.truth.onsetDay !== null && (
                <ReferenceLine x={machine.truth.onsetDay} stroke="#dc2626" strokeDasharray="4 4" label={{ value: "lỗi bắt đầu", fontSize: 10 }} />
              )}
              <Line type="monotone" dataKey="value" stroke="#721C24" dot={{ r: 2 }} connectNulls={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className={styles.card}>
        <h3 className={styles.cardTitle}>Trạng thái từng bộ phận theo {demo.unit}</h3>
        <Timeline machine={machine} demo={demo} />
        <div className={styles.legend}>
          {(Object.keys(STATUS_VI) as Status[]).map((s) => (
            <span key={s}><span className={`${styles.dot} ${styles["dot_" + s]}`} />{STATUS_VI[s]}</span>
          ))}
        </div>
      </section>
    </div>
  );
}

export default function AnomalyDemoPage() {
  const router = useRouter();
  // ?data=real -> saved real results, ?data=live -> fetched now through the FE API layer, default -> synthetic demo
  const isLive = router.query.data === "live";
  const dataset = router.query.data === "real" ? "fe_real" : "fe_demo";
  const saved = useQuery({
    queryKey: ["anomaly-demo", dataset], queryFn: () => loadDemo(dataset), enabled: router.isReady && !isLive,
  });
  const [liveReport, setLiveReport] = useState<HealthReport | null>(null);
  const data: Demo | undefined = isLive ? (liveReport ? DemoSchema.parse(liveReport) : undefined) : saved.data;
  const error = isLive ? null : saved.error;
  const isLoading = !isLive && saved.isLoading;
  const [selected, setSelected] = useState<string | null>(null);
  const [onlyAttention, setOnlyAttention] = useState(false);
  const [showTruth, setShowTruth] = useState(false);
  const machines = useMemo(
    () => (data?.machines ?? []).filter((m) => !onlyAttention || m.overall !== "ON_DINH"),
    [data, onlyAttention],
  );
  const current = data?.machines.find((m) => m.id === (selected ?? machines[0]?.id)) ?? null;

  return (
    <main className={styles.page}>
      <header>
        <h1>Demo sức khỏe máy và cảnh báo bất thường</h1>
        <p className={styles.banner}>
          {data?.note ?? "Dữ liệu tổng hợp, không phải máy thật."} Đây là demo riêng, không gọi backend.
        </p>
      </header>
      {isLive && <LiveControls onResult={(r) => { setLiveReport(r); setSelected(null); }} />}
      {isLoading && <p>Đang tải dữ liệu demo…</p>}
      {error && <p className={styles.error}>{(error as Error).message}</p>}
      {data && (
        <>
          {data.evaluation.length > 0 && (
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>So sánh bộ phát hiện (seed {data.seed}, {data.machines.length} máy, {data.days} ngày)</h2>
            <table className={styles.table}>
              <thead><tr><th>Bộ phát hiện</th><th>Phát hiện đúng lỗi</th><th>Độ trễ trung vị (ngày)</th><th>Báo giả / máy-ngày khỏe</th></tr></thead>
              <tbody>
                {data.evaluation.map((r) => (
                  <tr key={r.detector}>
                    <td>{DETECTOR_VI[r.detector] ?? r.detector}</td><td>{r.detected}</td>
                    <td>{r.medianDelayDays ?? "–"}</td><td>{r.falseAlarmRate === null ? "–" : `${(r.falseAlarmRate * 100).toFixed(1)}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          )}
          <div className={styles.layout}>
            <aside>
              <div className={styles.filters}>
                <label><input type="checkbox" checked={onlyAttention} onChange={(e) => setOnlyAttention(e.target.checked)} />Chỉ máy cần chú ý</label>
                <label><input type="checkbox" checked={showTruth} onChange={(e) => setShowTruth(e.target.checked)} />Hiện đáp án</label>
              </div>
              <ul className={styles.list}>
                {machines.map((m) => (
                  <li key={m.id}>
                    <button type="button" onClick={() => setSelected(m.id)}
                      className={`${styles.row} ${current?.id === m.id ? styles.rowActive : ""}`}>
                      <span className={styles.mono}>{m.id}</span>
                      <span className={styles.rowRight}>
                        {showTruth && m.truth.faultType !== "UNKNOWN" && <span className={styles.truth}>{m.truth.faultType === "NONE" ? "khỏe" : m.truth.faultType}</span>}
                        <span className={styles.muted}>{m.risk}</span>
                        <Badge status={m.overall} />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </aside>
            {current && <Detail key={current.id} machine={current} demo={data} showTruth={showTruth} />}
          </div>
        </>
      )}
    </main>
  );
}

export const getServerSideProps: GetServerSideProps = async () => {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_ANOMALY_DEMO !== "1") return { notFound: true };
  return { props: {} };
};