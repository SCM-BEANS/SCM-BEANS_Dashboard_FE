import { TableFilters } from "@/components/table/table-filters";
import { coffeePackageStatusLabel, type CoffeePackageWorkflowController } from "./coffee-package-workflow-controller";

export function CoffeeOrderFilters({ workflow }: { workflow: CoffeePackageWorkflowController }) {
  const { orderFilterDraft: draft, setOrderFilterDraft: setDraft } = workflow;
  return <TableFilters search={{ ariaLabel: "Tìm đơn cà phê", placeholder: "Tìm mã đơn hoặc tên gói cà phê", value: draft.search, maxLength: 160, onChange: (search) => setDraft((current) => ({ ...current, search })) }}
    selects={[
      { id: "coffee-order-package", ariaLabel: "Gói cà phê", value: draft.packageId, onChange: (packageId) => setDraft((current) => ({ ...current, packageId })), options: [{ value: "", label: "Tất cả gói cà phê" }, ...(workflow.packages.data?.items ?? []).map((item) => ({ value: item.id, label: item.name }))] },
      { id: "coffee-order-status", ariaLabel: "Trạng thái đơn cà phê", value: draft.status, onChange: (status) => setDraft((current) => ({ ...current, status })), options: [{ value: "", label: "Tất cả trạng thái" }, ...["PENDING_APPROVAL", "PENDING_PAYMENT", "PARTIALLY_PAID", "PAID", "WAITING_STOCK", "DELIVERED", "REJECTED", "CANCELLED", "CANCELLATION_REFUND_PENDING", "CANCELLED_REFUNDED"].map((value) => ({ value, label: coffeePackageStatusLabel(value) }))] },
    ]} submitLabel="Tìm kiếm" onSubmit={(event) => { event.preventDefault(); workflow.applyOrderFilters(); }} />;
}
