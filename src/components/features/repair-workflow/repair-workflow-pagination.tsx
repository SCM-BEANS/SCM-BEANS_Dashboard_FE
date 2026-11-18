import { REPAIR_WORKFLOW_MESSAGES as M } from "@/text/repair-workflow/repair-workflow-messages";
import { ButtonBar } from "@/components/button/button-bar";
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
      <ButtonBar
        type="button"
        disabled={page === 0 || isFetching}
        onClick={() => onPageChange(Math.max(0, page - 1))}
      >
        {M.PREVIOUS}
      </ButtonBar>
      <span className="ta:inline-flex ta:min-h-11 ta:items-center ta:rounded-lg ta:bg-brand-50 ta:px-4 ta:text-sm ta:font-medium ta:text-brand-700">{M.PAGE} {page + 1}</span>
      <ButtonBar
        type="button"
        disabled={!hasNext || isFetching}
        onClick={() => onPageChange(page + 1)}
      >
        {M.NEXT}
      </ButtonBar>
    </nav>
  );
}
