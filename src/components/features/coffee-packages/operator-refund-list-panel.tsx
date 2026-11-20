import { TextActionButton } from "@/components/button/text-link-button";
import { Panel } from "@/components/panel/panel";
import { DataTable } from "@/components/table/data-table";
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
    <Panel className={styles.panel} aria-labelledby="coffee-operator-refunds-title">
      <div className={styles.panelHeading}>
        <div>
          <h2 id="coffee-operator-refunds-title">Hoàn tiền</h2>
        </div>
        {workflow.refunds.data ? <span>{workflow.refunds.data.items.length} khoản trong danh sách</span> : null}
      </div>
      {workflow.refunds.isPending ? <p className={styles.notice} role="status">Đang tải khoản hoàn tiền…</p> : null}
      {workflow.refunds.isError ? <p className={styles.errorNotice} role="alert">{getApiErrorMessage(workflow.refunds.error)}</p> : null}
      {!workflow.refunds.isPending && !workflow.refunds.isError && workflow.refunds.data?.items.length === 0 ? <p className={styles.notice}>Chưa có khoản hoàn tiền trong phạm vi này.</p> : null}
      {workflow.refunds.data?.items.length ? (
        <DataTable rows={workflow.refunds.data.items} rowKey={(item) => item.id} columns={[
          { key: "refund", header: "Khoản hoàn / khách hàng", render: (item) => <>
            <strong className={styles.orderCustomer}>{item.ownerName?.trim() || (item.ownerId ? ownerNames.data?.[item.ownerId] : undefined) || "Chưa có tên khách hàng"}</strong>
            <div className={styles.orderMeta}>
              <TextActionButton onClick={() => workflow.setSelectedRefundId(item.id)}>Khoản hoàn <TruncatedId value={item.id} /></TextActionButton>
              <span>{formatCoffeePackageDateTime(item.createdAt)}</span>
            </div>
          </> },
          { key: "amount", header: "Số tiền", align: "right", render: (item) => formatCoffeePackageMoney(item.amount, item.currency ?? "VND") },
          { key: "status", header: "Trạng thái", render: (item) => <StatusBadge variant="dot" status={item.status}>{coffeePackageStatusLabel(item.status)}</StatusBadge> },
        ]} />
      ) : null}
    </Panel>
  );
}
