import AdminMachineScreens from "@/components/dolores/AdminMachineScreens";

const MACHINE_VIEWS = ["inventory", "stock", "loan-history", "s022", "standard", "mb017", "repair-history", "s018", "repair-history-s018"] as const;

export default async function AdminMachinesPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const initialView = MACHINE_VIEWS.find((candidate) => candidate === view) ?? "inventory";
  return <AdminMachineScreens initialView={initialView} />;
}
