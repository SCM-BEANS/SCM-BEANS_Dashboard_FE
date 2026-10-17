import { resolveAdminMenuView } from "@/routes/query";
import AdminMenuScreens from "@/components/dolores/AdminMenuScreens";

export default async function AdminMenuPage({ searchParams }: { searchParams: Promise<{ view?: string; machine?: string }> }) {
  const { view, machine } = await searchParams;
  const initialView = resolveAdminMenuView(view, machine);
  return <AdminMenuScreens initialView={initialView} />;
}
