import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { ModeratorReadScreen } from "../moderator-read-screens";
import { ModeratorShell } from "../moderator-shell";
import { MODERATOR_MESSAGES } from "@/text/moderator/moderator-messages";

interface ContractDetailPageProps {
  contractId: string;
}

export const getServerSideProps: GetServerSideProps<ContractDetailPageProps> = async ({ params }) => {
  const contractId = params?.contractId;
  if (typeof contractId !== "string") return { notFound: true };
  return { props: { contractId } };
};

export default function ModeratorContractDetailPage({
  contractId,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <ModeratorShell pageTitle={MODERATOR_MESSAGES.NAVIGATION.CONTRACTS}>
      <ModeratorReadScreen sectionPath={`contracts/${contractId}`} />
    </ModeratorShell>
  );
}
