import type { GetServerSideProps, InferGetServerSidePropsType } from "next";
import { Suspense } from "react";
import { AdminShell, adminStyles } from "@/pages/admin/admin-shell";
import {
  TechnicalOperationsScreen,
  type TechnicalScreenRoutes,
} from "@/components/features/repair-workflow/technical-operations-screen";
import { PATH_ADMIN } from "@/routes/path";
import { InstallationWorkOrderIdSchema } from "@/schema/installation-work-orders.schema";
import { MaintenanceRequestIdSchema, RepairCaseIdSchema } from "@/schema/machines.schema";
import { RepairCostReviewIdSchema } from "@/schema/repair-cost-reviews.schema";
import { ADMIN_MESSAGES } from "@/text/admin/admin-messages";

type AdminTechnicalRequestsPageProps = { sectionPath: string };

const routes: TechnicalScreenRoutes = {
  role: "admin",
  requests: PATH_ADMIN.TECHNICAL_REQUESTS,
  requestDetail: PATH_ADMIN.TECHNICAL_MAINTENANCE_REQUEST_DETAIL,
  requestAssign: PATH_ADMIN.TECHNICAL_MAINTENANCE_REQUEST_ASSIGN,
  contractDetail: PATH_ADMIN.CONTRACT_DETAIL,
  repairCaseDetail: PATH_ADMIN.TECHNICAL_REPAIR_CASE_DETAIL,
  machineDetail: PATH_ADMIN.MACHINE_DETAIL,
};

function isSupportedTechnicalRequestsSection(sectionPath: string): boolean {
  if (sectionPath === "" || sectionPath === "list" || sectionPath === "new" || sectionPath.startsWith("new/")) {
    return true;
  }

  const requestAssignment = /^requests\/([^/]+)\/assign$/.exec(sectionPath);
  if (requestAssignment) return MaintenanceRequestIdSchema.safeParse(requestAssignment[1]).success;

  const requestDetail = /^requests\/([^/]+)$/.exec(sectionPath);
  if (requestDetail) return MaintenanceRequestIdSchema.safeParse(requestDetail[1]).success;

  const repairCaseDetail = /^cases\/([^/]+)$/.exec(sectionPath);
  if (repairCaseDetail) return RepairCaseIdSchema.safeParse(repairCaseDetail[1]).success;

  const costReviewDetail = /^cost-reviews\/([^/]+)$/.exec(sectionPath);
  if (costReviewDetail) return RepairCostReviewIdSchema.safeParse(costReviewDetail[1]).success;

  return InstallationWorkOrderIdSchema.safeParse(sectionPath).success;
}

export const getServerSideProps: GetServerSideProps<AdminTechnicalRequestsPageProps> = async ({ params }) => {
  const sections = params?.sections;
  const sectionPath = Array.isArray(sections)
    ? sections.join("/")
    : typeof sections === "string"
      ? sections
      : "";

  if (!isSupportedTechnicalRequestsSection(sectionPath)) return { notFound: true };
  return { props: { sectionPath } };
};

export default function AdminTechnicalRequestsPage({
  sectionPath,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const path = sectionPath ? `technical-requests/${sectionPath}` : "technical-requests";

  return (
    <AdminShell>
      <Suspense fallback={
        <div className={adminStyles.pageContent}>
          <section className={adminStyles.panel} role="status">Đang tải yêu cầu kỹ thuật…</section>
        </div>
      }>
        <TechnicalOperationsScreen path={path} routes={routes} />
      </Suspense>
    </AdminShell>
  );
}
