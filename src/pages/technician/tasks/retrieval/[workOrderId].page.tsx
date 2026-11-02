import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { RecallWorkOrdersScreen } from "@/components/features/contract-termination/recall-work-orders-screen";
import { isSupportedTechnicianSection } from "@/routes/routes";
import { PATH_TECHNICIAN } from "@/routes/path";
import { TechnicianShell } from "../../technician-shell";

type PageProps = { workOrderId: string };

export const getServerSideProps: GetServerSideProps<PageProps> = async ({ params }) => {
  const workOrderId = params?.workOrderId;
  if (typeof workOrderId !== "string" || !isSupportedTechnicianSection(`tasks/retrieval/${workOrderId}`)) {
    return { notFound: true };
  }
  return { props: { workOrderId } };
};

export default function TechnicianRecallDetailPage({
  workOrderId,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <TechnicianShell pageTitle="Chi tiết thu hồi máy">
      <RecallWorkOrdersScreen role="technician" workOrderId={workOrderId} backHref={PATH_TECHNICIAN.TASK_RETRIEVAL} />
    </TechnicianShell>
  );
}
