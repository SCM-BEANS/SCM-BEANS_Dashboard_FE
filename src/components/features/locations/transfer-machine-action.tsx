import { useState } from "react";
import { ButtonBar } from "@/components/button/button-bar";
import type { Machine } from "@/schema/machines.schema";
import { TransferMachineDialog } from "./transfer-machine-dialog";
import styles from "./location-detail.module.css";

type TransferableMachine = Pick<Machine, "id" | "ownerId" | "locationId" | "serialNumber">;

export function TransferMachineAction({
  machine,
  currentLocationName,
  onOpen,
  onSuccess,
}: {
  machine: TransferableMachine;
  currentLocationName?: string | null;
  onOpen?: () => void;
  onSuccess?: (targetLocationName: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  if (!machine.ownerId) return null;

  return <>
    <ButtonBar type="button" onClick={() => { setSuccessMessage(""); onOpen?.(); setOpen(true); }}>
      Chuyển điểm bán
    </ButtonBar>
    {successMessage && <p className={styles.successNotice} role="status">{successMessage}</p>}
    {open && <TransferMachineDialog
      machine={machine}
      currentLocationName={currentLocationName}
      onClose={() => setOpen(false)}
      onSuccess={(targetLocationName) => {
        setOpen(false);
        setSuccessMessage(`Đã chuyển máy tới ${targetLocationName}.`);
        onSuccess?.(targetLocationName);
      }}
    />}
  </>;
}
