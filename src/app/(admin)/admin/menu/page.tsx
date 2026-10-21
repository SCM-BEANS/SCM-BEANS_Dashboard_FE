import { resolveAdminMenuView } from "@/routes/query";
import AdminMenuScreens from "@/app/(admin)/admin/_components/AdminMenuScreens";

export default async function AdminMenuPage({ searchParams }: { searchParams: Promise<{ view?: string; id?: string }> }) {
  const { view, id } = await searchParams;
  const initialView = resolveAdminMenuView(view);
  return <AdminMenuScreens initialView={initialView} initialRecipeId={id ?? null} />;
}
