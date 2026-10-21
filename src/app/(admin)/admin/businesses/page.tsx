import { resolveAdminBusinessView } from "@/routes/query";
import AdminCustomerScreens from "@/app/(admin)/admin/_components/AdminCustomerScreens";

export default async function AdminBusinessesPage({ searchParams }: { searchParams: Promise<{ view?: string; tenantId?: string }> }) {
  const { view, tenantId } = await searchParams;
  const initialView = resolveAdminBusinessView(view);
  return <AdminCustomerScreens initialView={initialView} tenantId={tenantId} />;
}
