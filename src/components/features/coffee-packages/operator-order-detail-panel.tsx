import { ButtonBar } from "@/components/button/button-bar";
import { StatusBadge } from "@/components/status-badge/status-badge";
import { getApiErrorMessage } from "@/lib/api-errors";
import type { CoffeePackageWorkflowController } from "./coffee-package-workflow-controller";
import { coffeePackageStatusLabel, formatCoffeePackageDateTime, formatCoffeePackageMoney } from "./coffee-package-workflow-controller";
import styles from "./coffee-package-workflow.module.css";
import { OperatorOrderActionsPanel } from "./operator-order-actions-panel";
import { OperatorPaymentReviewPanel } from "./operator-payment-review-panel";

export function OperatorOrderDetailPanel({ workflow }: { workflow: CoffeePackageWorkflowController }) {
  const order = workflow.selectedOrder;
  return (
    <section className={`${styles.panel} ${styles.ownerOrderDetail}`} aria-labelledby="coffee-operator-order-detail-title">
      <div className={styles.panelHeading}>
        <div>
          <h2 id="coffee-operator-order-detail-title">Chi tiết đơn</h2>
          <p>Đơn {workflow.selectedOrderId.slice(0, 8).toUpperCase()}</p>
        </div>
        <ButtonBar type="button" onClick={() => void workflow.orderDetail.refetch()}>Làm mới đơn</ButtonBar>
      </div>
      {workflow.orderDetail.isPending ? <p className={styles.notice} role="status">Đang tải chi tiết đơn…</p> : null}
      {workflow.orderDetail.isError ? <p className={styles.errorNotice} role="alert">{getApiErrorMessage(workflow.orderDetail.error)}</p> : null}
      {order ? (
          <div className={styles.ownerOrderColumns}>
          <OperatorPaymentReviewPanel workflow={workflow} />
          <div className={styles.ownerOrderInformation}>
          <dl className={`${styles.details} ${styles.orderSummary}`}>
            {order.ownerReceivedAt ? <div><dt>Xác nhận nhận hàng</dt><dd>{formatCoffeePackageDateTime(order.ownerReceivedAt)}</dd></div> : null}
            <div><dt>Trạng thái</dt><dd><StatusBadge variant="dot" status={order.status}>{coffeePackageStatusLabel(order.status)}</StatusBadge></dd></div>
            <div><dt>Khách hàng</dt><dd>{order.ownerName || "Chưa có tên khách hàng"}</dd></div>
            <div><dt>Gói cà phê</dt><dd>{order.packageName ?? order.packageCode ?? "—"}</dd></div>
            <div><dt>Số lượng</dt><dd>{order.quantity ?? "—"}</dd></div>
            <div><dt>Thành tiền</dt><dd>{formatCoffeePackageMoney(order.total ?? order.amount ?? (order.unitPrice != null && order.quantity != null ? order.unitPrice * order.quantity : null), order.currency ?? "VND")}</dd></div>
            <div><dt>Ngày tạo</dt><dd>{formatCoffeePackageDateTime(order.createdAt)}</dd></div>
          </dl>
          <details className={styles.linkedIds}>
            <summary>Mã liên kết</summary>
            <dl className={styles.details}>
              <div><dt>Mã đơn hàng</dt><dd className={styles.code}>{order.id}</dd></div>
              <div><dt>Mã khách hàng</dt><dd className={styles.code}>{order.ownerId ?? "—"}</dd></div>
              <div><dt>Mã hợp đồng</dt><dd className={styles.code}>{order.contractId ?? "—"}</dd></div>
            </dl>
          </details>
          <OperatorOrderActionsPanel workflow={workflow} order={order} />
          </div>
        </div>
      ) : null}
    </section>
  );
}
