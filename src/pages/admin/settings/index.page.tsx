import { ProfileSettingsScreen } from "@/components/profile-settings/profile-settings-screen";
import { ADMIN_MESSAGES } from "@/text/admin/admin-messages";
import { AdminShell } from "../admin-shell";

export default function AdminSettingsPage() {
  return (
    <AdminShell>
      <ProfileSettingsScreen roleLabel={ADMIN_MESSAGES.ROLE} />
    </AdminShell>
  );
}
