import { CustomerSectionPage } from "@/app/(dashboard)/dashboard/_components/CustomerDashboardScreens";

export default async function UserMachinesPage({ searchParams }: { searchParams: Promise<{ view?: string; state?: string }> }) {
  const query = await searchParams;
  return <CustomerSectionPage sections={["machines"]} view={query.view} state={query.state} />;
}
