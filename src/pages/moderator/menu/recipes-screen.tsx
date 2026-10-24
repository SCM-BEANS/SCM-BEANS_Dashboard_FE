import { useQuery } from "@tanstack/react-query";

import Link from "next/link";

import { recipesApi } from "@/apis/recipes.api";

import { PATH_MODERATOR } from "@/routes/path";

import { GlobalRecipeIdSchema, type GlobalRecipe } from "@/schema/recipes.schema";

import { getApiErrorMessage } from "@/lib/api-errors";

import { DataTable } from "@/components/table/data-table";

import { MODERATOR_MESSAGES } from "@/text/moderator/moderator-messages";

import { moderatorStyles as styles } from "../moderator-shell";

const messages = MODERATOR_MESSAGES.READ_SCREENS;

function QueryFeedback({
  query,
  loadingMessage,
}: {
  query: {
    isPending: boolean;
    isError: boolean;
    error: unknown;
    refetch: () => unknown;
  };
  loadingMessage: string;
}) {
  if (query.isPending) {
    return <p className={styles.pendingNotice} role="status">{loadingMessage}</p>;
  }
  if (query.isError) {
    return (
      <div className={styles.pendingNotice} role="alert">
        <p>{getApiErrorMessage(query.error)}</p>
        <button className={styles.retryButton} type="button" onClick={() => void query.refetch()}>
          {messages.RETRY}
        </button>
      </div>
    );
  }
  return null;
}

function DetailField({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className={styles.detailItem}>
      <dt>{label}</dt>
      <dd>{value == null || value === "" ? "—" : value}</dd>
    </div>
  );
}

function RecipeList({ recipes }: { recipes: GlobalRecipe[] }) {
  if (recipes.length === 0) {
    return <p className={styles.pendingNotice} role="status">{messages.EMPTY_RECIPES}</p>;
  }
  return (
    <DataTable variant="moderator" headers={[messages.RECIPE_NAME, messages.RECIPE_ID, messages.RECIPE_STEP_COUNT]}>
      {recipes.map((recipe) => (
        <tr key={recipe.id}>
          <td><Link className={styles.tableLink} href={PATH_MODERATOR.MENU_RECIPE_DETAIL(recipe.id)}>{recipe.name}</Link></td>
          <td>{recipe.id}</td>
          <td>{recipe.steps.length}</td>
        </tr>
      ))}
    </DataTable>
  );
}

function RecipeDetails({ recipe }: { recipe: GlobalRecipe }) {
  return (
    <>
      <dl className={styles.detailGrid}>
        <DetailField label={messages.RECIPE_ID} value={recipe.id} />
        <DetailField label={messages.RECIPE_NAME} value={recipe.name} />
      </dl>
      <section className={styles.pendingNotice} aria-label={messages.RECIPE_STEPS}>
        <h2 className={styles.sectionTitle}>{messages.RECIPE_STEPS}</h2>
        <ol>{recipe.steps.map((step, index) => <li key={index}>{step}</li>)}</ol>
      </section>
      <section className={styles.pendingNotice} aria-label={messages.RECIPE_DOSAGE}>
        <h2 className={styles.sectionTitle}>{messages.RECIPE_DOSAGE}</h2>
        <ul>{recipe.dosageBounds.map((bound, index) => <li key={index}>{bound}</li>)}</ul>
      </section>
    </>
  );
}

export function ModeratorRecipesScreen({ sectionPath }: { sectionPath: string }) {
  const isList = sectionPath === "menu";
  const requestedId = isList ? "" : sectionPath.slice("menu/".length);
  const validId = GlobalRecipeIdSchema.safeParse(requestedId).success ? requestedId : "";
  const recipes = useQuery({
    queryKey: ["dolores", "moderator", "recipes", "global"],
    queryFn: ({ signal }) => recipesApi.listGlobal(signal),
    enabled: isList,
  });
  const recipe = useQuery({
    queryKey: ["dolores", "moderator", "recipes", "global", validId],
    queryFn: ({ signal }) => recipesApi.getGlobalById(validId, signal),
    enabled: Boolean(validId),
  });

  return (
    <div className={styles.pageContent}>
      <header className={styles.pageHeading}>
        <h1>{messages.RECIPES_TITLE}</h1>
        <p>{messages.RECIPES_DESCRIPTION}</p>
      </header>
      <p className={styles.partialNotice} role="note">{messages.RECIPE_READ_ONLY}</p>
      {isList ? (
        <>
          <QueryFeedback query={recipes} loadingMessage={messages.LOADING_RECIPES} />
          {recipes.data && !recipes.isError && <RecipeList recipes={recipes.data} />}
        </>
      ) : validId ? (
        <>
          <QueryFeedback query={recipe} loadingMessage={messages.LOADING_RECIPE} />
          {recipe.data && !recipe.isError && <RecipeDetails recipe={recipe.data} />}
          <Link className={styles.tableLink} href={PATH_MODERATOR.MENU}>{messages.BACK_TO_RECIPES}</Link>
        </>
      ) : (
        <p className={styles.pendingNotice} role="status">{messages.INVALID_RECIPE_ID}</p>
      )}
    </div>
  );
}
