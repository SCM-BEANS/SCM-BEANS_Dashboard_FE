import { resolveAdminContractView } from "@/routes/query";
import AdminContractScreens from "@/app/(admin)/admin/_components/AdminContractScreens";

export default async function AdminContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; contractId?: string; tenantId?: string }>;
}) {
  const { view, contractId, tenantId } = await searchParams;
  const initialView = resolveAdminContractView(view);
  return (
    <AdminContractScreens
      initialView={initialView}
      initialContractId={contractId}
      initialTenantId={tenantId}
    />
  );
}
