import { ButtonBar } from "@/components/button/button-bar";
import { StatusBadge } from "@/components/status-badge/status-badge";
import { TruncatedId } from "@/components/truncated-id/truncated-id";
import { getApiErrorMessage } from "@/lib/api-errors";
import type { CoffeePackageWorkflowController } from "./coffee-package-workflow-controller";
import { coffeePackageStatusLabel, formatCoffeePackageDateTime, formatCoffeePackageMoney } from "./coffee-package-workflow-controller";
import { useOwnerNames } from "@/hooks/use-owner-names";
import styles from "./coffee-package-workflow.module.css";
import { CoffeeOrderFilters } from "./coffee-order-filters";

export function OperatorOrderListPanel({
  workflow,
  onOpenOrder,
}: {
  workflow: CoffeePackageWorkflowController;
  onOpenOrder: (id: string) => void;
}) {
  const ownerNames = useOwnerNames(workflow.orders.data?.items.map((order) => (
    order.ownerName?.trim() ? null : order.ownerId
  )) ?? []);

  return (
    <section className={styles.panel} aria-labelledby="coffee-operator-orders-title">
      <div className={styles.panelHeading}>
        <div><h2 id="coffee-operator-orders-title">Đơn gói cà phê</h2><p>Theo dõi thanh toán, tình trạng hàng và bàn giao cho khách hàng.</p></div>
        {workflow.orders.data ? <span>{workflow.orders.data.items.length} đơn trong trang</span> : null}
      </div>
      <CoffeeOrderFilters workflow={workflow} />
      {workflow.orders.isPending ? <p className={styles.notice} role="status">Đang tải đơn hàng…</p> : null}
      {workflow.orders.isError ? <p className={styles.errorNotice} role="alert">{getApiErrorMessage(workflow.orders.error)}</p> : null}
      {!workflow.orders.isPending && !workflow.orders.isError && workflow.orders.data?.items.length === 0 ? <p className={styles.notice}>Chưa có đơn gói cà phê trong phạm vi này.</p> : null}
      {workflow.orders.data?.items.length ? (
        <div className={styles.tableWrap}>
          <table className={`${styles.table} ${styles.orderTable}`}>
            <thead><tr><th>Đơn hàng / khách hàng</th><th>Gói cà phê</th><th className={styles.numeric}>Thành tiền</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
            <tbody>{workflow.orders.data.items.map((order) => (
              <tr key={order.id} className={workflow.selectedOrderId === order.id ? styles.selectedRow : undefined}>
                <td>
                  <strong className={styles.orderCustomer}>{order.ownerName?.trim() || (order.ownerId ? ownerNames.data?.[order.ownerId] : undefined) || "Chưa có tên khách hàng"}</strong>
                  <div className={styles.orderMeta}>
                    <span>Đơn <TruncatedId value={order.id} /></span>
                    <span>{formatCoffeePackageDateTime(order.createdAt)}</span>
                  </div>
                </td>
                <td>
                  {order.packageName ?? order.packageCode ?? "—"}
                  <span className={styles.orderQuantity}>Số lượng: {order.quantity?.toLocaleString("vi-VN") ?? "—"}</span>
                </td>
                <td className={styles.numeric}>{formatCoffeePackageMoney(order.total ?? order.amount ?? (order.unitPrice != null && order.quantity != null ? order.unitPrice * order.quantity : null), order.currency ?? "VND")}</td>
                <td><StatusBadge variant="dot" status={order.status}>{coffeePackageStatusLabel(order.status)}</StatusBadge></td>
                <td><ButtonBar rollingLabel type="button" onClick={() => onOpenOrder(order.id)}>Mở đơn</ButtonBar></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
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
