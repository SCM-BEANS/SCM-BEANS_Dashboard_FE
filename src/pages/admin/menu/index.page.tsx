import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { useState, type FormEvent } from "react";
import { recipesApi } from "@/apis/recipes.api";
import { getApiErrorMessage } from "@/lib/api-errors";
import { DataTable } from "@/components/table/data-table";
import { PATH_ADMIN } from "@/routes/path";
import { ButtonBar } from "@/components/button/button-bar";
import { NotificationDialog } from "@/components/notification-dialog/notification-dialog";
import {
  RecipePublishRequestSchema,
  type RecipePublishRequest,
} from "@/schema/recipes.schema";
import { ADMIN_MESSAGES } from "@/text/admin/admin-messages";
import { ActionBar } from "@/components/action-bar/action-bar";
import { AdminShell, adminStyles as styles } from "../admin-shell";

const RECIPE_QUERY_KEY = ["dolores", "recipes", "global"] as const;
const EMPTY_DRAFT = { name: "", steps: "", dosageBounds: "" };

const textareaStyle = {
  width: "100%",
  minHeight: 96,
  padding: 12,
  border: "1px solid #e9e2dc",
  borderRadius: 10,
  background: "white",
  color: "#302927",
  font: "inherit",
} as const;

function MenuContent() {
  const router = useRouter();
  const view = typeof router.query.view === "string" ? router.query.view : "list";
  const isCreateView = view === "create";
  const queryClient = useQueryClient();
  const recipes = useQuery({
    queryKey: RECIPE_QUERY_KEY,
    queryFn: ({ signal }) => recipesApi.listGlobal(signal),
    enabled: !isCreateView,
  });
  const [selectedRecipeId, setSelectedRecipeId] = useState("");
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [pendingPublish, setPendingPublish] = useState<RecipePublishRequest | null>(null);
  const [formError, setFormError] = useState("");
  const [publishedRecipeName, setPublishedRecipeName] = useState("");

  const selectedRecipeIdValue = isCreateView ? "" : selectedRecipeId || recipes.data?.[0]?.id || "";
  const recipe = useQuery({
    queryKey: [...RECIPE_QUERY_KEY, selectedRecipeIdValue],
    queryFn: ({ signal }) => recipesApi.getGlobalById(selectedRecipeIdValue, signal),
    enabled: !isCreateView && Boolean(selectedRecipeIdValue),
  });

  const publish = useMutation({
    mutationFn: (input: RecipePublishRequest) => recipesApi.publishGlobal(input),
    onSuccess: (publishedRecipe) => {
      void Promise.allSettled([queryClient.invalidateQueries({ queryKey: RECIPE_QUERY_KEY })]);
      setSelectedRecipeId(publishedRecipe.id);
      setPendingPublish(null);
      setDraft(EMPTY_DRAFT);
      setFormError("");
      setPublishedRecipeName(publishedRecipe.name);
      void router.push(PATH_ADMIN.MENU, undefined, { shallow: true });
    },
  });

  const submitDraft = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPublishedRecipeName("");
    publish.reset();
    const input = RecipePublishRequestSchema.safeParse({
      name: draft.name,
      steps: draft.steps.split(/\r?\n/).map((value) => value.trim()).filter(Boolean),
      dosageBounds: draft.dosageBounds.split(/\r?\n/).map((value) => value.trim()).filter(Boolean),
    });
    if (!input.success) {
      setFormError(ADMIN_MESSAGES.MENU.INVALID);
      return;
    }
    setFormError("");
    setPendingPublish(input.data);
  };

  const navigateToList = () => void router.push(PATH_ADMIN.MENU, undefined, { shallow: true });
  const navigateToCreate = () => {
    setDraft(EMPTY_DRAFT);
    setFormError("");
    setPublishedRecipeName("");
    publish.reset();
    void router.push({ pathname: PATH_ADMIN.MENU, query: { view: "create" } }, undefined, { shallow: true });
  };

  const recipeError = recipe.isError ? getApiErrorMessage(recipe.error) : "";

  return (
    <>
    <div className={styles.pageContent}>
      <div className={styles.pageHeading}>
        <h1>{isCreateView ? ADMIN_MESSAGES.MENU.CREATE : ADMIN_MESSAGES.MENU.TITLE}</h1>
        <p>{isCreateView ? ADMIN_MESSAGES.MENU.CREATE_DESCRIPTION : ADMIN_MESSAGES.MENU.DESCRIPTION}</p>
      </div>
      {isCreateView ? (
        <form id="global-recipe-form" className={`${styles.panel} ${styles.contractForm}`} onSubmit={submitDraft}>
          <h2>{ADMIN_MESSAGES.MENU.CREATE_FORM_TITLE}</h2>
          <div className={styles.operationsGrid}>
            <label>
              {ADMIN_MESSAGES.MENU.NAME} *
              <input
                required
                maxLength={160}
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              />
            </label>
            <label>
              {ADMIN_MESSAGES.MENU.STEPS} *
              <textarea
                required
                value={draft.steps}
                style={textareaStyle}
                onChange={(event) => setDraft({ ...draft, steps: event.target.value })}
              />
            </label>
            <label>
              {ADMIN_MESSAGES.MENU.DOSAGE_BOUNDS} *
              <textarea
                required
                value={draft.dosageBounds}
                style={textareaStyle}
                onChange={(event) => setDraft({ ...draft, dosageBounds: event.target.value })}
              />
            </label>
          </div>
          {formError && <p className={styles.accountInlineWarning} role="alert">{formError}</p>}
          {publish.isError && !pendingPublish && <p className={styles.accountInlineWarning} role="alert">{getApiErrorMessage(publish.error, "mutation")}</p>}
        </form>
      ) : (
        <>
          {recipes.isPending && <div className={styles.notice} role="status">{ADMIN_MESSAGES.MENU.LOADING}</div>}
          {recipes.isError && (
            <div className={[styles.notice, styles.errorNotice].join(" ")} role="alert">
              <p>{getApiErrorMessage(recipes.error)}</p>
              <button type="button" onClick={() => void recipes.refetch()}>{ADMIN_MESSAGES.MENU.RETRY}</button>
            </div>
          )}
          {recipes.data?.length === 0 && <p className={styles.emptyText}>{ADMIN_MESSAGES.MENU.EMPTY}</p>}
          {recipes.data && recipes.data.length > 0 && (
            <section className={styles.panel} aria-labelledby="global-recipes-title">
              <h2 id="global-recipes-title">{ADMIN_MESSAGES.MENU.RECIPES}</h2>
              <DataTable
                rows={recipes.data}
                rowKey={(item) => item.id}
                columns={[
                  { key: "name", header: ADMIN_MESSAGES.MENU.NAME, render: (item) => item.name },
                  { key: "select", header: ADMIN_MESSAGES.MENU.SELECT, render: (item) => (
                    <button
                      className={styles.accountTextButton}
                      type="button"
                      aria-pressed={selectedRecipeIdValue === item.id}
                      onClick={() => setSelectedRecipeId(item.id)}
                    >
                      {ADMIN_MESSAGES.MENU.SELECT}
                    </button>
                  ) },
                ]}
              />
            </section>
          )}

          {selectedRecipeIdValue && (
            <section className={styles.panel} aria-labelledby="global-recipe-detail-title">
              <div className={styles.pageHeading}>
                <h2 id="global-recipe-detail-title">{ADMIN_MESSAGES.MENU.DETAIL}</h2>
                <p>{ADMIN_MESSAGES.MENU.EDIT_UNAVAILABLE}</p>
              </div>
              {recipe.isPending && <p role="status">{ADMIN_MESSAGES.MENU.LOADING}</p>}
              {recipe.isError && (
                <div className={[styles.notice, styles.errorNotice].join(" ")} role="alert">
                  <p>{recipeError}</p>
                  <button type="button" onClick={() => void recipe.refetch()}>{ADMIN_MESSAGES.MENU.RETRY}</button>
                </div>
              )}
              {recipe.data && (
                <div className={styles.operationsGrid}>
                  <div><span>{ADMIN_MESSAGES.MENU.NAME}</span><strong>{recipe.data.name}</strong></div>
                  <div><span>{ADMIN_MESSAGES.MENU.STEPS}</span><strong>{recipe.data.steps.join(" · ")}</strong></div>
                  <div><span>{ADMIN_MESSAGES.MENU.DOSAGE_BOUNDS}</span><strong>{recipe.data.dosageBounds.join(" · ")}</strong></div>
                </div>
              )}
            </section>
          )}
        </>
      )}

      {pendingPublish && (
        <NotificationDialog
          variant="confirm"
          title={ADMIN_MESSAGES.MENU.CONFIRM_TITLE}
          description={ADMIN_MESSAGES.MENU.PUBLISH_WARNING}
          primaryAction={{
            label: publish.isPending ? ADMIN_MESSAGES.MENU.PUBLISHING : ADMIN_MESSAGES.MENU.CONFIRM,
            pending: publish.isPending,
            onClick: () => publish.mutate(pendingPublish),
          }}
          secondaryAction={{
            label: ADMIN_MESSAGES.MENU.CANCEL,
            disabled: publish.isPending,
            onClick: () => setPendingPublish(null),
          }}
          onClose={() => setPendingPublish(null)}
          closeOnEscape={!publish.isPending}
        >
          <p><strong>{pendingPublish.name}</strong></p>
          {publish.isError && (
            <p className={styles.accountInlineWarning} role="alert">
              {getApiErrorMessage(publish.error, "mutation")}
            </p>
          )}
        </NotificationDialog>
      )}
      {publishedRecipeName && (
        <NotificationDialog
          variant="success"
          title={ADMIN_MESSAGES.MENU.PUBLISHED}
          description={publishedRecipeName}
          primaryAction={{ label: ADMIN_MESSAGES.MENU.DETAIL, onClick: () => setPublishedRecipeName("") }}
          onClose={() => setPublishedRecipeName("")}
        />
      )}
    </div>
    {isCreateView ? (
      <ActionBar>
        <ButtonBar type="submit" form="global-recipe-form" disabled={publish.isPending || Boolean(pendingPublish)}>
          {ADMIN_MESSAGES.MENU.PUBLISH}
        </ButtonBar>
        <ButtonBar type="button" disabled={publish.isPending} onClick={navigateToList}>
          {ADMIN_MESSAGES.MENU.CANCEL}
        </ButtonBar>
      </ActionBar>
    ) : (
      <ActionBar>
        <ButtonBar type="button" onClick={navigateToCreate}>
          {ADMIN_MESSAGES.MENU.CREATE}
        </ButtonBar>
        <ButtonBar type="button" disabled={recipes.isFetching} onClick={() => void recipes.refetch()}>
          {ADMIN_MESSAGES.MENU.RETRY}
        </ButtonBar>
      </ActionBar>
    )}
    </>
  );
}

export default function AdminMenuPage() {
  return <AdminShell><MenuContent /></AdminShell>;
}
