import type { GetServerSideProps } from "next";
import { DevQuickLoginControls } from "@/components/dev-quick-login-controls";

export const getServerSideProps: GetServerSideProps = async () => {
  if (process.env.NODE_ENV !== "development") return { notFound: true };
  return { props: {} };
};

export default function QuickLoginPage() {
  return <DevQuickLoginControls />;
}
