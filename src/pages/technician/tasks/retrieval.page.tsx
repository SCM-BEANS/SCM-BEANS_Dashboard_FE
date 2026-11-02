import { useRouter } from "next/router";
import { TechnicianShell } from "../technician-shell";
import { RecallWorkOrdersScreen } from "@/components/features/contract-termination/recall-work-orders-screen";
import { PATH_TECHNICIAN } from "@/routes/path";

export default function TechnicianRetrievalPage() {
  const router = useRouter();
  return (
    <TechnicianShell pageTitle="Thu hồi máy">
      <RecallWorkOrdersScreen
        role="technician"
        backHref={PATH_TECHNICIAN.TASKS}
        onOpen={(id) => void router.push(PATH_TECHNICIAN.TASK_RETRIEVAL_DETAIL(id))}
      />
    </TechnicianShell>
  );
}
