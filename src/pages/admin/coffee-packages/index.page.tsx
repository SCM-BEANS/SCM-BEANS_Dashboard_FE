import { CoffeePackageOperatorScreen } from "@/components/features/coffee-packages/coffee-package-operator-screen";
import { AdminShell } from "../admin-shell";

export default function AdminCoffeePackagesPage() {
  return <AdminShell><CoffeePackageOperatorScreen role="ADMIN" /></AdminShell>;
}
