import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { ContractTerminationScreen } from "@/pages/contracts/termination/contract-termination-screen";
import { AdminShell } from "@/pages/admin/admin-shell";
import { ContractIdSchema } from "@/schema/contracts.schema";
import { PATH_ADMIN } from "@/routes/path";

type Props = { contractId: string };

export const getServerSideProps: GetServerSideProps<Props> = async ({ params }) => {
  const contractId = params?.contractId;
  if (typeof contractId !== "string" || !ContractIdSchema.safeParse(contractId).success) return { notFound: true };
  return { props: { contractId } };
};

export default function AdminContractTerminationPage({ contractId }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <AdminShell>
      <ContractTerminationScreen
        contractId={contractId}
        role="ADMIN"
        backHref={PATH_ADMIN.CONTRACT_DETAIL(contractId)}
      />
    </AdminShell>
  );
}
