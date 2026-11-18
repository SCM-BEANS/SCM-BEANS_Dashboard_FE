import { useState } from "react";
import { useRouter } from "next/router";
import { ButtonBar } from "@/components/button/button-bar";
import { MachineSectionTabs } from "@/components/machines/operational-overview";
import { getApiErrorMessage } from "@/lib/api-errors";
import { PATH_ADMIN, PATH_MODERATOR } from "@/routes/path";
import type { CoffeePackageRole } from "./coffee-package-workflow-controller";
import { useCoffeePackageWorkflowController } from "./coffee-package-workflow-controller";
import styles from "./coffee-package-workflow.module.css";
import { OperatorCatalogPanel } from "./operator-catalog-panel";
import { OperatorExceptionsPanel } from "./operator-exceptions-panel";
import { OperatorOrderListPanel } from "./operator-order-list-panel";
import { OperatorRefundsPanel } from "./operator-refunds-panel";

type OperatorTab = "orders" | "refunds" | "catalog" | "exceptions";
type OperatorRole = Extract<CoffeePackageRole, "ADMIN" | "MODERATOR">;

export function CoffeePackageOperatorScreen({ role }: { role: OperatorRole }) {
  const router = useRouter();
  const workflow = useCoffeePackageWorkflowController(role);
  const [tab, setTab] = useState<OperatorTab>("orders");
  const isAdmin = role === "ADMIN";
  const refreshing = workflow.orders.isFetching || workflow.packages.isFetching || workflow.refunds.isFetching || (isAdmin && workflow.exceptions.isFetching);
  const tabs: { id: OperatorTab; label: string }[] = [
    { id: "orders", label: "Đơn hàng" },
    { id: "refunds", label: "Hoàn tiền" },
    { id: "catalog", label: "Danh mục gói" },
    ...(isAdmin ? [{ id: "exceptions" as const, label: "Thanh toán ngoại lệ" }] : []),
  ];

  return (
    <div className={`${styles.screen} ${styles.managementScreen} dashboard-list-page`}>
      <header className="dashboard-list-heading">
        <div>
          <h1>Gói cà phê</h1>
        </div>
        <ButtonBar rollingLabel type="button" disabled={refreshing} aria-busy={refreshing} onClick={() => {
          void workflow.orders.refetch();
          void workflow.packages.refetch();
          void workflow.refunds.refetch();
          if (isAdmin) void workflow.exceptions.refetch();
        }}>{refreshing ? "Đang tải…" : "Làm mới"}</ButtonBar>
      </header>

      {workflow.success ? <p className={styles.successNotice} role="status">{workflow.success}</p> : null}
      {workflow.actionError ? <p className={styles.errorNotice} role="alert">{getApiErrorMessage(workflow.actionError, "mutation")}</p> : null}

      <MachineSectionTabs label="Nhóm quản lý gói cà phê" tabs={tabs.map((item) => ({ value: item.id, label: item.label }))} activeTab={tab} onTabChange={(value) => setTab(value as OperatorTab)} idPrefix="coffee-package" />
      <div className={styles.tabPanel} role="tabpanel" id="coffee-package-content" aria-labelledby={`coffee-package-tab-${tab}`}>
      {tab === "orders" ? (
        <OperatorOrderListPanel
          workflow={workflow}
          onOpenOrder={(id) => {
            workflow.setSelectedRefundId("");
            const detailHref = role === "ADMIN"
              ? PATH_ADMIN.COFFEE_PACKAGE_ORDER_DETAIL(id)
              : PATH_MODERATOR.COFFEE_PACKAGE_ORDER_DETAIL(id);
            void router.push(detailHref);
          }}
        />
      ) : null}
      {tab === "refunds" ? <OperatorRefundsPanel workflow={workflow} isAdmin={isAdmin} /> : null}
      {tab === "catalog" ? <OperatorCatalogPanel workflow={workflow} isAdmin={isAdmin} /> : null}
      {tab === "exceptions" && isAdmin ? <OperatorExceptionsPanel workflow={workflow} /> : null}
      </div>
    </div>
  );
}
