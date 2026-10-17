import { resolveAdminStoreView } from "@/routes/query";
import AdminStoreScreens from "@/components/dolores/AdminStoreScreens";

export default async function AdminStoresPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  return <AdminStoreScreens initialView={resolveAdminStoreView(view)} />;
}
