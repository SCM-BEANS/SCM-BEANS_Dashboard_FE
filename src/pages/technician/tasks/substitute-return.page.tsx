import { TechnicianRoutePage } from "../technician-route-page";
import { getTechnicianTaskScreenDescriptor } from "./task-screens";

export default function TechnicianSubstituteReturnPage() {
  return <TechnicianRoutePage screen={getTechnicianTaskScreenDescriptor("tasks/substitute-return")} />;
}
