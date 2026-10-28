import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { isSupportedTechnicianSection } from "@/routes/routes";
import { TechnicianRoutePage } from "../technician-route-page";
import { getTechnicianTaskScreenDescriptor } from "./task-screens";

interface TechnicianTaskPageProps {
  sectionPath: string;
}

export const getServerSideProps: GetServerSideProps<TechnicianTaskPageProps> = async ({ params }) => {
  const taskOrWorkflow = params?.taskOrWorkflow;
  if (typeof taskOrWorkflow !== "string") return { notFound: true };

  const sectionPath = `tasks/${taskOrWorkflow}`;
  if (!isSupportedTechnicianSection(sectionPath)) return { notFound: true };

  return { props: { sectionPath } };
};

export default function TechnicianTaskPage({
  sectionPath,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return <TechnicianRoutePage screen={getTechnicianTaskScreenDescriptor(sectionPath)} />;
}
