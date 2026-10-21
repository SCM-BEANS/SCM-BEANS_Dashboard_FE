import AdminMachineDetailScreen from "@/app/(admin)/admin/_components/AdminMachineDetailScreen";

export default async function AdminMachineDetailPage({
  params,
}: {
  params: Promise<{ machineId: string }>;
}) {
  const { machineId } = await params;
  return <AdminMachineDetailScreen machineId={decodeURIComponent(machineId)} />;
}
