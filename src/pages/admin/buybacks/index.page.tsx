import { BuybackWorkflowScreen } from "@/components/features/buyback/buyback-workflow-screen";
import { AdminShell } from "../admin-shell";

export default function AdminBuybacksPage() {
  return <AdminShell><BuybackWorkflowScreen role="operator" operatorRole="ADMIN" listHref="/admin/buybacks" /></AdminShell>;
}
