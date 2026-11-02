import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { AdminMachineOperationalOverviewScreen } from "../machine-operational-overview-screen";
import { MachineIdSchema } from "@/schema/machines.schema";

interface MachineOperationsPageProps {
  machineId: string;
}

export const getServerSideProps: GetServerSideProps<MachineOperationsPageProps> = async ({ params }) => {
  const machineId = typeof params?.machineId === "string" ? params.machineId : "";
  if (!MachineIdSchema.safeParse(machineId).success) return { notFound: true };
  return { props: { machineId } };
};

export default function AdminMachineOperationsPage({
  machineId,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return <AdminMachineOperationalOverviewScreen machineId={machineId} />;
}
