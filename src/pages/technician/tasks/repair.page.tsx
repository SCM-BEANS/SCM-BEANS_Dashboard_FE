import { TechnicianRoutePage } from "../technician-route-page";
import { getTechnicianTaskScreenDescriptor } from "./task-screens";

export default function TechnicianRepairPage() {
  return <TechnicianRoutePage screen={getTechnicianTaskScreenDescriptor("tasks/repair")} />;
}
