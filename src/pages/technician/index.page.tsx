import { TechnicianRoutePage } from "./technician-route-page";
import { getTechnicianTaskScreenDescriptor } from "./tasks/task-screens";

export default function TechnicianIndexPage() {
  return <TechnicianRoutePage screen={getTechnicianTaskScreenDescriptor("")} />;
}
