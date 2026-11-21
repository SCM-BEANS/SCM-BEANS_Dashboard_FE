import type { OwnerCleaningRecord } from "@/schema/owner-analytics.schema";

export function getVietnamToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (name: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === name)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function summarizeMachineCleaning(records: readonly OwnerCleaningRecord[], machineId: string, complete: boolean) {
  const summarize = (type: OwnerCleaningRecord["cleaningType"]) => {
    const matching = records.filter((record) => record.machineId === machineId && record.cleaningType === type);
    if (matching.some((record) => record.status === "COMPLETED")) return "Hoàn tất";
    if (!complete) return "Chưa kiểm tra đầy đủ";
    const latest = matching.reduce<OwnerCleaningRecord | undefined>((selected, record) => !selected || Date.parse(record.startedAt) > Date.parse(selected.startedAt) ? record : selected, undefined);
    return latest ? latest.status === "ABORTED" ? "Bị gián đoạn" : "Chưa hoàn tất" : "Chưa ghi nhận";
  };
  return { startup: summarize("STARTUP"), closing: summarize("CLOSING") };
}

