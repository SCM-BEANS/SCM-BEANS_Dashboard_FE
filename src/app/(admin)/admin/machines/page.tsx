import { resolveAdminMachineView } from "@/routes/query";
import AdminMachineScreens from "@/app/(admin)/admin/_components/AdminMachineScreens";

export default async function AdminMachinesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const initialView = resolveAdminMachineView(view);
  return <AdminMachineScreens initialView={initialView} />;
}
