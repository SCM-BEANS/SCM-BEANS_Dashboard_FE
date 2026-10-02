import AdminCustomerScreens from "@/components/dolores/AdminCustomerScreens";

export default async function AdminBusinessesPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  const initialView = view === "customer" ? "customer" : "list";
  return <AdminCustomerScreens initialView={initialView} />;
}
