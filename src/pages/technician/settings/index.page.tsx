import { ProfileSettingsScreen } from "@/components/profile-settings/profile-settings-screen";
import { TECHNICIAN_MESSAGES } from "@/text/technician/technician-messages";
import { TechnicianShell } from "../technician-shell";

export default function TechnicianSettingsPage() {
  return (
    <TechnicianShell pageTitle={TECHNICIAN_MESSAGES.NAVIGATION.SETTINGS}>
      <ProfileSettingsScreen roleLabel={TECHNICIAN_MESSAGES.ROLE} />
    </TechnicianShell>
  );
}
