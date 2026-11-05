import { RecipeManagementScreen } from "@/components/features/recipe-menus/recipe-menus-screen";
import { AdminShell } from "../admin-shell";

export default function AdminRecipeManagementPage() {
  return (
    <AdminShell>
      <RecipeManagementScreen role="operator" operatorRole="ADMIN" />
    </AdminShell>
  );
}
