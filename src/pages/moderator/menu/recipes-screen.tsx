import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useEffect, useState, type FormEvent } from "react";

import Link from "next/link";

import { recipesApi } from "@/apis/recipes.api";

import { PATH_MODERATOR } from "@/routes/path";
import { ModeratorPageHeading } from "../moderator-page-heading";

import { GlobalRecipeIdSchema, type GlobalRecipe, type GlobalRecipeSummary } from "@/schema/recipes.schema";

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

function RecipeList({ recipes }: { recipes: GlobalRecipeSummary[] }) {
  if (recipes.length === 0) {
    return <p className={styles.pendingNotice} role="status">{messages.EMPTY_RECIPES}</p>;
  }
  return (
    <DataTable variant="moderator" headers={[messages.RECIPE_NAME, messages.RECIPE_ID, "Phiên bản"]}>
      {recipes.map((recipe) => (
        <tr key={recipe.id}>
          <td><Link className={styles.tableLink} href={PATH_MODERATOR.MENU_RECIPE_DETAIL(recipe.id)}>{recipe.name}</Link></td>
          <td>{recipe.id}</td>
          <td>{recipe.revision}</td>
        </tr>
      ))}
    </DataTable>
  );
}

function RecipeCreateForm() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [steps, setSteps] = useState("");
  const [dosageBounds, setDosageBounds] = useState("");
  const [createdRecipe, setCreatedRecipe] = useState<GlobalRecipe | null>(null);
  const create = useMutation({
    mutationFn: () => recipesApi.publishGlobal({
      name,
      steps: steps.split(/\r?\n/).map((step) => step.trim()).filter(Boolean),
      dosageBounds: dosageBounds.split(/\r?\n/).map((bound) => bound.trim()).filter(Boolean),
    }),
    onSuccess: async (recipe) => {
      setCreatedRecipe(recipe);
      await queryClient.invalidateQueries({ queryKey: ["dolores", "moderator", "recipes", "global"] });
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    create.mutate();
  }

  return (
    <section className={styles.pendingNotice} aria-labelledby="moderator-recipe-create-title">
      <h2 id="moderator-recipe-create-title" className={styles.sectionTitle}>Thêm công thức dùng chung</h2>
      {createdRecipe ? (
        <p role="status">Đã tạo “{createdRecipe.name}”. <Link className={styles.tableLink} href={PATH_MODERATOR.MENU_RECIPE_DETAIL(createdRecipe.id)}>Mở công thức</Link></p>
      ) : (
        <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
          <label htmlFor="moderator-recipe-create-name">{messages.RECIPE_EDIT_NAME}</label>
          <input id="moderator-recipe-create-name" value={name} maxLength={160} required disabled={create.isPending} onChange={(event) => setName(event.target.value)} />
          <label htmlFor="moderator-recipe-create-steps">{messages.RECIPE_EDIT_STEPS}</label>
          <textarea id="moderator-recipe-create-steps" rows={5} required value={steps} disabled={create.isPending} onChange={(event) => setSteps(event.target.value)} />
          <label htmlFor="moderator-recipe-create-dosage">{messages.RECIPE_EDIT_DOSAGE}</label>
          <textarea id="moderator-recipe-create-dosage" rows={4} required value={dosageBounds} disabled={create.isPending} onChange={(event) => setDosageBounds(event.target.value)} />
          <button className={styles.retryButton} type="submit" disabled={create.isPending || !name.trim() || !steps.trim() || !dosageBounds.trim()}>
            {create.isPending ? messages.RECIPE_SAVING : "Tạo công thức"}
          </button>
          {create.isError && <p role="alert">{getApiErrorMessage(create.error)}</p>}
        </form>
      )}
    </section>
  );
}

function RecipeDetails({ recipe }: { recipe: GlobalRecipe }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(recipe.name);
  const [steps, setSteps] = useState(recipe.steps.join("\n"));
  const [dosageBounds, setDosageBounds] = useState(recipe.dosageBounds.join("\n"));
  const update = useMutation({
    mutationFn: () => recipesApi.updateGlobal(recipe.id, {
      name,
      steps: steps.split(/\r?\n/).map((step) => step.trim()).filter(Boolean),
      dosageBounds: dosageBounds.split(/\r?\n/).map((bound) => bound.trim()).filter(Boolean),
    }),
    onSuccess: async () => {
      setEditing(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dolores", "moderator", "recipes", "global"] }),
        queryClient.invalidateQueries({ queryKey: ["dolores", "moderator", "recipes", "global", recipe.id] }),
      ]);
    },
  });

  useEffect(() => {
    setName(recipe.name);
    setSteps(recipe.steps.join("\n"));
    setDosageBounds(recipe.dosageBounds.join("\n"));
  }, [recipe.id, recipe.name, recipe.steps, recipe.dosageBounds]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    update.mutate();
  }

  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {!editing && (
          <button className={styles.retryButton} type="button" onClick={() => setEditing(true)}>
            {messages.RECIPE_EDIT}
          </button>
        )}
      </div>
      {editing && (
        <form className={styles.pendingNotice} onSubmit={submit} style={{ display: "grid", gap: 12 }}>
          <label htmlFor="moderator-recipe-name">{messages.RECIPE_EDIT_NAME}</label>
          <input id="moderator-recipe-name" value={name} maxLength={160} required disabled={update.isPending} onChange={(event) => setName(event.target.value)} />
          <label htmlFor="moderator-recipe-steps">{messages.RECIPE_EDIT_STEPS}</label>
          <textarea id="moderator-recipe-steps" rows={5} required value={steps} disabled={update.isPending} onChange={(event) => setSteps(event.target.value)} />
          <label htmlFor="moderator-recipe-dosage">{messages.RECIPE_EDIT_DOSAGE}</label>
          <textarea id="moderator-recipe-dosage" rows={4} required value={dosageBounds} disabled={update.isPending} onChange={(event) => setDosageBounds(event.target.value)} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button className={styles.retryButton} type="submit" disabled={update.isPending || !name.trim() || !steps.trim() || !dosageBounds.trim()}>
              {update.isPending ? messages.RECIPE_SAVING : messages.RECIPE_SAVE}
            </button>
            <button className={styles.retryButton} type="button" disabled={update.isPending} onClick={() => setEditing(false)}>
              {messages.RECIPE_CANCEL_EDIT}
            </button>
          </div>
          {update.isError && <p role="alert">{getApiErrorMessage(update.error)}</p>}
        </form>
      )}
      {update.isSuccess && !editing && <p className={styles.pendingNotice} role="status">{messages.RECIPE_UPDATE_SUCCESS}</p>}
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
  const isCreate = sectionPath === "menu/new";
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
      <ModeratorPageHeading title={messages.RECIPES_TITLE} description={messages.RECIPES_DESCRIPTION} />
      <p className={styles.partialNotice} role="note">{messages.RECIPE_UPDATE_SCOPE}</p>
      {isCreate ? (
        <RecipeCreateForm />
      ) : isList ? (
        <>
          <QueryFeedback query={recipes} loadingMessage={messages.LOADING_RECIPES} />
          {recipes.data && !recipes.isError && <RecipeList recipes={recipes.data} />}
        </>
      ) : validId ? (
        <>
          <QueryFeedback query={recipe} loadingMessage={messages.LOADING_RECIPE} />
          {recipe.data && !recipe.isError && <RecipeDetails recipe={recipe.data} />}
        </>
      ) : (
        <p className={styles.pendingNotice} role="status">{messages.INVALID_RECIPE_ID}</p>
      )}
    </div>
  );
}
