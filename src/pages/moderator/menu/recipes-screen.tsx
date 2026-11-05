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

  return (
    <div className={styles.pageContent}>
      <ModeratorPageHeading title="Menu & công thức dùng chung" description="Quản lý thư viện menu, tạo và cập nhật quy trình pha dùng chung của Dolores." />
      {!isList && !validId ? (
        <p className={styles.pendingNotice} role="status">{messages.INVALID_RECIPE_ID}</p>
      ) : (
        <RecipeManagementScreen
          role="operator"
          operatorRole="MODERATOR"
          showHeading={false}
          initialGlobalRecipeId={validId || undefined}
        />
      )}
    </div>
  );
}
