import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import type { BackButtonDestination } from "@/components/navigation/back-button";
import { LegacyRecipeOverrides } from "@/components/features/recipe-menus/legacy-recipe-overrides";
import styles from "../customer-shell.module.css";

// Compatibility entry only; new Owner recipes are created through the menu DSL screen.
export function LocalRecipeForm({ back }: { back?: BackButtonDestination | null }) {
  return <section className={styles.pageContent}>
    <BackButtonHeading title="Điều chỉnh định lượng cũ" titleId="customer-workflow-title" back={back ?? null}
      description="Duy trì các điều chỉnh tương thích đã có; menu và công thức riêng được quản lý trong Menu của tôi." />
    <LegacyRecipeOverrides role="OWNER" />
  </section>;
}
