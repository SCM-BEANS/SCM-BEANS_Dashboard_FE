import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { isSupportedTechnicianSection } from "@/routes/routes";
import { TechnicianShell } from "./technician-shell";
import { getTechnicianScreenDescriptor, TechnicianRouteScreen } from "./technician-route-screens";

interface TechnicianPageProps {
  sectionPath: string;
}

export const getServerSideProps: GetServerSideProps<TechnicianPageProps> = async ({ params }) => {
  const sections = params?.sections;
  const sectionPath = Array.isArray(sections)
    ? sections.join("/")
    : typeof sections === "string"
      ? sections
      : "";

  if (!isSupportedTechnicianSection(sectionPath)) {
    return { notFound: true };
  }

  return { props: { sectionPath } };
};

export default function TechnicianRoutePage({
  sectionPath,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const screen = getTechnicianScreenDescriptor(sectionPath);

  return (
    <TechnicianShell pageTitle={screen.title}>
      <TechnicianRouteScreen sectionPath={sectionPath} />
    </TechnicianShell>
  );
}
