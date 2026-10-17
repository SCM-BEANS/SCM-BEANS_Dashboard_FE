import { isSupportedModeratorSection } from "@/routes/routes";
import { notFound } from "next/navigation";
import { ModeratorSectionPage } from "@/components/dolores/ModeratorDashboardScreens";

export default async function ModeratorSectionRoute({ params }: { params: Promise<{ sections: string[] }> }) {
  const { sections } = await params;
  const path = sections.join("/");
  if (!isSupportedModeratorSection(path)) notFound();
  return <ModeratorSectionPage sections={sections} />;
}
