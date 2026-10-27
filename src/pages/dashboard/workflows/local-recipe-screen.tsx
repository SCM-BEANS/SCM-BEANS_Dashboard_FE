import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import type { BackButtonDestination } from "@/components/navigation/back-button";
import { recipesApi } from "@/apis/recipes.api";
import { CUSTOMER_MESSAGES } from "@/text/customer/customer-messages";
import styles from "../customer-shell.module.css";

const messages = CUSTOMER_MESSAGES.WORKFLOWS;

export function LocalRecipeForm({ back }: { back?: BackButtonDestination | null }) {
  const queryClient = useQueryClient();
  const [globalRecipeId, setGlobalRecipeId] = useState("");
  const [overridesText, setOverridesText] = useState("");
  const [validationError, setValidationError] = useState("");
  const globalRecipes = useQuery({
    queryKey: ["owner-global-recipes"],
    queryFn: ({ signal }) => recipesApi.listGlobal(signal),
  });
  const saveMutation = useMutation({
    mutationFn: (input: { globalRecipeId: string; dosageOverrides: string[] }) =>
      recipesApi.upsertLocal(input),
    onSuccess: async () => {
      setOverridesText("");
      setValidationError("");
      await queryClient.invalidateQueries({ queryKey: ["owner-local-recipes"] });
    },
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const dosageOverrides = overridesText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (!globalRecipeId || dosageOverrides.length === 0) {
      setValidationError(messages.LOCAL_RECIPE_ERROR);
      return;
    }
    setValidationError("");
    saveMutation.mutate({ globalRecipeId, dosageOverrides });
  };

  return (
    <section className={styles.pageContent} aria-labelledby="customer-workflow-title">
      <BackButtonHeading
        back={back ?? null}
        title={messages.MENU_ADD_DISH_TITLE}
        titleId="customer-workflow-title"
        description={messages.MENU_ADD_DISH_DESCRIPTION}
        className={styles.pageHeading}
      />
      <form className={styles.dataPanel} onSubmit={submit}>
        {globalRecipes.isPending ? <p className={styles.loadingNotice} role="status">{CUSTOMER_MESSAGES.READ_SCREENS.LOADING}</p> : null}
        {globalRecipes.isError ? <p className={styles.errorNotice} role="alert">{CUSTOMER_MESSAGES.READ_SCREENS.LOAD_ERROR}</p> : null}
        {!globalRecipes.isPending && !globalRecipes.isError && !globalRecipes.data?.length
          ? <p className={styles.emptyNotice} role="status">{messages.LOCAL_RECIPE_NO_GLOBAL}</p>
          : null}
        {globalRecipes.data?.length ? (
          <>
            <label className={styles.formField}>
              <span>{messages.LOCAL_RECIPE_SELECT_GLOBAL}</span>
              <select
                onChange={(event) => {
                  saveMutation.reset();
                  setGlobalRecipeId(event.target.value);
                }}
                required
                value={globalRecipeId}
              >
                <option value="">{messages.LOCAL_RECIPE_SELECT_GLOBAL}</option>
                {globalRecipes.data.map((recipe) => (
                  <option key={recipe.id} value={recipe.id}>{recipe.name}</option>
                ))}
              </select>
            </label>
            <label className={styles.formField}>
              <span>{messages.LOCAL_RECIPE_OVERRIDES}</span>
              <textarea
                onChange={(event) => {
                  saveMutation.reset();
                  setOverridesText(event.target.value);
                }}
                placeholder={messages.LOCAL_RECIPE_OVERRIDES_HINT}
                required
                rows={5}
                value={overridesText}
              />
            </label>
            {validationError ? <p className={styles.errorNotice} role="alert">{validationError}</p> : null}
            {saveMutation.isError ? <p className={styles.errorNotice} role="alert">{messages.LOCAL_RECIPE_ERROR}</p> : null}
            {saveMutation.isSuccess ? <p className={styles.successNotice} role="status">{messages.LOCAL_RECIPE_SUCCESS}</p> : null}
            <button className={styles.primaryButton} disabled={saveMutation.isPending} type="submit">
              {saveMutation.isPending ? messages.LOCAL_RECIPE_SAVING : messages.LOCAL_RECIPE_SAVE}
            </button>
          </>
        ) : null}
      </form>
    </section>
  );
}
