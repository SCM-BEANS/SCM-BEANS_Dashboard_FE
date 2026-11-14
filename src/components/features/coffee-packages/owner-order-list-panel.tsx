import { ButtonBar } from "@/components/button/button-bar";
import { StatusBadge } from "@/components/status-badge/status-badge";
import type { CoffeePackageWorkflowController } from "./coffee-package-workflow-controller";
import { coffeePackageStatusLabel, formatCoffeePackageDateTime, formatCoffeePackageMoney } from "./coffee-package-workflow-controller";
import styles from "./coffee-package-workflow.module.css";
import { CoffeeOrderFilters } from "./coffee-order-filters";

export function OwnerOrderListPanel({ workflow, onOpenOrder }: { workflow: CoffeePackageWorkflowController; onOpenOrder: (orderId: string) => void }) {
  return (
    <section className={styles.panel} aria-labelledby="coffee-package-orders-title">
      <div className={styles.panelHeading}>
        <div>
          <h2 id="coffee-package-orders-title">Đơn gói cà phê của tôi</h2>
          <p>Chọn một đơn để xem hóa đơn, chứng từ và các bước tiếp theo.</p>
        </div>
        {workflow.orders.data ? <span>{workflow.orders.data.items.length} đơn trong trang</span> : null}
      </div>
      <CoffeeOrderFilters workflow={workflow} />
      {workflow.orders.isPending ? <p className={styles.notice} role="status">Đang tải đơn hàng…</p> : null}
      {workflow.orders.isError ? <p className={styles.errorNotice} role="alert">{String(workflow.orders.error instanceof Error ? workflow.orders.error.message : "Không tải được đơn hàng.")}</p> : null}
      {!workflow.orders.isPending && !workflow.orders.isError && workflow.orders.data?.items.length === 0 ? <p className={styles.notice}>Bạn chưa có đơn gói cà phê.</p> : null}

      {workflow.orders.data?.items.length ? (
        <div className={styles.tableWrap}>
          <table className={`${styles.table} ${styles.orderTable}`}>
            <thead><tr><th>Đơn hàng</th><th>Gói cà phê</th><th className={styles.numeric}>Thành tiền</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
            <tbody>{workflow.orders.data.items.map((order) => (
              <tr key={order.id}>
                <td>
                  <strong className={styles.orderCustomer}>Đơn {order.id.slice(0, 8).toUpperCase()}</strong>
                  <span className={styles.orderQuantity}>{formatCoffeePackageDateTime(order.createdAt)}</span>
                </td>
                <td>{order.packageName ?? order.packageCode ?? "—"}<span className={styles.orderQuantity}>Số lượng: {order.quantity?.toLocaleString("vi-VN") ?? "—"}</span></td>
                <td className={styles.numeric}>{formatCoffeePackageMoney(order.total ?? order.amount ?? (order.unitPrice != null && order.quantity != null ? order.unitPrice * order.quantity : null), order.currency ?? "VND")}</td>
                <td><StatusBadge variant="dot" status={order.status}>{coffeePackageStatusLabel(order.status)}</StatusBadge></td>
                <td><ButtonBar rollingLabel type="button" onClick={() => onOpenOrder(order.id)}>Xem đơn</ButtonBar></td>
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
