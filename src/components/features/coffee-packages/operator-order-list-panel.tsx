
import { Panel } from "@/components/panel/panel";
import { TextLinkButton } from "@/components/button/text-link-button";
import { DataTable } from "@/components/table/data-table";
import { StatusBadge } from "@/components/status-badge/status-badge";
import { Pagination } from "@/components/pagination/pagination";
import { CUSTOMER_MESSAGES } from "@/text/customer/customer-messages";
import { TruncatedId } from "@/components/truncated-id/truncated-id";
import { getApiErrorMessage } from "@/lib/api-errors";
import { PATH_ADMIN } from "@/routes/path";
import type { CoffeePackageWorkflowController } from "./coffee-package-workflow-controller";
import { coffeePackageStatusLabel, formatCoffeePackageDateTime, formatCoffeePackageMoney } from "./coffee-package-workflow-controller";
import { useOwnerNames } from "@/hooks/use-owner-names";
import styles from "./coffee-package-workflow.module.css";
import { CoffeeOrderFilters } from "./coffee-order-filters";

export function OperatorOrderListPanel({
  workflow,
  isAdmin,
  onOpenOrder,
}: {
  workflow: CoffeePackageWorkflowController;
  isAdmin: boolean;
  onOpenOrder: (id: string) => void;
}) {
  const ownerNames = useOwnerNames(workflow.orders.data?.items.map((order) => (
    order.ownerName?.trim() ? null : order.ownerId
  )) ?? []);

  return (
    <Panel className={styles.panel} aria-labelledby="coffee-operator-orders-title">
      <div className={styles.panelHeading}>
        <div><h2 id="coffee-operator-orders-title">Đơn gói cà phê</h2></div>
      </div>
      <CoffeeOrderFilters workflow={workflow} />
      {workflow.orders.isPending ? <p className={styles.notice} role="status">Đang tải đơn hàng…</p> : null}
      {workflow.orders.isError ? <p className={styles.errorNotice} role="alert">{getApiErrorMessage(workflow.orders.error)}</p> : null}
      {!workflow.orders.isPending && !workflow.orders.isError && workflow.orders.data?.items.length === 0 ? <p className={styles.notice}>Chưa có đơn gói cà phê trong phạm vi này.</p> : null}
      {workflow.orders.data?.items.length ? (
        <DataTable rows={workflow.orders.data.items} rowKey={(order) => order.id} columns={[
          {
            key: "order",
            header: isAdmin ? "Khách hàng" : "Đơn hàng / khách hàng",
            render: (order) => {
              const customerName = order.ownerName?.trim()
                || (order.ownerId ? ownerNames.data?.[order.ownerId] : undefined)
                || "Chưa có tên khách hàng";

              return (
                <>
                  {isAdmin ? (
                    <TextLinkButton href={PATH_ADMIN.COFFEE_PACKAGE_ORDER_DETAIL(order.id)}>{customerName}</TextLinkButton>
                  ) : (
                    <TextLinkButton onClick={() => onOpenOrder(order.id)}>{customerName}</TextLinkButton>
                  )}
                  <div className={styles.orderMeta}>
                    {!isAdmin ? <span>Đơn <TruncatedId value={order.id} /></span> : null}
                    <span>{formatCoffeePackageDateTime(order.createdAt)}</span>
                  </div>
                </>
              );
            },
          },
          { key: "package", header: "Gói cà phê", render: (order) => <>
            {order.packageName ?? order.packageCode ?? "—"}
            <span className={styles.orderQuantity}>Số lượng: {order.quantity?.toLocaleString("vi-VN") ?? "—"}</span>
          </> },
          { key: "amount", header: "Thành tiền", align: "right", render: (order) => formatCoffeePackageMoney(order.total ?? order.amount ?? (order.unitPrice != null && order.quantity != null ? order.unitPrice * order.quantity : null), order.currency ?? "VND") },
          { key: "status", header: "Trạng thái", render: (order) => <StatusBadge variant="dot" status={order.status}>{coffeePackageStatusLabel(order.status)}</StatusBadge> },
        ]} />
      ) : null}
      {workflow.orders.data ? (
        <Pagination page={workflow.orders.data.page} hasNext={workflow.orders.data.hasNext} isFetching={workflow.orders.isFetching} ariaLabel={CUSTOMER_MESSAGES.READ_SCREENS.COFFEE_ORDERS_PAGINATION} onPageChange={workflow.setPage} previousLabel={CUSTOMER_MESSAGES.READ_SCREENS.COFFEE_ORDERS_PREVIOUS} nextLabel={CUSTOMER_MESSAGES.READ_SCREENS.COFFEE_ORDERS_NEXT} hideWhenSinglePage={false} />
      ) : null}
    </Panel>
  );
}
