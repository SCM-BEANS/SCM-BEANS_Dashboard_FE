import { ButtonBar } from "@/components/button/button-bar";
import { StatusBadge } from "@/components/status-badge/status-badge";
import { TruncatedId } from "@/components/truncated-id/truncated-id";
import { getApiErrorMessage } from "@/lib/api-errors";
import type { CoffeePackageWorkflowController } from "./coffee-package-workflow-controller";
import { coffeePackageStatusLabel, formatCoffeePackageDateTime, formatCoffeePackageMoney } from "./coffee-package-workflow-controller";
import { useOwnerNames } from "@/hooks/use-owner-names";
import styles from "./coffee-package-workflow.module.css";

export function OperatorRefundListPanel({ workflow }: { workflow: CoffeePackageWorkflowController }) {
  const ownerNames = useOwnerNames(workflow.refunds.data?.items.map((item) => (
    item.ownerName?.trim() ? null : item.ownerId
  )) ?? []);

  return (
    <section className={styles.panel} aria-labelledby="coffee-operator-refunds-title">
      <div className={styles.panelHeading}>
        <div>
          <h2 id="coffee-operator-refunds-title">Hoàn tiền</h2>
          <p>Theo dõi phê duyệt, chứng từ chuyển khoản và trạng thái hoàn tiền.</p>
        </div>
        {workflow.refunds.data ? <span>{workflow.refunds.data.items.length} khoản trong danh sách</span> : null}
      </div>
      {workflow.refunds.isPending ? <p className={styles.notice} role="status">Đang tải khoản hoàn tiền…</p> : null}
      {workflow.refunds.isError ? <p className={styles.errorNotice} role="alert">{getApiErrorMessage(workflow.refunds.error)}</p> : null}
      {!workflow.refunds.isPending && !workflow.refunds.isError && workflow.refunds.data?.items.length === 0 ? <p className={styles.notice}>Chưa có khoản hoàn tiền trong phạm vi này.</p> : null}
      {workflow.refunds.data?.items.length ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Khoản hoàn / khách hàng</th><th className={styles.numeric}>Số tiền</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
            <tbody>{workflow.refunds.data.items.map((item) => (
              <tr key={item.id} className={workflow.selectedRefundId === item.id ? styles.selectedRow : undefined}>
                <td>
                  <strong className={styles.orderCustomer}>{item.ownerName?.trim() || (item.ownerId ? ownerNames.data?.[item.ownerId] : undefined) || "Chưa có tên khách hàng"}</strong>
                  <div className={styles.orderMeta}>
                    <span>Khoản hoàn <TruncatedId value={item.id} /></span>
                    <span>{formatCoffeePackageDateTime(item.createdAt)}</span>
                  </div>
                </td>
                <td className={styles.numeric}>{formatCoffeePackageMoney(item.amount, item.currency ?? "VND")}</td>
                <td><StatusBadge variant="dot" status={item.status}>{coffeePackageStatusLabel(item.status)}</StatusBadge></td>
                <td><ButtonBar rollingLabel type="button" onClick={() => workflow.setSelectedRefundId(item.id)}>Mở khoản hoàn</ButtonBar></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
