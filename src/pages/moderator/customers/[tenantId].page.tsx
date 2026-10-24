import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { ModeratorReadScreen } from "../moderator-read-screens";
import { ModeratorShell } from "../moderator-shell";
import { MODERATOR_MESSAGES } from "@/text/moderator/moderator-messages";

interface TenantDetailPageProps {
  tenantId: string;
}

export const getServerSideProps: GetServerSideProps<TenantDetailPageProps> = async ({ params }) => {
  const tenantId = params?.tenantId;
  if (typeof tenantId !== "string") return { notFound: true };
  return { props: { tenantId } };
};

export default function ModeratorTenantDetailPage({
  tenantId,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <ModeratorShell pageTitle={MODERATOR_MESSAGES.NAVIGATION.CUSTOMERS}>
      <ModeratorReadScreen sectionPath={`customers/${tenantId}`} />
    </ModeratorShell>
  );
}
