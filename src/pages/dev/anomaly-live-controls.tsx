import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useRouter } from "next/router";
import { useRef, useState } from "react";
import { analyse, type HealthReport } from "@/lib/anomaly/analysis";
import { listMachines, loadPoints, mockAnchorMs, type LoadProgress } from "@/lib/anomaly/live-api";
import styles from "./anomaly-demo.module.css";

const WINDOWS = [1, 2, 6, 12];
const BUCKETS = 12;

function explain(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    // the FE client retries a 401 through /auth/refresh; with no session that call fails with 400
    const noSession = Boolean(error.config?.url?.includes("/auth/refresh"));
    if (noSession || status === 401 || status === 403) return "Chưa đăng nhập hoặc không đủ quyền. Đăng nhập tại /login (Admin, Moderator hoặc Owner), rồi tải lại trang.";
    if (status === 503) return "Server không truy vấn được telemetry của máy này (503). Thử máy khác hoặc cửa sổ ngắn hơn.";
    if (error.code === "ECONNABORTED") return "Server phản hồi quá chậm. Thử cửa sổ ngắn hơn.";
    return `Lỗi API ${status ?? "mạng"}.`;
  }
  return error instanceof Error ? error.message : "Lỗi không xác định.";
}

export function LiveControls({ onResult }: { onResult: (report: HealthReport | null) => void }) {
  const mock = useRouter().query.mock === "1"; // /dev/anomaly-demo?data=live&mock=1 -> saved sample, no server calls
  const machines = useQuery({ queryKey: ["anomaly-live-machines", mock], queryFn: ({ signal }) => listMachines(mock, signal) });
  const [machineId, setMachineId] = useState("");
  const [hours, setHours] = useState(2);
  const [progress, setProgress] = useState<LoadProgress | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const chosen = machineId || machines.data?.[0]?.id || "";

  const run = async () => {
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setRunning(true);
    setMessage(null);
    setProgress(null);
    onResult(null);
    try {
      const toMs = mock ? await mockAnchorMs() : Date.now();
      const fromMs = toMs - hours * 3_600_000;
      const { points, truncatedChunks } = await loadPoints(chosen, fromMs, toMs, setProgress, mock, controller.signal);
      if (!points.length) {
        setMessage("Máy này không có điểm telemetry trong cửa sổ đã chọn.");
        return;
      }
      const report = analyse(points, { machineId: chosen, fromMs, toMs, buckets: BUCKETS, baselineBuckets: 4, unit: "khung" });
      report.note += mock ? " Nguồn: file mẫu đã lưu, không gọi server." : " Nguồn: API telemetry của Dolores qua FE.";
      report.note += ` Mỗi khung = ${Math.round((hours * 60) / BUCKETS)} phút.` +
        (truncatedChunks ? ` Cảnh báo: ${truncatedChunks} đoạn 1 giờ chạm giới hạn 100.000 điểm của API nên dữ liệu bị cắt.` : "");
      onResult(report);
    } catch (error) {
      if (!controller.signal.aborted) setMessage(explain(error));
    } finally {
      setRunning(false);
    }
  };

  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>{mock ? "Chế độ mẫu: dữ liệu thật đã lưu, không gọi server" : "Dữ liệu trực tiếp qua API của FE"}</h2>
      <div className={styles.filters}>
        <label>
          Máy{" "}
          <select value={chosen} onChange={(e) => setMachineId(e.target.value)} disabled={running || !machines.data?.length}>
            {(machines.data ?? []).map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </label>
        <label>
          Cửa sổ{" "}
          <select value={hours} onChange={(e) => setHours(Number(e.target.value))} disabled={running}>
            {WINDOWS.map((h) => <option key={h} value={h}>{h} giờ gần nhất</option>)}
          </select>
        </label>
        <button type="button" onClick={run} disabled={running || !chosen}>{running ? "Đang tải…" : "Tải và phân tích"}</button>
        {running && <button type="button" onClick={() => abort.current?.abort()}>Dừng</button>}
      </div>
      {machines.isLoading && <p className={styles.muted}>Đang lấy danh sách máy…</p>}
      {machines.error && <p className={styles.error}>{explain(machines.error)}</p>}
      {progress && (
        <p className={styles.muted}>
          Đã tải {progress.points.toLocaleString("vi-VN")} điểm ({progress.chunksDone}/{progress.chunksTotal} đoạn 1 giờ)
        </p>
      )}
      {message && <p className={styles.error}>{message}</p>}
    </section>
  );
}