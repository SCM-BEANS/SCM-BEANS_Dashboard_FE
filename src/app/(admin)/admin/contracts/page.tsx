import AdminContractScreens from "@/components/dolores/AdminContractScreens";

type ContractView = "list" | "c204" | "c205" | "history";

export default async function AdminContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const initialView: ContractView = view === "c204" || view === "c205" || view === "history" ? view : "list";
  return <AdminContractScreens initialView={initialView} />;
}
