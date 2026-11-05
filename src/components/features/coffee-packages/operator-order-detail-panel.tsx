import { ButtonBar } from "@/components/button/button-bar";
import { getApiErrorMessage } from "@/lib/api-errors";
import type { CoffeePackageWorkflowController } from "./coffee-package-workflow-controller";
import { coffeePackageStatusLabel, formatCoffeePackageDateTime, formatCoffeePackageMoney } from "./coffee-package-workflow-controller";
import styles from "./coffee-package-workflow.module.css";
import { OperatorOrderActionsPanel } from "./operator-order-actions-panel";
import { OperatorPaymentReviewPanel } from "./operator-payment-review-panel";

export function OperatorOrderDetailPanel({ workflow }: { workflow: CoffeePackageWorkflowController }) {
  const order = workflow.selectedOrder;
  return (
    <section className={styles.panel} aria-labelledby="coffee-operator-order-detail-title">
      <div className={styles.panelHeading}>
        <div>
          <h2 id="coffee-operator-order-detail-title">Chi tiết đơn</h2>
          <p className={styles.code}>{workflow.selectedOrderId}</p>
        </div>
        <ButtonBar type="button" onClick={() => void workflow.orderDetail.refetch()}>Làm mới đơn</ButtonBar>
      </div>
      {workflow.orderDetail.isPending ? <p className={styles.notice} role="status">Đang tải chi tiết đơn…</p> : null}
      {workflow.orderDetail.isError ? <p className={styles.errorNotice} role="alert">{getApiErrorMessage(workflow.orderDetail.error)}</p> : null}
      {order ? (
        <>
          <dl className={styles.details}>
            <div><dt>Trạng thái</dt><dd><span className={styles.status}>{coffeePackageStatusLabel(order.status)}</span></dd></div>
            <div><dt>Owner</dt><dd className={styles.code}>{order.ownerId ?? "—"}</dd></div>
            <div><dt>Hợp đồng</dt><dd className={styles.code}>{order.contractId ?? "—"}</dd></div>
            <div><dt>Gói cà phê</dt><dd>{order.packageName ?? order.packageCode ?? "—"}</dd></div>
            <div><dt>Số lượng</dt><dd>{order.quantity ?? "—"}</dd></div>
            <div><dt>Thành tiền</dt><dd>{formatCoffeePackageMoney(order.total ?? order.amount ?? (order.unitPrice != null && order.quantity != null ? order.unitPrice * order.quantity : null), order.currency ?? "VND")}</dd></div>
            <div><dt>Ngày tạo</dt><dd>{formatCoffeePackageDateTime(order.createdAt)}</dd></div>
          </dl>
          <OperatorOrderActionsPanel workflow={workflow} order={order} />
          <OperatorPaymentReviewPanel workflow={workflow} />
        </>
      ) : null}
    </section>
  );
}
