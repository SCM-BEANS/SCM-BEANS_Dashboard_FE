import { useEffect } from "react";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import { getApiErrorMessage } from "@/lib/api-errors";
import { PATH_ADMIN, PATH_MODERATOR } from "@/routes/path";
import type { CoffeePackageRole } from "./coffee-package-workflow-controller";
import { useCoffeePackageWorkflowController } from "./coffee-package-workflow-controller";
import styles from "./coffee-package-workflow.module.css";
import { OperatorOrderDetailPanel } from "./operator-order-detail-panel";

type OperatorRole = Extract<CoffeePackageRole, "ADMIN" | "MODERATOR">;

export function CoffeePackageOperatorOrderDetailScreen({
  role,
  orderId,
}: {
  role: OperatorRole;
  orderId: string;
}) {
  const workflow = useCoffeePackageWorkflowController(role, "", orderId);
  const listHref = role === "ADMIN" ? PATH_ADMIN.COFFEE_PACKAGES : PATH_MODERATOR.COFFEE_PACKAGES;

  useEffect(() => {
    workflow.setSelectedOrderId(orderId);
  }, [orderId, workflow.setSelectedOrderId]);

  return (
    <main className={styles.screen}>
      <BackButtonHeading
        back={{ label: "Về danh sách đơn", fallbackHref: listHref }}
        title="Chi tiết đơn gói cà phê"
        titleId="coffee-package-operator-order-title"
        description="Xem trạng thái đơn, hóa đơn, chứng từ thanh toán và các bước xử lý tiếp theo."
        className={styles.detailHeading}
      />
      {workflow.success ? <p className={styles.successNotice} role="status">{workflow.success}</p> : null}
      {workflow.actionError ? <p className={styles.errorNotice} role="alert">{getApiErrorMessage(workflow.actionError, "mutation")}</p> : null}
      <OperatorOrderDetailPanel workflow={workflow} />
    </main>
  );
}
