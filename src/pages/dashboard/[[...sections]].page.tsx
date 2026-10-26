import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { isSupportedCustomerSection } from "@/routes/routes";
import { CustomerShell } from "./customer-shell";
import { CustomerReadScreen } from "./read/customer-read-screen";
import { getCustomerScreenDescriptor } from "./read/customer-read-descriptor";
import { CustomerWorkflowScreen } from "./workflows/customer-workflow-screen";
import { getCustomerWorkflowDescriptor } from "./workflows/customer-workflow-descriptor";

interface CustomerPageProps {
  sectionPath: string;
}

export const getServerSideProps: GetServerSideProps<CustomerPageProps> = async ({ params }) => {
  const sections = params?.sections;
  const sectionPath = Array.isArray(sections)
    ? sections.join("/")
    : typeof sections === "string"
      ? sections
      : "";

  if (!isSupportedCustomerSection(sectionPath)) {
    return { notFound: true };
  }

  return { props: { sectionPath } };
};

export default function CustomerRoutePage({
  sectionPath,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const workflow = getCustomerWorkflowDescriptor(sectionPath);
  const readScreen = getCustomerScreenDescriptor(sectionPath);

  return (
    <CustomerShell pageTitle={workflow?.title ?? readScreen.title}>
      {workflow
        ? <CustomerWorkflowScreen sectionPath={sectionPath} />
        : <CustomerReadScreen sectionPath={sectionPath} />}
    </CustomerShell>
  );
}
