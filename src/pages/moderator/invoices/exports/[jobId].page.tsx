import { useRouter } from "next/router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { billingApi } from "@/apis/billing.api";
import { PageActions } from "@/components/action-bar/page-actions";
import { getApiErrorMessage } from "@/lib/api-errors";
import { ExportJobIdSchema } from "@/schema/billing.schema";
import { ModeratorShell } from "../../moderator-shell";
import { ModeratorPageHeading } from "../../moderator-page-heading";

export default function ModeratorExportJobPage() {
  const router = useRouter();
  const jobId = typeof router.query.jobId === "string" ? router.query.jobId : "";
  const valid = ExportJobIdSchema.safeParse(jobId).success;
  const job = useQuery({ queryKey: ["moderator", "billing-export", jobId], queryFn: ({ signal }) => billingApi.getExportJob(jobId, signal), enabled: valid, refetchInterval: (query) => ["QUEUED", "PROCESSING"].includes(query.state.data?.status ?? "") ? 3000 : false });
  const download = useMutation({ mutationFn: () => billingApi.downloadExportContent(jobId), onSuccess: (blob) => { const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "dolores-invoices.csv"; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 0); } });
  return <ModeratorShell pageTitle="Tải dữ liệu hóa đơn"><ModeratorPageHeading title="Tải dữ liệu hóa đơn" />
    {!router.isReady || (valid && job.isPending) ? <p role="status">Đang tải…</p> : !valid ? <p role="alert">Mã xuất dữ liệu không hợp lệ.</p> : job.isError ? <p role="alert">{getApiErrorMessage(job.error)}</p> : job.data ? <><p>Trạng thái: {job.data.status}</p>{job.data.status === "FAILED" && <p role="alert">{job.data.message || "Không thể tạo file xuất."}</p>}{download.isError && <p role="alert">{getApiErrorMessage(download.error)}</p>}<PageActions actions={job.data.status === "COMPLETED" ? [{ id: "invoice-export-download", label: "Tải file hóa đơn", variant: "primary", pending: download.isPending, pendingLabel: "Đang tải file", onClick: () => download.mutate() }] : []} /></> : null}
  </ModeratorShell>;
}
