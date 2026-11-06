import { RecipeSyncPanel } from "@/components/features/recipe-menus/recipe-sync-panel";
import { OwnerMenuHeader } from "./menu-screen";
import pageStyles from "../customer-shell.module.css";

export function OwnerRecipeSyncScreen() {
  return <section className={pageStyles.pageContent}>
    <OwnerMenuHeader active="sync" />
    <RecipeSyncPanel role="OWNER" />
  </section>;
}
