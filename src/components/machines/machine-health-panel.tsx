import { useState } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { telemetryApi } from "@/apis/telemetry.api";
import { ButtonBar } from "@/components/button/button-bar";
import { TextLinkButton } from "@/components/button/text-link-button";
import { DataTable } from "@/components/table/data-table";
import { getApiErrorMessage } from "@/lib/api-errors";
import { MachineConnectionBadge } from "./machine-connection-badge";
import { SmartIotPanel } from "./smart-iot-panel";
import styles from "./machine-health.module.css";

const MachineTemperatureHistory = dynamic(() => import("./machine-temperature-history").then(module => module.MachineTemperatureHistory));

const statusLabels = {
  STABLE: "Ổn định",
  MONITOR: "Cần theo dõi",
  INSPECT: "Cần kiểm tra",
  INSUFFICIENT_DATA: "Chưa đủ dữ liệu",
  DISABLED: "Đã tắt",
  VARIABLE: "Có dao động",
  UNSTABLE: "Không ổn định",
};

const subsystems = [
  ["thermal", "Gia nhiệt"],
  ["hydraulics", "Hệ thống nước"],
  ["kinematics", "Cơ cấu chuyển động"],
  ["milk", "Mô-đun sữa"],
] as const;

const numberFormat = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 });
const dateTimeFormat = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Asia/Ho_Chi_Minh",
});

function measurement(value: number | null | undefined, unit: string) {
  return value == null ? "—" : `${numberFormat.format(value)} ${unit}`;
}

function dateTime(value: string | null | undefined) {
  return value ? dateTimeFormat.format(new Date(value)) : "Chưa ghi nhận";
}

export function MachineHealthStatus({ status }: { status: keyof typeof statusLabels }) {
  return <span className={styles.badge} data-status={status}>{statusLabels[status]}</span>;
}

