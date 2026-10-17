import { resolveAdminAccountView } from "@/routes/query";
import AdminAccountScreens from "@/components/dolores/AdminAccountScreens";

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  return <AdminAccountScreens initialView={resolveAdminAccountView(view)} />;
}
