import { ButtonBar } from "@/components/button/button-bar";
import { Children, type ReactNode } from "react";
import { REPAIR_WORKFLOW_MESSAGES as M } from "@/text/repair-workflow/repair-workflow-messages";
import styles from "./pagination.module.css";

export function Pagination({
  page,
  hasNext,
  isFetching = false,
  ariaLabel,
  onPageChange,
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

  const items = Children.toArray(children);
  const extra = showPage ? children : items.length > 1 ? items.slice(0, -1) : null;

  return (
    <>
    {extra ? <div>{extra}</div> : null}
    <nav className={[styles.pagination, className].filter(Boolean).join(" ")} aria-label={ariaLabel}>
      <ButtonBar type="button" disabled={page === 0 || isFetching} onClick={() => onPageChange(Math.max(0, page - 1))}>
        {M.PREVIOUS_PAGE}
      </ButtonBar>
      <span>{showPage || !children ? <>{M.PAGE} {page + 1}{totalPages ? ` / ${totalPages}` : ""}</> : items[items.length - 1]}</span>
      <ButtonBar type="button" disabled={!hasNext || isFetching} onClick={() => onPageChange(page + 1)}>
        {M.NEXT_PAGE}
      </ButtonBar>
    </nav>
    </>
  );
}
