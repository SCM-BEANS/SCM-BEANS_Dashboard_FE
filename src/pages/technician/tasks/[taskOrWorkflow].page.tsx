import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { isSupportedTechnicianSection } from "@/routes/routes";
import { TechnicianRoutePage } from "../technician-route-page";
import { getTechnicianTaskScreenDescriptor } from "./task-screens";
import { InstallationWorkOrderIdSchema } from "@/schema/installation-work-orders.schema";
import { TechnicianInstallationWorkOrderScreen } from "./work-order-detail-screen";

interface TechnicianTaskPageProps {
  sectionPath: string;
  workOrderId?: string;
}

export const getServerSideProps: GetServerSideProps<TechnicianTaskPageProps> = async ({ params }) => {
  const taskOrWorkflow = params?.taskOrWorkflow;
  if (typeof taskOrWorkflow !== "string") return { notFound: true };

  const sectionPath = `tasks/${taskOrWorkflow}`;
  if (!isSupportedTechnicianSection(sectionPath)) return { notFound: true };

  if (InstallationWorkOrderIdSchema.safeParse(taskOrWorkflow).success) {
    return { props: { sectionPath, workOrderId: taskOrWorkflow } };
  }

  return { props: { sectionPath } };
};

export default function TechnicianTaskPage({
  sectionPath,
  workOrderId,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  if (workOrderId) return <TechnicianInstallationWorkOrderScreen workOrderId={workOrderId} />;
  return <TechnicianRoutePage screen={getTechnicianTaskScreenDescriptor(sectionPath)} />;
}
