import type { CoffeePackageWorkflowController } from "./coffee-package-workflow-controller";
import { OperatorRefundDetailPanel } from "./operator-refund-detail-panel";
import { OperatorRefundListPanel } from "./operator-refund-list-panel";

export function OperatorRefundsPanel({
  workflow,
  isAdmin,
}: {
  workflow: CoffeePackageWorkflowController;
  isAdmin: boolean;
}) {
  return (
    <>
      <OperatorRefundListPanel workflow={workflow} />
      {workflow.selectedRefundId ? <OperatorRefundDetailPanel key={workflow.selectedRefundId} workflow={workflow} isAdmin={isAdmin} /> : null}
    </>
  );
}
