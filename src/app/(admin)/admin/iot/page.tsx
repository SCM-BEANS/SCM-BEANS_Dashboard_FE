import AdminIoTScreens from "@/app/(admin)/admin/_components/AdminIoTScreens";

export default async function AdminIoTPage({
  searchParams,
}: {
  searchParams: Promise<{ tenantId?: string }>;
}) {
  const { tenantId } = await searchParams;
  return <AdminIoTScreens selectedTenantId={tenantId} />;
}
