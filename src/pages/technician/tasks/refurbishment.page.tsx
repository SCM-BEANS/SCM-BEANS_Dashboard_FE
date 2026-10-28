import { TechnicianRoutePage } from "../technician-route-page";
import { getTechnicianTaskScreenDescriptor } from "./task-screens";

export default function TechnicianRefurbishmentPage() {
  return <TechnicianRoutePage screen={getTechnicianTaskScreenDescriptor("tasks/refurbishment")} />;
}
