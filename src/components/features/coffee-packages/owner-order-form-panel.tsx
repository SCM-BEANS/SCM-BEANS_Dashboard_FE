import { useEffect, useState, type FormEvent } from "react";
import { PageActions } from "@/components/action-bar/page-actions";
import { getApiErrorMessage } from "@/lib/api-errors";
import type { CoffeePackage } from "@/schema/coffee-packages.schema";
import type { CoffeePackageWorkflowController } from "./coffee-package-workflow-controller";
import { formatCoffeePackageMoney } from "./coffee-package-workflow-controller";
import styles from "./coffee-package-workflow.module.css";

export function OwnerOrderFormPanel({
  workflow,
  packageId,
  setPackageId,
  packages,
}: {
  workflow: CoffeePackageWorkflowController;
  packageId: string;
  setPackageId: (value: string) => void;
  packages: CoffeePackage[];
}) {
  const [contractId, setContractId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const selectedPackage = workflow.packageDetail.data ?? packages.find((item) => item.id === packageId);

  useEffect(() => {
    if (!contractId && workflow.activeSmartIoTContracts[0]) {
      setContractId(workflow.activeSmartIoTContracts[0].id);
    }
  }, [contractId, workflow.activeSmartIoTContracts]);

  const placeOrder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!contractId || !packageId) return;
    workflow.run({ type: "PLACE_ORDER", input: { contractId, packageId, quantity: Number(quantity) } });
  };

  return (
    <section className={styles.panel} aria-labelledby="coffee-package-order-title">
      <div className={styles.panelHeading}>
        <div>
          <h2 id="coffee-package-order-title">Đặt gói mới</h2>
          <p>Chọn hợp đồng Smart IoT đang hoạt động, gói cà phê và số lượng.</p>
        </div>
      </div>

      {workflow.contracts.isPending ? <p className={styles.notice} role="status">Đang tải hợp đồng…</p> : null}
      {workflow.contracts.isError ? <p className={styles.errorNotice} role="alert">{getApiErrorMessage(workflow.contracts.error)}</p> : null}
      {workflow.packages.isPending ? <p className={styles.notice} role="status">Đang tải danh mục gói cà phê…</p> : null}
      {workflow.packages.isError ? <p className={styles.errorNotice} role="alert">{getApiErrorMessage(workflow.packages.error)}</p> : null}

      {!workflow.contracts.isPending && !workflow.contracts.isError && workflow.activeSmartIoTContracts.length === 0 ? (
        <p className={styles.notice} role="note">Bạn chưa có hợp đồng Smart IoT đang hoạt động để đặt gói.</p>
      ) : null}
      {!workflow.packages.isPending && !workflow.packages.isError && packages.length === 0 ? (
        <p className={styles.notice} role="note">Hiện chưa có gói cà phê đang kinh doanh.</p>
      ) : null}

      {workflow.activeSmartIoTContracts.length > 0 && packages.length > 0 ? (
        <form id="owner-coffee-order-form" className={styles.form} onSubmit={placeOrder}>
          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span>Hợp đồng Smart IoT</span>
              <select value={contractId} onChange={(event) => setContractId(event.target.value)} required>
                <option value="">Chọn hợp đồng</option>
                {workflow.activeSmartIoTContracts.map((contract) => (
                  <option key={contract.id} value={contract.id}>
                    {contract.id.slice(0, 8).toUpperCase()} · Máy {contract.machineId?.slice(0, 8).toUpperCase() ?? "chưa gán"}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span>Gói cà phê</span>
              <select value={packageId} onChange={(event) => setPackageId(event.target.value)} required>
                <option value="">Chọn gói cà phê</option>
                {packages.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {formatCoffeePackageMoney(item.unitPrice, item.currency)}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span>Số lượng gói</span>
              <input type="number" min="1" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} required />
            </label>
          </div>

          {selectedPackage ? (
            <div className={styles.selectedPackage}>
              <div>
                <strong>{selectedPackage.name}</strong>
                {selectedPackage.description ? <p>{selectedPackage.description}</p> : null}
              </div>
              <div className={styles.packagePrice}>
                <span>Giá mỗi gói</span>
                <strong>{formatCoffeePackageMoney(selectedPackage.unitPrice, selectedPackage.currency)}</strong>
                {selectedPackage.usageDays ? <span>Dùng trong {selectedPackage.usageDays} ngày</span> : null}
              </div>
              <div className={styles.packageTotal}>
                <span>Tạm tính</span>
                <strong>{formatCoffeePackageMoney(selectedPackage.unitPrice * Math.max(1, Number(quantity) || 1), selectedPackage.currency)}</strong>
              </div>
            </div>
          ) : null}
          {workflow.packageDetail.isPending ? <p className={styles.notice} role="status">Đang tải chi tiết gói…</p> : null}
          {workflow.packageDetail.isError ? <p className={styles.errorNotice} role="alert">{getApiErrorMessage(workflow.packageDetail.error)}</p> : null}
          <div className={styles.actionRow}>
            <span className={styles.hint}>Bạn có thể xem trạng thái và chứng từ sau khi gửi đơn.</span>
            <PageActions actions={[{ id: "place-coffee-order", label: "Gửi đơn đặt gói", variant: "primary", priority: 100, type: "submit", form: "owner-coffee-order-form", disabled: !contractId || !packageId || Number(quantity) < 1, disabledReason: "Chọn hợp đồng, gói và số lượng hợp lệ.", pending: workflow.pending, pendingLabel: "Đang gửi…" }]} />
          </div>
        </form>
      ) : null}
    </section>
  );
}
