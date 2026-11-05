import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { CoffeePackageOperatorOrderDetailScreen } from "@/components/features/coffee-packages/coffee-package-operator-order-detail-screen";
import { CoffeePackageOrderIdSchema } from "@/schema/coffee-packages.schema";
import { MODERATOR_MESSAGES } from "@/text/moderator/moderator-messages";
import { ModeratorShell } from "../moderator-shell";

type Props = { orderId: string };

export const getServerSideProps: GetServerSideProps<Props> = async ({ params }) => {
  const parsed = CoffeePackageOrderIdSchema.safeParse(params?.orderId);
  if (!parsed.success) return { notFound: true };
  return { props: { orderId: parsed.data } };
};

export default function ModeratorCoffeePackageOrderDetailPage({
  orderId,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <ModeratorShell pageTitle={MODERATOR_MESSAGES.NAVIGATION.COFFEE_PACKAGES}>
      <CoffeePackageOperatorOrderDetailScreen role="MODERATOR" orderId={orderId} />
    </ModeratorShell>
  );
}