export function MachineHealthPanel({ machineId, subject, onOpenCleaning }: {
  machineId: string;
  subject: string;
  onOpenCleaning: () => void;
}) {
  const [showTemperature, setShowTemperature] = useState(false);
  const query = useQuery({
    queryKey: ["machine-health", subject, machineId],
    queryFn: ({ signal }) => telemetryApi.getMachineHealth(machineId, signal),
    staleTime: 30_000,
    retry: false,
  });

  if (!query.data || query.isError) {
    return <SmartIotPanel
      title="Sức khỏe máy"
      state={query.isError ? "error" : "loading"}
      stateMessage={query.isError ? getApiErrorMessage(query.error) : "Đang tải đánh giá sức khỏe máy…"}
      onRetry={() => void query.refetch()}
    />;
  }

  const health = query.data;
  const { dataQuality, cleaningHygiene } = health;
  const needsAttention = subsystems
    .filter(([key]) => health.subsystems[key].status === "INSPECT" || health.subsystems[key].status === "MONITOR")
    .map(([, label]) => label);
  const hygieneStatus = cleaningHygiene.overdue == null ? "Chưa xác định"
    : cleaningHygiene.overdue ? "Quá hạn" : "Trong hạn";

  return <div className={styles.stack}>
    <SmartIotPanel title="Đánh giá gần nhất">
      <div className={styles.overview}>
        <div>
          <div className={styles.badges}>
            <MachineHealthStatus status={health.overallStatus} />
            <MachineConnectionBadge state={health.connectionStatus} />
          </div>
          {needsAttention.length > 0 && <p className={styles.attention}><strong>Cần chú ý</strong> {needsAttention.join(", ")}</p>}
          {health.connectionStatus === "OFFLINE" && <p className={styles.muted}>Kết quả tại lần đánh giá gần nhất.</p>}
        </div>
        <ButtonBar disabled={query.isFetching} onClick={() => void query.refetch()}>
          {query.isFetching ? "Đang cập nhật…" : "Làm mới đánh giá"}
        </ButtonBar>
      </div>
      <dl className={styles.facts}>
        <div><dt>Đánh giá lúc</dt><dd>{dateTime(health.evaluatedAt)}</dd></div>
        <div><dt>Chu kỳ có dữ liệu · 14 ngày</dt><dd>{numberFormat.format(dataQuality.evaluatedCycles14d)}</dd></div>
        <div><dt>Sự cố · 7 ngày</dt><dd>{numberFormat.format(dataQuality.recentIncidents7d)}</dd></div>
      </dl>
      {!dataQuality.sufficientHistory && health.overallStatus !== "INSUFFICIENT_DATA" && <p className={styles.muted}>Lịch sử đo còn hạn chế.</p>}
      {dataQuality.stuckSensorDetected && <p className={styles.warning}>Phát hiện cảm biến có giá trị đứng yên bất thường.</p>}
    </SmartIotPanel>

    <SmartIotPanel title="Tình trạng từng bộ phận">
      <div className={styles.subsystems}>
        {subsystems.map(([key, label]) => {
          const component = health.subsystems[key];
          return <details key={key} onToggle={key === "thermal" ? (event) => setShowTemperature(event.currentTarget.open) : undefined}>
            <summary className={styles.subsystemSummary}>
              <span>
                <strong>{label}</strong>
                {component.condition && <span className={styles.subline}>{component.condition}</span>}
              </span>
              <MachineHealthStatus status={component.status} />
              <ChevronDown className={styles.chevron} size={18} aria-hidden="true" />
            </summary>
            <div className={styles.subsystemDetail}>
              {component.score != null && component.status !== "DISABLED" && component.status !== "INSUFFICIENT_DATA" &&
                <p><strong>Điểm đánh giá</strong> {numberFormat.format(component.score)}/100</p>}
              {component.evidence ? <p><strong>Căn cứ</strong> {component.evidence}</p> : <p className={styles.muted}>Chưa có số liệu chi tiết.</p>}
              {key === "thermal" && showTemperature && <MachineTemperatureHistory machineId={machineId} subject={subject} />}
            </div>
          </details>;
        })}
      </div>
      {health.recommendations.length > 0 && <details className={styles.recommendations}>
        <summary>Khuyến nghị kiểm tra</summary>
        <ul>{health.recommendations.map((recommendation, index) => <li key={index}>{recommendation}</li>)}</ul>
      </details>}
    </SmartIotPanel>

    <div className={styles.secondary}>
      <SmartIotPanel title="Độ ổn định khi pha" className={styles.brew}>
        {health.brewStability.length === 0 ? <p className={styles.muted}>Chưa đủ dữ liệu theo công thức.</p> :
          <DataTable rows={health.brewStability} rowKey={(row, index) => `${row.recipeName}-${index}`} columns={[
            { key: "recipe", header: "Công thức", render: row => <><strong>{row.recipeName}</strong><small className={styles.subline}>{numberFormat.format(row.brewCount)} lượt pha</small></> },
            { key: "yield", header: "Thể tích", render: row => <Measurement value={row.meanYieldMl} unit="ml" variation={row.yieldCvPct} /> },
            { key: "duration", header: "Thời gian", render: row => <Measurement value={row.meanDurationSec} unit="giây" variation={row.durationCvPct} /> },
            { key: "status", header: "Tình trạng", render: row => <MachineHealthStatus status={row.stabilityStatus} /> },
          ]} />}
        <small className={styles.processNote} title={health.processStabilityDisclaimer ?? undefined}>Bảng đo độ đồng đều của thể tích và thời gian pha. Hương vị cần được đánh giá bằng thử nếm.</small>
      </SmartIotPanel>
      <SmartIotPanel title="Vệ sinh">
        <p className={styles.hygieneStatus} data-overdue={cleaningHygiene.overdue === true}>{hygieneStatus}</p>
        <dl className={styles.facts}>
          <div><dt>Vệ sinh lần cuối</dt><dd>{dateTime(cleaningHygiene.lastCleanedAt)}</dd></div>
          <div><dt>Số ly sau lần vệ sinh</dt><dd>{measurement(cleaningHygiene.cupsSinceLastClean, "ly")}</dd></div>
        </dl>
        <TextLinkButton onClick={onOpenCleaning}>Xem lịch sử vệ sinh</TextLinkButton>
      </SmartIotPanel>
    </div>
  </div>;
}

function Measurement({ value, unit, variation }: { value: number | null | undefined; unit: string; variation: number | null | undefined }) {
  return <>{measurement(value, unit)}{variation != null && <small className={styles.subline}>Dao động {numberFormat.format(variation)}%</small>}</>;
}
