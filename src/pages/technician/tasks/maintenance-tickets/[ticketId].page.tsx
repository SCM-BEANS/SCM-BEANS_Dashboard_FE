import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { isSupportedTechnicianSection } from "@/routes/routes";
import { MaintenanceTicketIdSchema } from "@/schema/machines.schema";
import { TechnicianMaintenanceTicketScreen } from "@/components/features/maintenance-workflow/technician-maintenance-ticket-screen";
import { TechnicianShell } from "@/pages/technician/technician-shell";

interface TechnicianMaintenanceTicketPageProps {
  ticketId: string;
}

export const getServerSideProps: GetServerSideProps<TechnicianMaintenanceTicketPageProps> = async ({ params }) => {
  const ticketId = params?.ticketId;
  if (typeof ticketId !== "string" || !MaintenanceTicketIdSchema.safeParse(ticketId).success) {
    return { notFound: true };
  }
  if (!isSupportedTechnicianSection("tasks/maintenance-tickets/" + ticketId)) {
    return { notFound: true };
  }
  return { props: { ticketId } };
};

export default function TechnicianMaintenanceTicketPage({
  ticketId,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <TechnicianShell pageTitle="Chi tiết phiếu bảo trì">
      <TechnicianMaintenanceTicketScreen ticketId={ticketId} />
    </TechnicianShell>
  );
}
