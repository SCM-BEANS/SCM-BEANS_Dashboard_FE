import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { ModeratorReadScreen } from "../moderator-read-screens";
import { ModeratorShell } from "../moderator-shell";
import { MODERATOR_MESSAGES } from "@/text/moderator/moderator-messages";

interface CustomerProfileDetailPageProps {
  profileId: string;
}

export const getServerSideProps: GetServerSideProps<CustomerProfileDetailPageProps> = async ({ params }) => {
  const profileId = params?.profileId;
  if (typeof profileId !== "string") return { notFound: true };
  return { props: { profileId } };
};

export default function ModeratorCustomerProfileDetailPage({
  profileId,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <ModeratorShell pageTitle={MODERATOR_MESSAGES.NAVIGATION.CUSTOMERS}>
      <ModeratorReadScreen sectionPath={`customers/${profileId}`} />
    </ModeratorShell>
  );
}
