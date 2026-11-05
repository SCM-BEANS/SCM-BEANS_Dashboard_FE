import { CoffeePackageOwnerScreen } from "@/components/features/coffee-packages/coffee-package-owner-screen";
import { CustomerShell } from "../customer-shell";

export default function CustomerCoffeePackagesPage() {
  return <CustomerShell pageTitle="Gói cà phê"><CoffeePackageOwnerScreen /></CustomerShell>;
}
