import { resolveAdminReportView } from "@/routes/query";
import AdminReportScreens from "@/app/(admin)/admin/_components/AdminReportScreens";

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  return <AdminReportScreens initialView={resolveAdminReportView(view)} />;
}
