import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { isSupportedTechnicianSection } from "@/routes/routes";
import { TechnicianMachineHistoryScreen } from "./history-screen";

interface TechnicianMachineHistoryPageProps {
  sectionPath: string;
}

export const getServerSideProps: GetServerSideProps<TechnicianMachineHistoryPageProps> = async ({ params }) => {
  const machineId = params?.machineId;
  if (typeof machineId !== "string") return { notFound: true };

  const sectionPath = `history/${machineId}`;
  if (!isSupportedTechnicianSection(sectionPath)) return { notFound: true };

  return { props: { sectionPath } };
};

export default function TechnicianMachineHistoryPage({
  sectionPath,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return <TechnicianMachineHistoryScreen sectionPath={sectionPath} />;
}
