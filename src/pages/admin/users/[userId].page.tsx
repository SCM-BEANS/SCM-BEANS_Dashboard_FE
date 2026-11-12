import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { AdminUserIdSchema } from "@/schema/admin-users.schema";
import AdminUsersPage from "./index.page";

export const getServerSideProps: GetServerSideProps<{ detailUserId: string }> = async ({ params }) => {
  const id = AdminUserIdSchema.safeParse(params?.userId);
  return id.success ? { props: { detailUserId: id.data } } : { notFound: true };
};

export default function AdminUserDetailPage({ detailUserId }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return <AdminUsersPage detailUserId={detailUserId} />;
}
