import { RecipeManagementScreen } from "@/components/features/recipe-menus/recipe-menus-screen";
import { GlobalRecipeIdSchema } from "@/schema/recipes.schema";
import { MODERATOR_MESSAGES } from "@/text/moderator/moderator-messages";
import { moderatorStyles as styles } from "../moderator-shell";
import { ModeratorPageHeading } from "../moderator-page-heading";

const messages = MODERATOR_MESSAGES.READ_SCREENS;

export function ModeratorRecipesScreen({ sectionPath }: { sectionPath: string }) {
  const isList = sectionPath === "menu";
  const requestedId = isList ? "" : sectionPath.slice("menu/".length);
  const validId = GlobalRecipeIdSchema.safeParse(requestedId).success ? requestedId : "";

  if (!isList && !validId) return <div className={styles.pageContent}>
    <ModeratorPageHeading title="Công thức pha chế" />
    <p className={styles.pendingNotice} role="status">{messages.INVALID_RECIPE_ID}</p>
  </div>;

  return <RecipeManagementScreen
    role="operator"
    operatorRole="MODERATOR"
    initialGlobalRecipeId={validId || undefined}
  />;
}
