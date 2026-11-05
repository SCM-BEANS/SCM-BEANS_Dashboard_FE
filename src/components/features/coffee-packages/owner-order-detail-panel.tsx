import { useState, type FormEvent } from "react";
import { ButtonBar } from "@/components/button/button-bar";
import { getApiErrorMessage } from "@/lib/api-errors";
import type { CoffeePackageWorkflowController } from "./coffee-package-workflow-controller";
import { coffeePackageStatusLabel, formatCoffeePackageDateTime, formatCoffeePackageMoney } from "./coffee-package-workflow-controller";
import styles from "./coffee-package-workflow.module.css";
import { OwnerInvoicePanel } from "./owner-invoice-panel";

export function OwnerOrderDetailPanel({ workflow }: { workflow: CoffeePackageWorkflowController }) {
  const [cancelReason, setCancelReason] = useState("");
  const order = workflow.selectedOrder;

  const cancelOrder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!workflow.selectedOrderId || !cancelReason.trim()) return;
    workflow.run({ type: "CANCEL_ORDER", orderId: workflow.selectedOrderId, reason: cancelReason.trim() });
    setCancelReason("");
  };

  return (
    <section className={styles.panel} aria-labelledby="coffee-package-order-detail-title">
      <div className={styles.panelHeading}>
        <div><h2 id="coffee-package-order-detail-title">Chi tiết đơn hàng</h2><p className={styles.code}>{workflow.selectedOrderId}</p></div>
        <ButtonBar type="button" onClick={() => void workflow.orderDetail.refetch()}>Làm mới đơn</ButtonBar>
      </div>
      {workflow.orderDetail.isPending ? <p className={styles.notice} role="status">Đang tải thông tin đơn…</p> : null}
      {workflow.orderDetail.isError ? <p className={styles.errorNotice} role="alert">{getApiErrorMessage(workflow.orderDetail.error)}</p> : null}

      {order ? (
        <>
          <dl className={styles.details}>
            <div><dt>Trạng thái đơn</dt><dd><span className={styles.status}>{coffeePackageStatusLabel(order.status)}</span></dd></div>
            <div><dt>Gói cà phê</dt><dd>{order.packageName ?? order.packageCode ?? "—"}</dd></div>
            <div><dt>Mã gói</dt><dd>{order.packageCode ?? order.packageId ?? "—"}</dd></div>
            <div><dt>Hợp đồng</dt><dd className={styles.code}>{order.contractId ?? "—"}</dd></div>
            <div><dt>Máy</dt><dd className={styles.code}>{order.machineId ?? "—"}</dd></div>
            <div><dt>Số lượng</dt><dd>{order.quantity ?? "—"}</dd></div>
            <div><dt>Đơn giá</dt><dd>{formatCoffeePackageMoney(order.unitPrice, order.currency ?? "VND")}</dd></div>
            <div><dt>Thời hạn sử dụng</dt><dd>{order.usageDays != null ? `${order.usageDays} ngày` : "—"}</dd></div>
            <div><dt>Tổng đơn</dt><dd>{formatCoffeePackageMoney(order.total ?? order.amount ?? (order.unitPrice != null && order.quantity != null ? order.unitPrice * order.quantity : null), order.currency ?? "VND")}</dd></div>
            <div><dt>Ngày tạo</dt><dd>{formatCoffeePackageDateTime(order.createdAt)}</dd></div>
            <div><dt>Cập nhật lần cuối</dt><dd>{formatCoffeePackageDateTime(order.updatedAt)}</dd></div>
            {order.reviewNote ? <div><dt>Ghi chú xử lý</dt><dd>{order.reviewNote}</dd></div> : null}
          </dl>

          {order.payosQrUrl ? <p className={styles.notice}>Thông tin thanh toán: <a href={order.payosQrUrl} target="_blank" rel="noreferrer">Mở liên kết thanh toán</a>{order.payosQrRef ? ` · ${order.payosQrRef}` : ""}</p> : null}
          {workflow.invoice.isPending || workflow.invoice.isError || workflow.invoice.data ? <OwnerInvoicePanel workflow={workflow} /> : null}

          {order.status === "WAITING_STOCK" ? (
            <div className={styles.actionRow}>
              <p className={styles.hint}>Đơn đang chờ hàng. Bạn có thể xác nhận tiếp tục chờ hoặc gửi yêu cầu hủy.</p>
              <ButtonBar type="button" disabled={workflow.pending} onClick={() => workflow.run({ type: "ACKNOWLEDGE_WAITING", orderId: workflow.selectedOrderId })}>Đồng ý chờ hàng</ButtonBar>
            </div>
          ) : null}
          {order.status === "WAITING_STOCK" ? (
            <form className={styles.subpanel} onSubmit={cancelOrder}>
              <h3>Hủy đơn và yêu cầu hoàn tiền</h3>
              <p className={styles.hint}>Gửi yêu cầu hủy đơn để Dolores kiểm tra và xử lý khoản hoàn theo trạng thái thanh toán.</p>
              <label className={styles.field}><span>Lý do hủy</span><textarea maxLength={2000} value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} required /></label>
              <ButtonBar type="submit" disabled={!cancelReason.trim() || workflow.pending}>Hủy đơn và yêu cầu hoàn tiền</ButtonBar>
            </form>
          ) : null}
          {order.status !== "WAITING_STOCK" && !["CANCELLED", "CANCELLATION_REFUND_PENDING", "CANCELLED_REFUNDED", "REJECTED"].includes(order.status) ? (
            <div className={styles.subpanel}>
              <h3>Hủy đơn và yêu cầu hoàn tiền</h3>
              <p className={styles.hint}>
                {order.status === "DELIVERED"
                  ? "Đơn đã bàn giao. API hiện chỉ cho Owner gửi yêu cầu hủy khi đơn đang chờ hàng; chưa hỗ trợ hủy và hoàn tiền sau khi bàn giao."
                  : `Đơn đang ở trạng thái “${coffeePackageStatusLabel(order.status)}”. API hiện chỉ cho Owner gửi yêu cầu hủy khi đơn đang chờ hàng.`}
              </p>
              <ButtonBar type="button" disabled>Chưa thể hủy ở trạng thái này</ButtonBar>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
