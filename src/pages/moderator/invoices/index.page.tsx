import { MODERATOR_MESSAGES } from "@/text/moderator/moderator-messages";
import { ModeratorShell } from "../moderator-shell";
import { ModeratorInvoiceListScreen } from "./invoice-list-screen";

export default function ModeratorInvoicesPage() {
  return (
    <ModeratorShell pageTitle={MODERATOR_MESSAGES.NAVIGATION.INVOICES}>
      <ModeratorInvoiceListScreen />
    </ModeratorShell>
  );
}
