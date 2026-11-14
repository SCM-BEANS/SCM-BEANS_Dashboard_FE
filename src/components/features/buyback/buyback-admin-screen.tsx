import { BuybackOperatorScreen } from "./buyback-moderator-screen";
import { useRouter } from "next/router";
import { BuybackRequestDetailScreen } from "./buyback-request-detail-screen";

export function BuybackAdminScreen() {
  const router = useRouter();
  const caseId = typeof router.query.caseId === "string" ? router.query.caseId : "";
  if (caseId && router.query.view !== "work-order") return <BuybackRequestDetailScreen caseId={caseId} />;
  return <BuybackOperatorScreen operatorRole="ADMIN" listHref="/admin/buybacks" />;
}
