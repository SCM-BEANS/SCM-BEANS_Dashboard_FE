import { resolveAdminContractView } from "@/routes/query";
import AdminContractScreens from "@/components/dolores/AdminContractScreens";

export default async function AdminContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const initialView = resolveAdminContractView(view);
  return <AdminContractScreens initialView={initialView} />;
}
