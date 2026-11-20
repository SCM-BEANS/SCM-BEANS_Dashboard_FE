import { ButtonBar } from "@/components/button/button-bar";
import type { ReactNode } from "react";
import { REPAIR_WORKFLOW_MESSAGES as M } from "@/text/repair-workflow/repair-workflow-messages";
import styles from "./pagination.module.css";

export function Pagination({
  page,
  hasNext,
  isFetching = false,
  ariaLabel,
  onPageChange,
  previousLabel = M.PREVIOUS,
  nextLabel = M.NEXT,
  showPage = true,
  totalPages,
  hideWhenSinglePage = true,
  children,
  className,
}: {
  page: number;
  hasNext: boolean;
  isFetching?: boolean;
  ariaLabel: string;
  onPageChange: (page: number) => void;
  previousLabel?: string;
  nextLabel?: string;
  showPage?: boolean;
  totalPages?: number;
  hideWhenSinglePage?: boolean;
  children?: ReactNode;
  className?: string;
}) {
  if (hideWhenSinglePage && page === 0 && !hasNext) return null;

  return (
    <nav className={[styles.pagination, className].filter(Boolean).join(" ")} aria-label={ariaLabel}>
      {children}
      <ButtonBar type="button" disabled={page === 0 || isFetching} onClick={() => onPageChange(Math.max(0, page - 1))}>
        {previousLabel}
      </ButtonBar>
      {showPage ? <span>{M.PAGE} {page + 1}{totalPages ? ` / ${totalPages}` : ""}</span> : null}
      <ButtonBar type="button" disabled={!hasNext || isFetching} onClick={() => onPageChange(page + 1)}>
        {nextLabel}
      </ButtonBar>
    </nav>
  );
}
