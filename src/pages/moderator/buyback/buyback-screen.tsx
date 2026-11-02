import { BuybackWorkflowScreen } from "@/components/features/buyback/buyback-workflow-screen";
import { PATH_MODERATOR } from "@/routes/path";

export function ModeratorBuybackScreen({ sectionPath }: { sectionPath: string }) {
  const isList = sectionPath === "buyback" || sectionPath === "buyback/list";
  const requestedId = isList ? "" : sectionPath.slice("buyback/".length);
  const caseId = isList ? undefined : requestedId;
  return <BuybackWorkflowScreen role="operator" operatorRole="MODERATOR" initialCaseId={caseId} listHref={PATH_MODERATOR.BUYBACK_LIST} />;
}
