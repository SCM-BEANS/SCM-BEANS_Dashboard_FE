import { useState, type FormEvent } from "react";
import { PageActions } from "@/components/action-bar/page-actions";
import { ButtonBar } from "@/components/button/button-bar";
import { StatusBadge } from "@/components/status-badge/status-badge";
import { getApiErrorMessage } from "@/lib/api-errors";
import type { CoffeePackage, CoffeePackageUpsertRequest } from "@/schema/coffee-packages.schema";
import type { CoffeePackageWorkflowController } from "./coffee-package-workflow-controller";
import { coffeePackageStatusLabel, formatCoffeePackageMoney } from "./coffee-package-workflow-controller";
import styles from "./coffee-package-workflow.module.css";

export function OperatorCatalogPanel({
  workflow,
  isAdmin,
}: {
  workflow: CoffeePackageWorkflowController;
  isAdmin: boolean;
}) {
  const [editingId, setEditingId] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [currency, setCurrency] = useState("VND");
  const [usageDays, setUsageDays] = useState("");
  const packages = workflow.packages.data?.items ?? [];

  const resetForm = () => {
    setFormOpen(false);
    setEditingId("");
    setCode("");
    setName("");
    setDescription("");
    setUnitPrice("");
    setCurrency("VND");
    setUsageDays("");
  };

  const editPackage = (item: CoffeePackage) => {
    setFormOpen(true);
    setEditingId(item.id);
    setCode(item.code ?? "");
    setName(item.name);
    setDescription(item.description ?? "");
    setUnitPrice(String(item.unitPrice));
    setCurrency(item.currency);
    setUsageDays(String(item.usageDays ?? ""));
  };

  const savePackage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input: CoffeePackageUpsertRequest = {
      code: code.trim(),
      name: name.trim(),
      ...(description.trim() ? { description: description.trim() } : {}),
      unitPrice: Number(unitPrice),
      currency: currency.trim().toUpperCase(),
      usageDays: Number(usageDays),
    };
    workflow.run(editingId
      ? { type: "UPDATE_PACKAGE", packageId: editingId, input }
      : { type: "CREATE_PACKAGE", input }, { onSuccess: resetForm });
  };

  return (
    <section className={styles.panel} aria-labelledby="coffee-operator-catalog-title">
      <PageActions actions={isAdmin && formOpen ? [{ id: "coffee-catalog-cancel", label: "Hủy", onClick: resetForm, priority: 0, disabled: workflow.pending, confirm: { title: "Hủy chỉnh sửa?", description: "Các thay đổi chưa lưu sẽ bị bỏ.", confirmLabel: "Hủy chỉnh sửa" } }, { id: "coffee-catalog-save", label: editingId ? "Lưu thay đổi" : "Tạo gói", priority: editingId ? 100 : 20, variant: "primary" as const, type: "submit" as const, form: "coffee-catalog-form", disabled: workflow.pending || !code.trim() || !name.trim() || !unitPrice || Number(unitPrice) < 0 || !usageDays || Number(usageDays) < 1, disabledReason: "Nhập thông tin hợp lệ cho gói.", pending: workflow.pending }] : []} />
      <div className={styles.panelHeading}>
        <div>
          <h2 id="coffee-operator-catalog-title">Danh mục gói cà phê</h2>
          <p>Thông tin giá bán và số ngày sử dụng của từng gói.</p>
        </div>
        {isAdmin && !formOpen ? <ButtonBar rollingLabel variant="primary" type="button" onClick={() => setFormOpen(true)}>Tạo gói cà phê</ButtonBar> : null}
      </div>

      {isAdmin && formOpen ? (
        <form id="coffee-catalog-form" className={styles.subpanel} onSubmit={savePackage}>
          <h3>{editingId ? "Cập nhật gói" : "Tạo gói cà phê"}</h3>
          <div className={styles.formGrid}>
            <label className={styles.field}><span>Mã gói</span><input value={code} onChange={(event) => setCode(event.target.value)} maxLength={80} required /></label>
            <label className={styles.field}><span>Tên gói</span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={160} required /></label>
            <label className={styles.field}><span>Đơn giá (VND)</span><input type="number" min="0" step="1" value={unitPrice} onChange={(event) => setUnitPrice(event.target.value)} required /></label>
            <label className={styles.field}><span>Đơn vị tiền</span><input value={currency} onChange={(event) => setCurrency(event.target.value)} maxLength={8} required /></label>
            <label className={styles.field}><span>Số ngày sử dụng</span><input type="number" min="1" step="1" value={usageDays} onChange={(event) => setUsageDays(event.target.value)} required /></label>
            <label className={styles.field}><span>Mô tả</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} /></label>
          </div>
        </form>
      ) : !isAdmin ? (
        <div className={styles.permissionNotice}>
          <div>
            <h3>Quyền quản lý danh mục</h3>
            <p>Moderator có thể xem danh mục. Chỉ Admin được tạo, chỉnh sửa hoặc ngừng bán gói.</p>
          </div>
          <ButtonBar type="button" disabled aria-describedby="coffee-package-catalog-permission">
            Tạo gói
          </ButtonBar>
          <span id="coffee-package-catalog-permission" className={styles.hint}>
            Tài khoản Moderator hiện chỉ có quyền xem danh mục.
          </span>
        </div>
      ) : null}

      {workflow.packages.isPending ? <p className={styles.notice} role="status">Đang tải danh mục gói…</p> : null}
      {workflow.packages.isError ? <p className={styles.errorNotice} role="alert">{getApiErrorMessage(workflow.packages.error)}</p> : null}
      {!workflow.packages.isPending && !workflow.packages.isError && packages.length === 0 ? <p className={styles.notice}>Chưa có gói cà phê trong danh mục.</p> : null}
      {packages.length ? (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Mã gói</th><th>Tên gói</th><th>Mô tả</th><th className={styles.numeric}>Đơn giá</th><th className={styles.numeric}>Ngày sử dụng</th><th>Trạng thái</th>{isAdmin ? <th>Thao tác</th> : null}</tr></thead>
            <tbody>{packages.map((item) => {
              const active = item.active !== false && item.status?.toUpperCase() !== "INACTIVE";
              return (
                <tr key={item.id} className={editingId === item.id ? styles.selectedRow : undefined}>
                  <td className={styles.code}>{item.code ?? "—"}</td>
                  <td>{item.name}</td>
                  <td>{item.description || "—"}</td>
                  <td className={styles.numeric}>{formatCoffeePackageMoney(item.unitPrice, item.currency)}</td>
                  <td className={styles.numeric}>{item.usageDays ?? "—"}</td>
                  <td><StatusBadge variant="dot" status={active ? "ACTIVE" : "INACTIVE"}>{coffeePackageStatusLabel(active ? "ACTIVE" : "INACTIVE")}</StatusBadge></td>
                  {isAdmin ? (
                    <td className={styles.buttonCell}>
                      <ButtonBar rollingLabel type="button" disabled={workflow.pending} onClick={() => editPackage(item)}>Chỉnh sửa</ButtonBar>
                      {active ? <ButtonBar type="button" disabled={workflow.pending} onClick={() => workflow.run({ type: "DEACTIVATE_PACKAGE", packageId: item.id })}>Ngừng bán</ButtonBar> : null}
                    </td>
                  ) : null}
                </tr>
              );
            })}</tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
