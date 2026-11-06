import { ProfileSettingsScreen } from "@/components/profile-settings/profile-settings-screen";
import { MODERATOR_MESSAGES } from "@/text/moderator/moderator-messages";
import { ModeratorShell } from "../moderator-shell";

export default function ModeratorSettingsPage() {
  return (
    <ModeratorShell pageTitle={MODERATOR_MESSAGES.NAVIGATION.SETTINGS}>
      <ProfileSettingsScreen roleLabel={MODERATOR_MESSAGES.ROLE} />
    </ModeratorShell>
  );
}
