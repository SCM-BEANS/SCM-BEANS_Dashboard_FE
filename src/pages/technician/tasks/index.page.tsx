import { TechnicianRoutePage } from "../technician-route-page";
import { getTechnicianTaskScreenDescriptor } from "./task-screens";

export default function TechnicianTasksPage() {
  return <TechnicianRoutePage screen={getTechnicianTaskScreenDescriptor("tasks")} />;
}
