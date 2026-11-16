import type { InferGetServerSidePropsType } from "next";
import { RepairCaseDetailScreen } from "@/components/features/repair-workflow/repair-case-detail-screen";
import { TechnicianShell } from "@/pages/technician/technician-shell";
import styles from "@/pages/technician/technician-shell.module.css";
import { PATH_TECHNICIAN } from "@/routes/path";
import { getServerSideProps } from "../[caseId].page";
export { getServerSideProps };

export default function TechnicianRepairRelatedPage({ caseId }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return <TechnicianShell pageTitle="Công việc liên quan & chứng từ"><div className={styles.pageContent}><RepairCaseDetailScreen caseId={caseId} role="technician" listHref={PATH_TECHNICIAN.TASKS} relatedOnly /></div></TechnicianShell>;
}
