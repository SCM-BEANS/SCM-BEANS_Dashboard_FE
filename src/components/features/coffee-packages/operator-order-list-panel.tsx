import { ButtonBar } from "@/components/button/button-bar";
import { TextLinkButton } from "@/components/button/text-link-button";
import { DataTable } from "@/components/table/data-table";
import { StatusBadge } from "@/components/status-badge/status-badge";
import { TruncatedId } from "@/components/truncated-id/truncated-id";
import { getApiErrorMessage } from "@/lib/api-errors";
import { PATH_ADMIN } from "@/routes/path";
import type { CoffeePackageOrder } from "@/schema/coffee-packages.schema";
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
    <section className={styles.panel} aria-labelledby="coffee-operator-orders-title">
      <div className={styles.panelHeading}>
        <div><h2 id="coffee-operator-orders-title">Đơn gói cà phê</h2></div>
      </div>
      <CoffeeOrderFilters workflow={workflow} />
      {workflow.orders.isPending ? <p className={styles.notice} role="status">Đang tải đơn hàng…</p> : null}
      {workflow.orders.isError ? <p className={styles.errorNotice} role="alert">{getApiErrorMessage(workflow.orders.error)}</p> : null}
      {!workflow.orders.isPending && !workflow.orders.isError && workflow.orders.data?.items.length === 0 ? <p className={styles.notice}>Chưa có đơn gói cà phê trong phạm vi này.</p> : null}
      {workflow.orders.data?.items.length ? (
        <DataTable equalColumns={isAdmin} rows={workflow.orders.data.items} rowKey={(order) => order.id} columns={[
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
                    <strong className={styles.orderCustomer}>{customerName}</strong>
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
          { key: "amount", header: "Thành tiền", align: isAdmin ? "left" : "right", render: (order) => formatCoffeePackageMoney(order.total ?? order.amount ?? (order.unitPrice != null && order.quantity != null ? order.unitPrice * order.quantity : null), order.currency ?? "VND") },
          { key: "status", header: "Trạng thái", render: (order) => <StatusBadge variant="dot" status={order.status}>{coffeePackageStatusLabel(order.status)}</StatusBadge> },
          ...(isAdmin ? [] : [{
            key: "actions",
            header: "Thao tác",
            render: (order: CoffeePackageOrder) => (
              <ButtonBar rollingLabel type="button" onClick={() => onOpenOrder(order.id)}>Mở đơn</ButtonBar>
            ),
          }]),
        ]} />
      ) : null}
      {workflow.orders.data ? (
        <div className={styles.pagination}>
          <ButtonBar type="button" disabled={workflow.page === 0} onClick={() => workflow.setPage((current) => Math.max(0, current - 1))}>Trang trước</ButtonBar>
          <span>Trang {workflow.orders.data.page + 1}</span>
          <ButtonBar type="button" disabled={!workflow.orders.data.hasNext} onClick={() => workflow.setPage((current) => current + 1)}>Trang sau</ButtonBar>
        </div>
      ) : null}
    </section>
  );
}
