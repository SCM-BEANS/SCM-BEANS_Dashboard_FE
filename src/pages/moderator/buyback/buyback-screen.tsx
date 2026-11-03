import { BuybackModeratorScreen } from "@/components/features/buyback/buyback-moderator-screen";
import { PATH_MODERATOR } from "@/routes/path";

export function ModeratorBuybackScreen({ sectionPath }: { sectionPath: string }) {
  const isList = sectionPath === "buyback" || sectionPath === "buyback/list";
  const requestedId = isList ? "" : sectionPath.slice("buyback/".length);
  const caseId = isList ? undefined : requestedId;
  return <BuybackModeratorScreen caseId={caseId} listHref={PATH_MODERATOR.BUYBACK_LIST} />;
}
