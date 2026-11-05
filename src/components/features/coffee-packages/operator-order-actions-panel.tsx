import { useState, type FormEvent } from "react";
import { ButtonBar } from "@/components/button/button-bar";
import type { CoffeePackageOrder } from "@/schema/coffee-packages.schema";
import type { CoffeePackageWorkflowController } from "./coffee-package-workflow-controller";
import styles from "./coffee-package-workflow.module.css";

export function OperatorOrderActionsPanel({
  workflow,
  order,
}: {
  workflow: CoffeePackageWorkflowController;
  order: CoffeePackageOrder;
}) {
  const [orderNote, setOrderNote] = useState("");
  const [orderReason, setOrderReason] = useState("");
  const [expectedStockAt, setExpectedStockAt] = useState("");
  const [handoverMethod, setHandoverMethod] = useState<"SELF_PICKUP" | "COMPANY_DELIVERY_EXTERNAL">("SELF_PICKUP");
  const [recipient, setRecipient] = useState("");
  const [handoverQuantity, setHandoverQuantity] = useState(String(order.quantity ?? 1));

  const approveOrder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!orderNote.trim()) return;
    workflow.run({ type: "APPROVE_ORDER", orderId: order.id, note: orderNote.trim() });
    setOrderNote("");
  };
  const rejectOrder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!orderReason.trim()) return;
    workflow.run({ type: "REJECT_ORDER", orderId: order.id, reason: orderReason.trim() });
    setOrderReason("");
  };
  const markWaitingStock = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!orderReason.trim() || !expectedStockAt) return;
    workflow.run({
      type: "WAITING_STOCK",
      orderId: order.id,
      reason: orderReason.trim(),
      expectedStockAt: new Date(expectedStockAt).toISOString(),
    });
    setOrderReason("");
    setExpectedStockAt("");
  };
  const recordHandover = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!recipient.trim()) return;
    workflow.run({
      type: "HANDOVER",
      orderId: order.id,
      method: handoverMethod,
      recipient: recipient.trim(),
      quantity: Number(handoverQuantity),
    });
    setRecipient("");
  };

  return (
    <div className={styles.actionGrid}>
      {order.status === "PENDING_APPROVAL" ? (
        <>
          <form className={styles.subpanel} onSubmit={approveOrder}>
            <h3>Duyệt đơn</h3>
            <p>Xác nhận đã kiểm tra nguồn cung trước khi duyệt.</p>
            <label className={styles.field}><span>Ghi chú</span><textarea maxLength={2000} value={orderNote} onChange={(event) => setOrderNote(event.target.value)} required /></label>
            <ButtonBar type="submit" disabled={!orderNote.trim() || workflow.pending}>Duyệt đơn</ButtonBar>
          </form>
          <form className={styles.subpanel} onSubmit={rejectOrder}>
            <h3>Từ chối đơn</h3>
            <label className={styles.field}><span>Lý do</span><textarea maxLength={2000} value={orderReason} onChange={(event) => setOrderReason(event.target.value)} required /></label>
            <ButtonBar type="submit" disabled={!orderReason.trim() || workflow.pending}>Từ chối đơn</ButtonBar>
          </form>
        </>
      ) : null}

      {order.status === "PAID" ? (
        <form className={styles.subpanel} onSubmit={markWaitingStock}>
          <h3>Báo đang chờ hàng</h3>
          <p>Cho Owner biết lý do và thời điểm dự kiến có hàng để họ quyết định có tiếp tục chờ.</p>
          <div className={styles.formGrid}>
            <label className={styles.field}><span>Lý do</span><textarea maxLength={2000} value={orderReason} onChange={(event) => setOrderReason(event.target.value)} required /></label>
            <label className={styles.field}><span>Dự kiến có hàng</span><input type="datetime-local" value={expectedStockAt} onChange={(event) => setExpectedStockAt(event.target.value)} required /></label>
          </div>
          <ButtonBar type="submit" disabled={!orderReason.trim() || !expectedStockAt || workflow.pending}>Cập nhật chờ hàng</ButtonBar>
        </form>
      ) : null}

      {["PAID", "WAITING_STOCK"].includes(order.status) ? (
        <form className={styles.subpanel} onSubmit={recordHandover}>
          <h3>Ghi nhận bàn giao</h3>
          <p>{order.status === "WAITING_STOCK" ? "Owner cần xác nhận tiếp tục chờ hàng trước khi ghi nhận bàn giao." : "Đơn đã thanh toán và có thể ghi nhận bàn giao."} Dolores sẽ kiểm tra điều kiện trước khi đổi trạng thái.</p>
          <div className={styles.formGrid}>
            <label className={styles.field}><span>Hình thức nhận</span><select value={handoverMethod} onChange={(event) => setHandoverMethod(event.target.value as typeof handoverMethod)}><option value="SELF_PICKUP">Owner tự nhận</option><option value="COMPANY_DELIVERY_EXTERNAL">Giao đến Owner</option></select></label>
            <label className={styles.field}><span>Người nhận</span><input value={recipient} onChange={(event) => setRecipient(event.target.value)} required /></label>
            <label className={styles.field}><span>Số lượng bàn giao</span><input type="number" min="1" step="1" value={handoverQuantity} onChange={(event) => setHandoverQuantity(event.target.value)} required /></label>
          </div>
          <label className={styles.checkboxField}><input type="checkbox" checked readOnly /> Đã kiểm tra hạn sử dụng</label>
          <ButtonBar type="submit" disabled={!recipient.trim() || Number(handoverQuantity) < 1 || workflow.pending}>Xác nhận bàn giao</ButtonBar>
        </form>
      ) : null}
    </div>
  );
}
