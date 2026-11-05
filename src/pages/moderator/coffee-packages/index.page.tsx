import { CoffeePackageOperatorScreen } from "@/components/features/coffee-packages/coffee-package-operator-screen";
import { MODERATOR_MESSAGES } from "@/text/moderator/moderator-messages";
import { ModeratorShell } from "../moderator-shell";

export default function ModeratorCoffeePackagesPage() {
  return (
    <ModeratorShell pageTitle={MODERATOR_MESSAGES.NAVIGATION.COFFEE_PACKAGES}>
      <CoffeePackageOperatorScreen role="MODERATOR" />
    </ModeratorShell>
  );
}
