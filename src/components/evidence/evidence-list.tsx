import axios from "axios";
import { useEffect, useId, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { evidenceApi } from "@/apis/evidence.api";
import { ButtonBar } from "@/components/button/button-bar";
import { DataTable, type DataTableColumn } from "@/components/table/data-table";
import { getApiErrorMessage } from "@/lib/api-errors";
import { saveBlob } from "@/lib/save-blob";
import type { EvidenceItem, EvidenceResource } from "@/schema/evidence.schema";
import styles from "./evidence-list.module.css";

const PURPOSE_LABELS: Record<string, string> = {
  TERMINATION_INSPECTION: "Kiểm tra khi chấm dứt",
  TERMINATION_SETTLEMENT: "Quyết toán chấm dứt",
  DEPOSIT_DAMAGE: "Hư hỏng trừ cọc",
  MAINTENANCE_RESOLUTION: "Kết quả bảo trì",
  MAINTENANCE_CUSTODY: "Bàn giao bảo trì",
  OFFLINE_DECISION: "Quyết định mất kết nối",
};

function purposeLabel(purpose: string): string {
  return PURPOSE_LABELS[purpose] ?? purpose.replaceAll("_", " ").toLowerCase();
}

const decimalFormat = new Intl.NumberFormat("vi-VN", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const integerFormat = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });

function formatBytes(sizeBytes: number): string {
  if (!Number.isFinite(sizeBytes) || sizeBytes < 0) return "—";
  if (sizeBytes < 1024) return `${integerFormat.format(sizeBytes)} B`;
  const kilobytes = sizeBytes / 1024;
  if (kilobytes < 1024) return `${decimalFormat.format(kilobytes)} KB`;
  return `${decimalFormat.format(kilobytes / 1024)} MB`;
}

const uploadedAtFormat = new Intl.DateTimeFormat("vi-VN", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatUploadedAt(value: string): string {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? "—" : uploadedAtFormat.format(timestamp);
}

export function EvidenceList({
  resource,
  parentId,
  title = "Chứng từ",
  pageSize = 20,
}: {
  resource: EvidenceResource;
  parentId: string;
  title?: string;
  pageSize?: number;
}) {
  const generatedId = useId();
  const headingId = `evidence-list-${generatedId.replace(/:/g, "")}`;
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [resource, parentId]);

  const query = useQuery({
    queryKey: ["dolores", "evidence", resource, parentId, page, pageSize],
    queryFn: ({ signal }) => evidenceApi.list(resource, parentId, { page, size: pageSize }, signal),
    retry: false,
    enabled: Boolean(parentId),
  });

  const download = useMutation({
    mutationFn: async (item: EvidenceItem) => {
      const blob = await evidenceApi.download(resource, parentId, item.id);
      saveBlob(blob, item.originalFilename);
    },
  });

  const forbidden = axios.isAxiosError(query.error) && query.error.response?.status === 403;
  if (forbidden) return null;
  if (!parentId) return null;

  const data = query.data;
  const showPagination = Boolean(data) && (page > 0 || Boolean(data?.hasNext));

  const columns: DataTableColumn<EvidenceItem>[] = [
    {
      key: "filename",
      header: "Tệp",
      render: (item) => item.originalFilename,
    },
    {
      key: "purpose",
      header: "Mục đích",
      render: (item) => purposeLabel(item.purpose),
    },
    {
      key: "size",
      header: "Dung lượng",
      render: (item) => formatBytes(item.sizeBytes),
    },
    {
      key: "uploaded-at",
      header: "Thời gian tải lên",
      render: (item) => formatUploadedAt(item.uploadedAt),
    },
    {
      key: "download",
      header: "Tải xuống",
      align: "right",
      render: (item) => {
        const pending = download.isPending && download.variables?.id === item.id;
        return (
          <ButtonBar
            type="button"
            aria-label={`Tải xuống ${item.originalFilename}`}
            disabled={pending}
            onClick={() => download.mutate(item)}
          >
            {pending ? "Đang tải…" : "Tải xuống"}
          </ButtonBar>
        );
      },
    },
  ];

  return (
    <section className={styles.panel} aria-labelledby={headingId}>
      <h2 className={styles.heading} id={headingId}>{title}</h2>
      {query.isPending ? <p className={styles.state} role="status">Đang tải chứng từ…</p> : null}
      {query.isError && !forbidden ? (
        <div className={styles.error} role="alert">
          <p>{getApiErrorMessage(query.error)}</p>
          <ButtonBar type="button" onClick={() => void query.refetch()}>Thử lại</ButtonBar>
        </div>
      ) : null}
      {data ? (
        <>
          <DataTable
            headerVariant="admin"
            rows={data.items}
            rowKey={(item) => item.id}
            emptyMessage="Chưa có chứng từ."
            columns={columns}
          />
          {download.isError ? (
            <p className={styles.errorText} role="alert">{getApiErrorMessage(download.error)}</p>
          ) : null}
          {showPagination ? (
            <nav className={styles.pagination} aria-label="Phân trang chứng từ">
              <ButtonBar
                type="button"
                disabled={page === 0 || query.isFetching}
                onClick={() => setPage(page - 1)}
              >
                Trang trước
              </ButtonBar>
              <span>Trang {page + 1}</span>
              <ButtonBar
                type="button"
                disabled={!data.hasNext || query.isFetching}
                onClick={() => setPage(page + 1)}
              >
                Trang sau
              </ButtonBar>
            </nav>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
