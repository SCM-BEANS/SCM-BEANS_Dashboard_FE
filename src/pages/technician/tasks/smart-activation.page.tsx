import { TechnicianRoutePage } from "../technician-route-page";
import { getTechnicianTaskScreenDescriptor } from "./task-screens";

export default function TechnicianSmartActivationPage() {
  return <TechnicianRoutePage screen={getTechnicianTaskScreenDescriptor("tasks/smart-activation")} />;
}
