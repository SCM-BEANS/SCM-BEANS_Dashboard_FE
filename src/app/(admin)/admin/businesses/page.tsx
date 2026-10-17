import { resolveAdminBusinessView } from "@/routes/query";
import AdminCustomerScreens from "@/components/dolores/AdminCustomerScreens";

export default async function AdminBusinessesPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  const initialView = resolveAdminBusinessView(view);
  return <AdminCustomerScreens initialView={initialView} />;
}
