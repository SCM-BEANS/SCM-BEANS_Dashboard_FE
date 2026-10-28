import { TechnicianShell } from "../technician-shell";
import { MachineCheckTable } from "./machine-check-table";
import { TECHNICIAN_MESSAGES } from "@/text/technician/technician-messages";

export default function TechnicianMachineCheckPage() {
  return (
    <TechnicianShell pageTitle={TECHNICIAN_MESSAGES.NAVIGATION.MACHINE_CHECK}>
      <MachineCheckTable />
    </TechnicianShell>
  );
}
