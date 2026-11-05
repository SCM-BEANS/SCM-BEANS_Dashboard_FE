import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { BuybackTechnicianScreen } from "@/components/features/buyback/buyback-technician-screen";
import { TechnicianShell } from "@/pages/technician/technician-shell";
import { BuybackIdSchema } from "@/schema/buybacks.schema";

type TechnicianBuybackAssessmentPageProps = { caseId: string };

export const getServerSideProps: GetServerSideProps<TechnicianBuybackAssessmentPageProps> = async ({ params }) => {
  const caseId = typeof params?.caseId === "string" ? params.caseId : "";
  if (!BuybackIdSchema.safeParse(caseId).success) return { notFound: true };
  return { props: { caseId } };
};

export default function TechnicianBuybackAssessmentDetailPage({
  caseId,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <TechnicianShell pageTitle="Đánh giá máy thu mua">
      <BuybackTechnicianScreen caseId={caseId} />
    </TechnicianShell>
  );
}
