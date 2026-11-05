import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { CoffeePackageOperatorOrderDetailScreen } from "@/components/features/coffee-packages/coffee-package-operator-order-detail-screen";
import { CoffeePackageOrderIdSchema } from "@/schema/coffee-packages.schema";
import { AdminShell } from "../admin-shell";

type Props = { orderId: string };

export const getServerSideProps: GetServerSideProps<Props> = async ({ params }) => {
  const parsed = CoffeePackageOrderIdSchema.safeParse(params?.orderId);
  if (!parsed.success) return { notFound: true };
  return { props: { orderId: parsed.data } };
};

export default function AdminCoffeePackageOrderDetailPage({
  orderId,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <AdminShell>
      <CoffeePackageOperatorOrderDetailScreen role="ADMIN" orderId={orderId} />
    </AdminShell>
  );
}
