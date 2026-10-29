import { TechnicianShell } from "../technician-shell";
import { TECHNICIAN_MESSAGES } from "@/text/technician/technician-messages";
import { TechnicianTasksTable } from "./technician-tasks-table";

export default function TechnicianTasksPage() {
  return (
    <TechnicianShell pageTitle={TECHNICIAN_MESSAGES.NAVIGATION.TASKS}>
      <TechnicianTasksTable />
    </TechnicianShell>
  );
}
