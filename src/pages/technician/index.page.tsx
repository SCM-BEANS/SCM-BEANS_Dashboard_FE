import { TECHNICIAN_MESSAGES } from "@/text/technician/technician-messages";
import { TechnicianShell } from "./technician-shell";
import { TechnicianTasksTable } from "./tasks/technician-tasks-table";

export default function TechnicianIndexPage() {
  return (
    <TechnicianShell pageTitle={TECHNICIAN_MESSAGES.NAVIGATION.TASKS}>
      <TechnicianTasksTable />
    </TechnicianShell>
  );
}
