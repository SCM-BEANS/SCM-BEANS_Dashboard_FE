import AdminMachineDetailScreen from "@/components/dolores/AdminMachineDetailScreen";

export default async function AdminMachineDetailPage({
  params,
}: {
  params: Promise<{ machineId: string }>;
}) {
  const { machineId } = await params;
  return <AdminMachineDetailScreen machineId={decodeURIComponent(machineId)} />;
}
