import { notFound } from "next/navigation";
import { TechnicianSectionPage } from "@/components/dolores/TechnicianDashboardScreens";

const ROUTES = new Set([
  "tasks", "tasks/YC-017", "tasks/standard-handover", "tasks/smart-activation", "tasks/repair", "tasks/retrieval", "tasks/substitute", "tasks/substitute-return", "tasks/refurbishment", "tasks/buyback-assessment", "tasks/maintenance-history",
  "history", "history/S-018", "history/C-031", "history/S-022", "notifications",
]);

export default async function TechnicianSectionRoute({ params }: { params: Promise<{ sections: string[] }> }) {
  const { sections } = await params;
  if (!ROUTES.has(sections.join("/"))) notFound();
  return <TechnicianSectionPage sections={sections} />;
}
