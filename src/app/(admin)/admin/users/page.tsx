import AdminAccountScreens from "@/components/dolores/AdminAccountScreens";

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ view?: string; account?: string }> }) {
  const { view, account } = await searchParams;
  const initialAccount = account !== undefined && /^\d+$/.test(account) ? Number(account) : undefined;
  return <AdminAccountScreens initialView={view} initialAccount={initialAccount} />;
}
