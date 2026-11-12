import {
  TechnicalOperationsScreen,
  type TechnicalScreenRoutes,
} from "@/components/features/repair-workflow/technical-operations-screen";
import { PATH_MODERATOR } from "@/routes/path";

const routes: TechnicalScreenRoutes = {
  role: "moderator",
  requests: PATH_MODERATOR.TECHNICAL_REQUESTS,
  requestDetail: PATH_MODERATOR.TECHNICAL_MAINTENANCE_REQUEST_DETAIL,
  requestAssign: PATH_MODERATOR.TECHNICAL_MAINTENANCE_REQUEST_ASSIGN,
  contractDetail: PATH_MODERATOR.CONTRACT_DETAIL,
  repairCaseDetail: PATH_MODERATOR.TECHNICAL_REPAIR_CASE_DETAIL,
  machineDetail: PATH_MODERATOR.MACHINE_DETAIL,
};

export function ModeratorTechnicalScreen({ path }: { path: string }) {
  return <TechnicalOperationsScreen path={path} routes={routes} />;
}
