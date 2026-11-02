import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { RepairCaseDetailScreen } from "@/components/features/repair-workflow/repair-case-detail-screen";
import { PATH_TECHNICIAN } from "@/routes/path";
import { RepairCaseIdSchema } from "@/schema/machines.schema";
import { TechnicianShell } from "@/pages/technician/technician-shell";

type TechnicianRepairCasePageProps = { caseId: string };

export const getServerSideProps: GetServerSideProps<TechnicianRepairCasePageProps> = async ({ params }) => {
  const caseId = typeof params?.caseId === "string" ? params.caseId : "";
  if (!RepairCaseIdSchema.safeParse(caseId).success) return { notFound: true };
  return { props: { caseId } };
};

export default function TechnicianRepairCasePage({
  caseId,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <TechnicianShell pageTitle="Chi tiết hồ sơ sửa chữa">
      <RepairCaseDetailScreen caseId={caseId} role="technician" listHref={PATH_TECHNICIAN.TASKS} />
    </TechnicianShell>
  );
}
