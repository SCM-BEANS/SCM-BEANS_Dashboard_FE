import { TechnicianRoutePage } from "../technician-route-page";
import { getTechnicianTaskScreenDescriptor } from "./task-screens";

export default function TechnicianStandardHandoverPage() {
  return <TechnicianRoutePage screen={getTechnicianTaskScreenDescriptor("tasks/standard-handover")} />;
}
