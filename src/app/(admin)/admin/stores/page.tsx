import { resolveAdminStoreView } from "@/routes/query";
import AdminStoreScreens from "@/app/(admin)/admin/_components/AdminStoreScreens";

export default async function AdminStoresPage({ searchParams }: { searchParams: Promise<{ view?: string; tenantId?: string; locationId?: string }> }) {
  const { view, tenantId, locationId } = await searchParams;
  return <AdminStoreScreens initialView={resolveAdminStoreView(view)} tenantId={tenantId} locationId={locationId} />;
}
