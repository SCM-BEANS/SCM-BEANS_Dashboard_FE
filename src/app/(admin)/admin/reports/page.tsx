import AdminReportScreens from "@/components/dolores/AdminReportScreens";

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  return <AdminReportScreens initialView={view === "customers" ? "customers" : "overview"} />;
}
