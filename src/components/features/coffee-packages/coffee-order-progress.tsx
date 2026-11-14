import { StatusBadge } from "@/components/status-badge/status-badge";
import type { CoffeePackageOrder } from "@/schema/coffee-packages.schema";
import { coffeePackageStatusLabel } from "./coffee-package-workflow-controller";
import styles from "../repair-workflow/repair-workflow.module.css";

export function CoffeeOrderProgress({ order }: { order: CoffeePackageOrder }) {
  const stage = ({ PENDING_APPROVAL: 1, PENDING_PAYMENT: 2, PARTIALLY_PAID: 2, PAID: 3, WAITING_STOCK: 3, DELIVERED: 4 } as Record<string, number>)[order.status] ?? -1;
  return <section className={`${styles.workOrderSummary} ${styles.workOrderProgressPanel}`} aria-label="Tiến độ giao đơn cà phê">
    <div className={styles.workOrderSummaryHeading}>
      <h2>Tiến độ giao đơn</h2>
      <StatusBadge variant="dot" status={order.status}>{coffeePackageStatusLabel(order.status)}</StatusBadge>
    </div>
    <ol className={styles.workOrderProgress} aria-label="Các bước xử lý đơn">
      {["Tạo đơn", "Duyệt đơn", "Thanh toán", "Bàn giao"].map((label, index) => <li key={label}
        className={`${styles.workOrderProgressStep} ${index < stage ? styles.workOrderProgressComplete : index === stage ? styles.workOrderProgressCurrent : ""}`}
        aria-current={index === stage ? "step" : undefined}>
        <span aria-hidden="true">{index < stage ? "✓" : index + 1}</span><small>{label}</small>
      </li>)}
    </ol>
  </section>;
}
