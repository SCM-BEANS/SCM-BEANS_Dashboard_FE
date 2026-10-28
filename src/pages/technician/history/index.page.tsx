import { TechnicianRoutePage } from "../technician-route-page";
import { getTechnicianHistoryScreenDescriptor } from "./history-screen";

export default function TechnicianHistoryPage() {
  return <TechnicianRoutePage screen={getTechnicianHistoryScreenDescriptor("history")} />;
}
