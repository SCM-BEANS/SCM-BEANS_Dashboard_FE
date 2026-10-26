import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { recipesApi } from "@/apis/recipes.api";
import { GlobalRecipeIdSchema } from "@/schema/recipes.schema";
import { PATH_CUSTOMER } from "@/routes/path";
import { CUSTOMER_MESSAGES } from "@/text/customer/customer-messages";
import { QueryFeedback } from "../shared/customer-screen-common";
import styles from "../customer-shell.module.css";

const messages = CUSTOMER_MESSAGES.READ_SCREENS;

export function MenuScreen({ sectionPath }: { sectionPath: string }) {
  const candidate = sectionPath.startsWith("menu/") ? sectionPath.slice("menu/".length) : "";
  const recipeId = GlobalRecipeIdSchema.safeParse(candidate).success ? candidate : null;
  const isList = sectionPath === "menu";
  const globalList = useQuery({
    queryKey: ["owner-global-recipes"],
    queryFn: ({ signal }) => recipesApi.listGlobal(signal),
    enabled: isList,
  });
  const localList = useQuery({
    queryKey: ["owner-local-recipes"],
    queryFn: ({ signal }) => recipesApi.listLocal(signal),
    enabled: isList || Boolean(recipeId),
  });
  const globalDetail = useQuery({
    queryKey: ["owner-global-recipe", recipeId],
    queryFn: ({ signal }) => recipesApi.getGlobalById(recipeId!, signal),
    enabled: Boolean(recipeId),
  });

  return (
    <section className={styles.pageContent} aria-labelledby="customer-screen-title">
      <header className={styles.pageHeading}>
        <h1 id="customer-screen-title">{recipeId ? messages.RECIPE_DETAIL_TITLE : messages.MENU_TITLE}</h1>
        <p>{messages.MENU_DESCRIPTION}</p>
      </header>
      {recipeId ? (
        <>
          <QueryFeedback loading={globalDetail.isPending || localList.isPending} failed={globalDetail.isError || localList.isError} empty={!globalDetail.data} emptyText={messages.NO_RECIPES} />
          {globalDetail.data ? (
            <div className={styles.dataPanel}>
              <h2>{globalDetail.data.name}</h2>
              <p>{messages.RECIPE_STEPS}</p>
              <ol className={styles.recipeSteps}>
                {globalDetail.data.steps.map((step, index) => <li key={index}>{step}</li>)}
              </ol>
              <h3>{messages.RECIPE_DOSAGE}</h3>
              <ul className={styles.recipeSteps}>
                {globalDetail.data.dosageBounds.map((bound, index) => <li key={index}>{bound}</li>)}
              </ul>
              <h3>{messages.LOCAL_CONFIGURATION}</h3>
              {localList.data?.find((recipe) => recipe.globalRecipeId === recipeId)?.dosageOverrides.length ? (
                <ul className={styles.recipeSteps}>
                  {localList.data.find((recipe) => recipe.globalRecipeId === recipeId)!.dosageOverrides.map((override, index) => <li key={index}>{override}</li>)}
                </ul>
              ) : <p>{messages.NO_LOCAL_CONFIGURATION}</p>}
            </div>
          ) : null}
          <Link className={styles.secondaryLink} href={PATH_CUSTOMER.MENU}>{messages.BACK_TO_LIST}</Link>
        </>
      ) : (
        <>
          <Link className={styles.primaryButton} href={PATH_CUSTOMER.MENU_ADD_DISH}>
            {CUSTOMER_MESSAGES.WORKFLOWS.MENU_ADD_DISH_TITLE}
          </Link>
          <QueryFeedback loading={globalList.isPending || localList.isPending} failed={globalList.isError || localList.isError} empty={!globalList.data?.length} emptyText={messages.NO_RECIPES} />
          {globalList.data?.length ? (
            <div className={styles.recordList}>
              {globalList.data.map((recipe) => {
                const local = localList.data?.find((item) => item.globalRecipeId === recipe.id);
                return (
                  <article className={styles.recordCard} key={recipe.id}>
                    <div>
                      <h2>{recipe.name}</h2>
                      <p>{messages.RECIPE_STEPS_COUNT}: {recipe.steps.length}</p>
                      <p>{local ? messages.LOCAL_RECIPE_CONFIGURED : messages.GLOBAL_RECIPE_ONLY}</p>
                    </div>
                    <Link className={styles.secondaryLink} href={PATH_CUSTOMER.MENU_RECIPE(recipe.id)}>{messages.VIEW_DETAILS}</Link>
                  </article>
                );
              })}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
