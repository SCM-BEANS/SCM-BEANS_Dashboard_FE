import { resolveAdminMenuView } from "@/routes/query";
import AdminMenuScreens from "@/app/(admin)/admin/_components/AdminMenuScreens";

export default async function AdminMenuPage({ searchParams }: { searchParams: Promise<{ view?: string; machine?: string; id?: string }> }) {
  const { view, machine, id } = await searchParams;
  const initialView = resolveAdminMenuView(view, machine);
  return <AdminMenuScreens initialView={initialView} initialRecipeId={id ?? null} />;
}
