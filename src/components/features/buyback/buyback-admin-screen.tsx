import { BuybackOperatorScreen } from "./buyback-moderator-screen";

export function BuybackAdminScreen() {
  return <BuybackOperatorScreen operatorRole="ADMIN" listHref="/admin/buybacks" />;
}
