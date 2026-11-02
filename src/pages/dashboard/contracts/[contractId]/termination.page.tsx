import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { ContractTerminationScreen } from "@/pages/contracts/termination/contract-termination-screen";
import { CustomerShell } from "@/pages/dashboard/customer-shell";
import { ContractIdSchema } from "@/schema/contracts.schema";
import { PATH_CUSTOMER } from "@/routes/path";

type Props = { contractId: string };

export const getServerSideProps: GetServerSideProps<Props> = async ({ params }) => {
  const contractId = params?.contractId;
  if (typeof contractId !== "string" || !ContractIdSchema.safeParse(contractId).success) return { notFound: true };
  return { props: { contractId } };
};

export default function CustomerContractTerminationPage({ contractId }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <CustomerShell pageTitle="Chấm dứt hợp đồng">
      <ContractTerminationScreen
        contractId={contractId}
        role="OWNER"
        backHref={PATH_CUSTOMER.CONTRACT_DETAIL(contractId)}
      />
    </CustomerShell>
  );
}
