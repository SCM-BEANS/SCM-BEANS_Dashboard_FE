import { useState } from "react";
import { useRouter } from "next/router";
import { ContractCreateForm } from "@/components/create-form/contract-create-form";
import { NotificationDialog } from "@/components/notification-dialog/notification-dialog";
import { PATH_MODERATOR } from "@/routes/path";
import { ADMIN_OPERATIONS_MESSAGES as T } from "@/text/admin/admin-operations-messages";
import { ModeratorPageHeading } from "../moderator-page-heading";
import { moderatorStyles as styles } from "../moderator-shell";

export function ContractCreateScreen() {
  const router = useRouter();
  const [createdContractId, setCreatedContractId] = useState("");
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);

  const openCreatedContract = () => {
    if (!createdContractId) return;
    setSuccessDialogOpen(false);
    void router.push(`${PATH_MODERATOR.CONTRACTS}/${createdContractId}`);
  };

  return (
    <div className={styles.pageContent}>
      <ModeratorPageHeading
        title={T.CONTRACTS.CREATE_TITLE}
        description={T.CONTRACTS.CREATE_DESCRIPTION}
      />
      <ContractCreateForm
        ownerRole="owner"
        onCreated={(id) => {
          setCreatedContractId(id);
          setSuccessDialogOpen(true);
        }}
      />
      {successDialogOpen && createdContractId && (
        <NotificationDialog
          variant="success"
          title={T.CONTRACTS.CREATED}
          description={`Mã hợp đồng: ${createdContractId}`}
          primaryAction={{
            label: "Xem hợp đồng",
            onClick: openCreatedContract,
          }}
          onClose={openCreatedContract}
        />
      )}
    </div>
  );
}
