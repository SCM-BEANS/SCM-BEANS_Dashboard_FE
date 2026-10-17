import { isSupportedCustomerSection } from "@/routes/routes";
import { CustomerSectionPage } from "@/components/dolores/CustomerDashboardScreens";
import { notFound } from "next/navigation";

export default async function CustomerSectionRoute({
  params,
  searchParams,
}: {
  params: Promise<{ sections: string[] }>;
  searchParams: Promise<{ view?: string; state?: string }>;
}) {
  const [{ sections }, query] = await Promise.all([params, searchParams]);
  if (!isSupportedCustomerSection(sections.join("/"))) notFound();
  return <CustomerSectionPage sections={sections} view={query.view} state={query.state} />;
}
