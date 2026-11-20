import { Pagination } from "@/components/pagination/pagination";

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
  return <Pagination page={page} hasNext={hasNext} isFetching={isFetching} ariaLabel={ariaLabel} onPageChange={onPageChange} />;
}
