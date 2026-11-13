import { RecipeSyncPanel } from "@/components/features/recipe-menus/recipe-sync-panel";
import { OwnerMenuHeader } from "./menu-screen";
import styles from "@/components/features/repair-workflow/repair-workflow.module.css";
import pageStyles from "../customer-shell.module.css";

export function OwnerRecipeSyncScreen() {
  return <section className={pageStyles.pageContent + " " + styles.ownerRecipePage} data-recipe-layout>
    <OwnerMenuHeader active="sync" />
    <RecipeSyncPanel role="OWNER" />
  </section>;
}
