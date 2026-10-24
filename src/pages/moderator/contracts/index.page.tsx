import { ModeratorReadScreen } from "../moderator-read-screens";
import { ModeratorShell } from "../moderator-shell";
import { MODERATOR_MESSAGES } from "@/text/moderator/moderator-messages";

export default function ModeratorContractsPage() {
  return (
    <ModeratorShell pageTitle={MODERATOR_MESSAGES.NAVIGATION.CONTRACTS}>
      <ModeratorReadScreen sectionPath="contracts" />
    </ModeratorShell>
  );
}
