import AdminIoTScreens from "@/components/dolores/AdminIoTScreens";

export default async function AdminIoTPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  return <AdminIoTScreens showCustomerMachines={view === "machines"} />;
}
