import { isSupportedTechnicianSection } from "@/routes/routes";
import { notFound } from "next/navigation";
import { TechnicianSectionPage } from "@/app/(technician)/technician/_components/TechnicianDashboardScreens";

export default async function TechnicianSectionRoute({ params }: { params: Promise<{ sections: string[] }> }) {
  const { sections } = await params;
  if (!isSupportedTechnicianSection(sections.join("/"))) notFound();
  return <TechnicianSectionPage sections={sections} />;
}
