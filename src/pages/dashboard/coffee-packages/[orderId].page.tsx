import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { CoffeePackageOwnerOrderDetailScreen } from "@/components/features/coffee-packages/coffee-package-owner-order-detail-screen";
import { CustomerShell } from "../customer-shell";
import { CoffeePackageOrderIdSchema } from "@/schema/coffee-packages.schema";

type Props = { orderId: string };

export const getServerSideProps: GetServerSideProps<Props> = async ({ params }) => {
  const parsed = CoffeePackageOrderIdSchema.safeParse(params?.orderId);
  if (!parsed.success) return { notFound: true };
  return { props: { orderId: parsed.data } };
};

export default function CustomerCoffeePackageOrderDetailPage({ orderId }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <CustomerShell pageTitle="Chi tiết đơn gói cà phê">
      <CoffeePackageOwnerOrderDetailScreen orderId={orderId} />
    </CustomerShell>
  );
}
