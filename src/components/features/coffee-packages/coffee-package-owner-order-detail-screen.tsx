import { useEffect } from "react";
import { getApiErrorMessage } from "@/lib/api-errors";
import { PATH_CUSTOMER } from "@/routes/path";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import styles from "./coffee-package-workflow.module.css";
import { OwnerOrderDetailPanel } from "./owner-order-detail-panel";
import { CoffeeOrderProgress } from "./coffee-order-progress";
import { OwnerRefundPanel } from "./owner-refund-panel";
import { useCoffeePackageWorkflowController } from "./coffee-package-workflow-controller";

export function CoffeePackageOwnerOrderDetailScreen({ orderId }: { orderId: string }) {
  const workflow = useCoffeePackageWorkflowController("OWNER", "", orderId);

  useEffect(() => {
    if (!workflow.selectedRefundId && workflow.orderRefund.data?.id) {
      workflow.setSelectedRefundId(workflow.orderRefund.data.id);
    }
  }, [workflow.orderRefund.data, workflow.selectedRefundId, workflow.setSelectedRefundId]);

  return (
    <main className={`${styles.screen} ${styles.managementScreen}`}>
      <BackButtonHeading
        back={{ label: "Về danh sách đơn", fallbackHref: PATH_CUSTOMER.COFFEE_PACKAGES }}
        title="Chi tiết đơn gói cà phê"
        titleId="coffee-package-order-page-title"
        description="Xem thông tin đơn, hóa đơn, chứng từ thanh toán và trạng thái hoàn tiền."
        className={styles.detailHeading}
      />
      {workflow.success ? <p className={styles.successNotice} role="status">{workflow.success}</p> : null}
      {workflow.actionError ? <p className={styles.errorNotice} role="alert">{getApiErrorMessage(workflow.actionError, "mutation")}</p> : null}
      {workflow.selectedOrder ? <CoffeeOrderProgress order={workflow.selectedOrder} /> : null}
      <OwnerOrderDetailPanel workflow={workflow} />
      {workflow.orderRefund.isPending ? <p className={styles.notice} role="status">Đang tải thông tin hoàn tiền…</p> : null}
      {workflow.orderRefund.isError ? <p className={styles.errorNotice} role="alert">{getApiErrorMessage(workflow.orderRefund.error)}</p> : null}
      {workflow.selectedRefundId ? <OwnerRefundPanel workflow={workflow} /> : null}
    </main>
  );
}
