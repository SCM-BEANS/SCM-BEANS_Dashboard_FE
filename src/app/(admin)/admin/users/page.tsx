import { resolveAdminAccountView } from "@/routes/query";
import AdminAccountScreens from "@/app/(admin)/admin/_components/AdminAccountScreens";

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  return <AdminAccountScreens initialView={resolveAdminAccountView(view)} />;
}
