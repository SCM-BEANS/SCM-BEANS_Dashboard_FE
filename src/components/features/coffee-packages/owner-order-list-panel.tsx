import { ButtonBar } from "@/components/button/button-bar";
import type { CoffeePackageWorkflowController } from "./coffee-package-workflow-controller";
import { coffeePackageStatusLabel, formatCoffeePackageDateTime, formatCoffeePackageMoney } from "./coffee-package-workflow-controller";
import styles from "./coffee-package-workflow.module.css";

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
      {workflow.orders.isPending ? <p className={styles.notice} role="status">Đang tải đơn hàng…</p> : null}
      {workflow.orders.isError ? <p className={styles.errorNotice} role="alert">{String(workflow.orders.error instanceof Error ? workflow.orders.error.message : "Không tải được đơn hàng.")}</p> : null}
      {!workflow.orders.isPending && !workflow.orders.isError && workflow.orders.data?.items.length === 0 ? <p className={styles.notice}>Bạn chưa có đơn gói cà phê.</p> : null}

      {workflow.orders.data?.items.length ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Đơn hàng</th><th>Gói cà phê</th><th>Hợp đồng</th><th className={styles.numeric}>Số lượng</th><th className={styles.numeric}>Thành tiền</th><th>Trạng thái</th><th>Ngày tạo</th><th /></tr></thead>
            <tbody>{workflow.orders.data.items.map((order) => (
              <tr key={order.id}>
                <td className={styles.code}>{order.id.slice(0, 8).toUpperCase()}</td>
                <td>{order.packageName ?? order.packageCode ?? "—"}</td>
                <td className={styles.code}>{order.contractId?.slice(0, 8).toUpperCase() ?? "—"}</td>
                <td className={styles.numeric}>{order.quantity ?? "—"}</td>
                <td className={styles.numeric}>{formatCoffeePackageMoney(order.total ?? order.amount ?? (order.unitPrice != null && order.quantity != null ? order.unitPrice * order.quantity : null), order.currency ?? "VND")}</td>
                <td><span className={styles.status}>{coffeePackageStatusLabel(order.status)}</span></td>
                <td>{formatCoffeePackageDateTime(order.createdAt)}</td>
                <td><ButtonBar type="button" onClick={() => onOpenOrder(order.id)}>Xem đơn</ButtonBar></td>
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
