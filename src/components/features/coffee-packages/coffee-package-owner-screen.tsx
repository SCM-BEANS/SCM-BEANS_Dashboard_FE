import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { ButtonBar } from "@/components/button/button-bar";
import { getApiErrorMessage } from "@/lib/api-errors";
import { PATH_CUSTOMER } from "@/routes/path";
import type { CoffeePackage } from "@/schema/coffee-packages.schema";
import {
  useCoffeePackageWorkflowController,
  type CoffeePackageWorkflowController,
} from "./coffee-package-workflow-controller";
import styles from "./coffee-package-workflow.module.css";
import { OwnerOrderFormPanel } from "./owner-order-form-panel";
import { OwnerOrderListPanel } from "./owner-order-list-panel";

export function CoffeePackageOwnerScreen() {
  const router = useRouter();
  const [packageId, setPackageId] = useState("");
  const workflow = useCoffeePackageWorkflowController("OWNER", packageId);
  const activePackages = useMemo(
    () => (workflow.packages.data?.items ?? []).filter(isPackageActive),
    [workflow.packages.data?.items],
  );

  useEffect(() => {
    if (!packageId && activePackages[0]) setPackageId(activePackages[0].id);
    else if (packageId && !activePackages.some((item) => item.id === packageId)) {
      setPackageId(activePackages[0]?.id ?? "");
    }
  }, [activePackages, packageId]);

  useEffect(() => {
    if (workflow.selectedOrderId && router.isReady) {
      void router.push(PATH_CUSTOMER.COFFEE_PACKAGE_ORDER_DETAIL(workflow.selectedOrderId));
    }
  }, [router, workflow.selectedOrderId]);

  return (
    <main className={`${styles.screen} ${styles.managementScreen}`}>
      <header className={styles.heading}>
        <div>
          <h1>Gói cà phê</h1>
          <p>Đặt hạt cà phê cho hợp đồng Smart IoT, theo dõi thanh toán và bàn giao.</p>
        </div>
        <ButtonBar
          type="button"
          onClick={() => {
            void workflow.packages.refetch();
            void workflow.orders.refetch();
          }}
        >
          Làm mới
        </ButtonBar>
      </header>

      {workflow.success ? <p className={styles.successNotice} role="status">{workflow.success}</p> : null}
      {workflow.actionError ? <p className={styles.errorNotice} role="alert">{getApiErrorMessage(workflow.actionError, "mutation")}</p> : null}

      <OwnerOrderFormPanel workflow={workflow} packageId={packageId} setPackageId={setPackageId} packages={activePackages} />
      <OwnerOrderListPanel workflow={workflow} onOpenOrder={(orderId) => {
        workflow.setSelectedRefundId("");
        void router.push(PATH_CUSTOMER.COFFEE_PACKAGE_ORDER_DETAIL(orderId));
      }} />
    </main>
  );
}

function isPackageActive(item: CoffeePackage) {
  return item.active !== false && item.status?.toUpperCase() !== "INACTIVE";
}

export type OwnerCoffeePackageWorkflow = CoffeePackageWorkflowController;
