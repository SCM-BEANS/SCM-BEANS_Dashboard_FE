import type { ReactNode } from "react";
import { Panel } from "@/components/panel/panel";
import { Pagination } from "@/components/pagination/pagination";
import { CONTRACT_LIST_MESSAGES } from "@/text/contracts/contract-messages";
import styles from "./contract-list-panel.module.css";

export function ContractListPanel({ count, children }: { count?: number; children: ReactNode }) {
  return (
    <Panel aria-labelledby="contract-list-panel-title">
      <div className={styles.heading}>
        <h2 id="contract-list-panel-title">{CONTRACT_LIST_MESSAGES.PANEL_TITLE}</h2>
        {count !== undefined && <span>{count.toLocaleString("vi-VN")} hợp đồng</span>}
      </div>
      {children}
    </Panel>
  );
}

export function ContractListPagination({ page, pageSize, totalCount, onPageChange }: {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const start = page * pageSize + 1;
  const end = Math.min((page + 1) * pageSize, totalCount);
  return <>
    <span>{start}–{end} / {totalCount} hợp đồng</span>
    <Pagination page={page} hasNext={page + 1 < totalPages} ariaLabel={CONTRACT_LIST_MESSAGES.PAGINATION_LABEL} onPageChange={onPageChange} totalPages={totalPages} hideWhenSinglePage={false} />
  </>;
}
