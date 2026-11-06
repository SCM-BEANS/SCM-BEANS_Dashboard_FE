import { ProfileSettingsScreen } from "@/components/profile-settings/profile-settings-screen";
import { CUSTOMER_MESSAGES } from "@/text/customer/customer-messages";
import { CustomerShell } from "../customer-shell";

export default function CustomerSettingsPage() {
  return (
    <CustomerShell pageTitle={CUSTOMER_MESSAGES.NAVIGATION.SETTINGS}>
      <ProfileSettingsScreen roleLabel={CUSTOMER_MESSAGES.ROLE} />
    </CustomerShell>
  );
}
