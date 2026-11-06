import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { isSupportedCustomerSection } from "@/routes/routes";
import { CustomerShell } from "./customer-shell";
import { CustomerReadScreen } from "./read/customer-read-screen";
import { getCustomerScreenDescriptor } from "./read/customer-read-descriptor";
import { CustomerWorkflowScreen } from "./workflows/customer-workflow-screen";
import { getCustomerWorkflowDescriptor } from "./workflows/customer-workflow-descriptor";
import { CoffeePackageOwnerScreen } from "@/components/features/coffee-packages/coffee-package-owner-screen";
import { PATH_CUSTOMER } from "@/routes/path";
import { CUSTOMER_MESSAGES } from "@/text/customer/customer-messages";

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

  const menuAliases: Record<string, string> = {
    "menu/sent": PATH_CUSTOMER.MENU_SYNC,
    "menu/applied": PATH_CUSTOMER.MENU_SYNC,
    "menu/espresso": PATH_CUSTOMER.MENU_ADJUSTMENTS,
    "menu/fresh-milk": PATH_CUSTOMER.MENU_ADJUSTMENTS,
  };
  if (menuAliases[sectionPath]) return { redirect: { destination: menuAliases[sectionPath], permanent: false } };

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
  const isCoffeePackages = sectionPath === "coffee-packages";

  return (
    <CustomerShell pageTitle={isCoffeePackages ? CUSTOMER_MESSAGES.NAVIGATION.COFFEE_PACKAGES : workflow?.title ?? readScreen.title}>
      {isCoffeePackages
        ? <CoffeePackageOwnerScreen />
        : workflow
        ? <CustomerWorkflowScreen sectionPath={sectionPath} />
        : <CustomerReadScreen sectionPath={sectionPath} />}
    </CustomerShell>
  );
}
