import { TechnicianRoutePage } from "../technician-route-page";
import { getTechnicianTaskScreenDescriptor } from "./task-screens";

export default function TechnicianBuybackAssessmentPage() {
  return <TechnicianRoutePage screen={getTechnicianTaskScreenDescriptor("tasks/buyback-assessment")} />;
}
