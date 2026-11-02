import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { ContractTerminationScreen } from "@/pages/contracts/termination/contract-termination-screen";
import { ModeratorShell } from "@/pages/moderator/moderator-shell";
import { ContractIdSchema } from "@/schema/contracts.schema";
import { PATH_MODERATOR } from "@/routes/path";
import { MODERATOR_MESSAGES } from "@/text/moderator/moderator-messages";

type Props = { contractId: string };

export const getServerSideProps: GetServerSideProps<Props> = async ({ params }) => {
  const contractId = params?.contractId;
  if (typeof contractId !== "string" || !ContractIdSchema.safeParse(contractId).success) return { notFound: true };
  return { props: { contractId } };
};

export default function ModeratorContractTerminationPage({ contractId }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <ModeratorShell pageTitle={MODERATOR_MESSAGES.NAVIGATION.CONTRACTS}>
      <ContractTerminationScreen
        contractId={contractId}
        role="MODERATOR"
        backHref={PATH_MODERATOR.CONTRACT_DETAIL(contractId)}
      />
    </ModeratorShell>
  );
}
