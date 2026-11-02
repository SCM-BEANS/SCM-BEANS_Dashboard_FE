import { REPAIR_WORKFLOW_MESSAGES as M } from "@/text/repair-workflow/repair-workflow-messages";
import styles from "./repair-workflow.module.css";

export function RepairWorkflowPagination({
  page,
  hasNext,
  isFetching,
  ariaLabel,
  onPageChange,
}: {
  page: number;
  hasNext: boolean;
  isFetching: boolean;
  ariaLabel: string;
  onPageChange: (page: number) => void;
}) {
  if (page === 0 && !hasNext) return null;

  return (
    <nav className={styles.pagination} aria-label={ariaLabel}>
      <button
        type="button"
        className={styles.inlineButton}
        disabled={page === 0 || isFetching}
        onClick={() => onPageChange(Math.max(0, page - 1))}
      >
        {M.PREVIOUS}
      </button>
      <span>{M.PAGE} {page + 1}</span>
      <button
        type="button"
        className={styles.inlineButton}
        disabled={!hasNext || isFetching}
        onClick={() => onPageChange(page + 1)}
      >
        {M.NEXT}
      </button>
    </nav>
  );
}
