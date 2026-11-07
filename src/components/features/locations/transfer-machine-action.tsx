import { useState } from "react";
import { ButtonBar } from "@/components/button/button-bar";
import { PageActions } from "@/components/action-bar/page-actions";
import { buildMachineTransferActions, type OperatorActionRole } from "@/components/action-bar/entity-page-actions";
import type { Machine } from "@/schema/machines.schema";
import { TransferMachineDialog } from "./transfer-machine-dialog";
import styles from "./location-detail.module.css";

type TransferableMachine = Pick<Machine, "id" | "ownerId" | "locationId" | "serialNumber">;

export function TransferMachineAction({
  machine,
  currentLocationName,
  onOpen,
  onSuccess,
  role = "owner",
  pageLevel = false,
}: {
  machine: TransferableMachine;
  currentLocationName?: string | null;
  onOpen?: () => void;
  onSuccess?: (targetLocationName: string) => void;
  role?: OperatorActionRole;
  pageLevel?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [pending, setPending] = useState(false);

  if (!machine.ownerId) return null;

  const onTransfer = () => { setSuccessMessage(""); onOpen?.(); setOpen(true); };
  const pageActions = buildMachineTransferActions({ role, machine, onTransfer }).map((action) => ({ ...action, pending, pendingLabel: "Đang chuyển máy" }));

  return <>
    {!pageLevel && <ButtonBar type="button" onClick={() => { setSuccessMessage(""); onOpen?.(); setOpen(true); }}>
      Chuyển điểm bán
    </ButtonBar>
    }
    {pageLevel && <PageActions actions={pageActions} />}
    {successMessage && <p className={styles.successNotice} role="status">{successMessage}</p>}
    {open && <TransferMachineDialog
      machine={machine}
      currentLocationName={currentLocationName}
      onPendingChange={setPending}
      onClose={() => setOpen(false)}
      onSuccess={(targetLocationName) => {
        setOpen(false);
        setSuccessMessage(`Đã chuyển máy tới ${targetLocationName}.`);
        onSuccess?.(targetLocationName);
      }}
    />}
  </>;
}
