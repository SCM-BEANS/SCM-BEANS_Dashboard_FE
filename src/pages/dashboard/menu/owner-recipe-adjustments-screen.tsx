import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { recipesApi } from "@/apis/recipes.api";
import { ButtonBar } from "@/components/button/button-bar";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import { getApiErrorMessage } from "@/lib/api-errors";
import { authScopedQuerySubject } from "@/lib/query-subject";
import { GlobalRecipeIdSchema } from "@/schema/recipes.schema";
import { PATH_CUSTOMER } from "@/routes/path";
import styles from "@/components/features/repair-workflow/repair-workflow.module.css";
import pageStyles from "../customer-shell.module.css";

type DosageBound = {
  parameter: string;
  adjustable: boolean;
  minPercent: number;
  maxPercent: number;
};

function parseDosageBound(value: string): DosageBound | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed && typeof parsed === "object") {
      const item = parsed as Record<string, unknown>;
      if (
        typeof item.parameter === "string" &&
        typeof item.adjustable === "boolean" &&
        typeof item.minPercent === "number" &&
        typeof item.maxPercent === "number"
      ) {
        return {
          parameter: item.parameter,
          adjustable: item.adjustable,
          minPercent: item.minPercent,
          maxPercent: item.maxPercent,
        };
      }
    }
  } catch {
    const [parameter, min, max, ...rest] = value.split(":");
    if (parameter && min && max && rest.length === 0) {
      const minPercent = Number(min);
      const maxPercent = Number(max);
      if (Number.isFinite(minPercent) && Number.isFinite(maxPercent)) {
        return { parameter, adjustable: true, minPercent, maxPercent };
      }
    }
  }
  return null;
}

function parseOverrides(values: string[]) {
  return Object.fromEntries(values.flatMap((value) => {
    const separator = value.indexOf(":");
    if (separator <= 0) return [];
    return [[value.slice(0, separator), value.slice(separator + 1)]];
  }));
}

function recipeApiError(error: unknown) {
  if (axios.isAxiosError(error)) {
    const body: unknown = error.response?.data;
    if (typeof body === "string" && body.trim()) return body;
    if (body && typeof body === "object") {
      const details = body as Record<string, unknown>;
      for (const key of ["message", "detail", "error"]) {
        if (typeof details[key] === "string" && details[key]) return details[key];
      }
    }
  }
  return getApiErrorMessage(error, "mutation");
}

function OwnerMenuTabs({ active }: { active: "adjustments" | "sync" }) {
  const router = useRouter();
  return (
    <nav className={styles.recipeMenuTabs} aria-label="Khu vực công thức">
      <button type="button" onClick={() => void router.push(PATH_CUSTOMER.MENU)}>
        Công thức dùng chung
      </button>
      <button
        type="button"
        aria-pressed={active === "adjustments"}
        className={active === "adjustments" ? styles.recipeMenuTabActive : ""}
      >
        Điều chỉnh của tôi
      </button>
      <button
        type="button"
        aria-pressed={active === "sync"}
        className={active === "sync" ? styles.recipeMenuTabActive : ""}
        onClick={() => void router.push(PATH_CUSTOMER.MENU_SYNC)}
      >
        Đồng bộ với máy
      </button>
    </nav>
  );
}

export function OwnerRecipeAdjustmentsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const subject = authScopedQuerySubject("OWNER");
  const queryRecipeId = typeof router.query.recipeId === "string" && GlobalRecipeIdSchema.safeParse(router.query.recipeId).success
    ? router.query.recipeId
    : "";
  const [selectedGlobalRecipeId, setSelectedGlobalRecipeId] = useState("");
  const [selectedLocalRecipeId, setSelectedLocalRecipeId] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");

  const globalRecipes = useQuery({
    queryKey: ["dolores", "recipes", "global-options", subject],
    queryFn: ({ signal }) => recipesApi.listGlobalPage(0, 100, signal),
    retry: false,
  });
  const selectedRecipeId = selectedGlobalRecipeId || queryRecipeId || globalRecipes.data?.items[0]?.id || "";
  const selectedRecipe = useQuery({
    queryKey: ["dolores", "recipes", "global-detail", subject, selectedRecipeId],
    queryFn: ({ signal }) => recipesApi.getGlobalById(selectedRecipeId, signal),
    enabled: Boolean(selectedRecipeId),
    retry: false,
  });
  const localRecipes = useQuery({
    queryKey: ["dolores", "recipes", "local-by-global", subject, selectedRecipeId],
    queryFn: ({ signal }) => recipesApi.listLocalPage({ page: 0, size: 100, globalRecipeId: selectedRecipeId }, signal),
    enabled: Boolean(selectedRecipeId),
    retry: false,
  });
  const selectedLocalId = selectedLocalRecipeId && localRecipes.data?.items.some((item) => item.id === selectedLocalRecipeId)
    ? selectedLocalRecipeId
    : localRecipes.data?.items[0]?.id ?? "";
  const localRecipe = useQuery({
    queryKey: ["dolores", "recipes", "local-detail", subject, selectedLocalId],
    queryFn: ({ signal }) => recipesApi.getLocalById(selectedLocalId, signal),
    enabled: Boolean(selectedLocalId),
    retry: false,
  });
  const localDetailBlocked = Boolean(selectedLocalId) && (localRecipe.isPending || localRecipe.isError);
  const dosageBounds = useMemo(
    () => selectedRecipe.data?.dosageBounds.map(parseDosageBound).filter((item): item is DosageBound => item !== null) ?? [],
    [selectedRecipe.data],
  );

  useEffect(() => {
    if (queryRecipeId) setSelectedGlobalRecipeId(queryRecipeId);
  }, [queryRecipeId]);

  useEffect(() => {
    if (localRecipe.data?.globalRecipeId === selectedRecipeId) {
      setValues(parseOverrides(localRecipe.data.dosageOverrides));
    } else if (localRecipes.isSuccess) {
      setValues({});
    }
  }, [localRecipe.data, localRecipes.isSuccess, selectedRecipeId]);

  const saveAdjustment = useMutation({
    mutationFn: (input: { id?: string; globalRecipeId: string; dosageOverrides: string[] }) => recipesApi.upsertLocal(input),
    onSuccess: async (recipe) => {
      setSelectedLocalRecipeId(recipe.id);
      setFormError("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dolores", "recipes", "local", subject] }),
        queryClient.invalidateQueries({ queryKey: ["dolores", "recipes", "local-by-global", subject] }),
        queryClient.invalidateQueries({ queryKey: ["dolores", "recipes", "local-detail", subject] }),
      ]);
    },
  });
  const deleteAdjustment = useMutation({
    mutationFn: (id: string) => recipesApi.deleteLocal(id),
    onSuccess: async () => {
      setSelectedLocalRecipeId("");
      setValues({});
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dolores", "recipes", "local", subject] }),
        queryClient.invalidateQueries({ queryKey: ["dolores", "recipes", "local-by-global", subject] }),
        queryClient.invalidateQueries({ queryKey: ["dolores", "recipes", "local-detail", subject] }),
      ]);
    },
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const activeBounds = dosageBounds.filter((bound) => bound.adjustable);
    if (!selectedRecipeId || activeBounds.length === 0) {
      setFormError("Công thức này chưa có thông số định lượng cho phép điều chỉnh.");
      return;
    }

    const dosageOverrides: string[] = [];
    for (const bound of activeBounds) {
      const raw = values[bound.parameter]?.trim();
      if (!raw) continue;
      const value = Number(raw);
      if (!Number.isFinite(value) || value < bound.minPercent || value > bound.maxPercent) {
        setFormError(`${bound.parameter}: nhập giá trị từ ${bound.minPercent} đến ${bound.maxPercent}.`);
        return;
      }
      dosageOverrides.push(`${bound.parameter}:${value}`);
    }
    if (dosageOverrides.length === 0) {
      setFormError("Nhập ít nhất một mức định lượng cần điều chỉnh.");
      return;
    }

    setFormError("");
    saveAdjustment.mutate({
      ...(selectedLocalId ? { id: selectedLocalId } : {}),
      globalRecipeId: selectedRecipeId,
      dosageOverrides,
    });
  };

  const changeRecipe = (recipeId: string) => {
    setSelectedGlobalRecipeId(recipeId);
    setSelectedLocalRecipeId("");
    setValues({});
    setFormError("");
    saveAdjustment.reset();
    deleteAdjustment.reset();
  };

  return (
    <section className={pageStyles.pageContent} aria-labelledby="owner-recipe-adjustments-title">
      <BackButtonHeading
        back={{ label: "Công thức pha chế", fallbackHref: PATH_CUSTOMER.MENU }}
        title="Điều chỉnh công thức của tôi"
        titleId="owner-recipe-adjustments-title"
        description="Lưu định lượng riêng cho tài khoản của bạn. Công thức dùng chung của Dolores vẫn được giữ nguyên."
        className={pageStyles.pageHeading}
      />
      <OwnerMenuTabs active="adjustments" />

      <section className={styles.recipeMenuPanel} aria-labelledby="owner-adjustment-panel-title">
        <div className={styles.panelHeading}>
          <div>
            <h2 id="owner-adjustment-panel-title">Định lượng riêng</h2>
            <p>Nhập một giá trị cho từng thông số. Khoảng cho phép được ghi ngay trên ô; sau khi lưu, hãy gửi yêu cầu đồng bộ để máy nhận thay đổi.</p>
          </div>
        </div>

        {globalRecipes.isPending ? <p className={styles.notice} role="status">Đang tải danh sách công thức…</p> : null}
        {globalRecipes.isError ? <div className={styles.recipeMenuError} role="alert"><p>{getApiErrorMessage(globalRecipes.error)}</p><ButtonBar type="button" onClick={() => void globalRecipes.refetch()}>Thử lại</ButtonBar></div> : null}
        {globalRecipes.isSuccess && globalRecipes.data.items.length === 0 ? <p className={styles.recipeMenuEmpty} role="status">Chưa có công thức dùng chung để điều chỉnh.</p> : null}

        {globalRecipes.data?.items.length ? (
          <>
            <label className={styles.formField}>
              <span>Công thức</span>
              <select value={selectedRecipeId} onChange={(event) => changeRecipe(event.target.value)}>
                {globalRecipes.data.items.map((recipe) => (
                  <option key={recipe.id} value={recipe.id}>{recipe.name} · phiên bản {recipe.revision}</option>
                ))}
              </select>
            </label>

            {localRecipes.isPending ? <p className={styles.notice} role="status">Đang kiểm tra điều chỉnh đã lưu…</p> : null}
            {localRecipes.isError ? <div className={styles.recipeMenuError} role="alert"><p>{getApiErrorMessage(localRecipes.error)}</p><ButtonBar type="button" onClick={() => void localRecipes.refetch()}>Thử lại</ButtonBar></div> : null}
            {localRecipes.data && localRecipes.data.items.length > 1 ? (
              <label className={styles.formField}>
                <span>Bản điều chỉnh đã lưu</span>
                <select value={selectedLocalId} onChange={(event) => setSelectedLocalRecipeId(event.target.value)}>
                  {localRecipes.data.items.map((recipe) => (
                    <option key={recipe.id} value={recipe.id}>{recipe.globalRecipeName || "Bản điều chỉnh"} · {recipe.id.slice(0, 8)}</option>
                  ))}
                </select>
              </label>
            ) : null}
            {selectedRecipe.isPending ? <p className={styles.notice} role="status">Đang tải giới hạn định lượng…</p> : null}
            {selectedRecipe.isError ? <div className={styles.recipeMenuError} role="alert"><p>{getApiErrorMessage(selectedRecipe.error)}</p><ButtonBar type="button" onClick={() => void selectedRecipe.refetch()}>Thử lại</ButtonBar></div> : null}

            {selectedRecipe.data ? (
              <>
                <p className={styles.recipeMenuCaption}>
                  Công thức hiện hành: {selectedRecipe.data.name} · phiên bản {selectedRecipe.data.revision}
                </p>
                {localRecipe.isError ? <div className={styles.recipeMenuError} role="alert"><p>{getApiErrorMessage(localRecipe.error)}</p><ButtonBar type="button" onClick={() => void localRecipe.refetch()}>Thử lại</ButtonBar></div> : null}
                <form className={styles.recipeMenuEditor} onSubmit={submit}>
                  <div className={styles.recipeMenuFormGrid}>
                    {dosageBounds.map((bound) => (
                      <label className={styles.formField} key={bound.parameter}>
                        <span>{bound.parameter}{bound.adjustable ? ` — khoảng cho phép ${bound.minPercent} đến ${bound.maxPercent}` : " — không cho phép điều chỉnh"}</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="any"
                          min={bound.minPercent}
                          max={bound.maxPercent}
                          placeholder="Nhập giá trị"
                          value={values[bound.parameter] ?? ""}
                          disabled={!bound.adjustable || localRecipes.isPending || localRecipes.isError || localDetailBlocked || saveAdjustment.isPending}
                          onChange={(event) => {
                            setValues((current) => ({ ...current, [bound.parameter]: event.target.value }));
                            setFormError("");
                            saveAdjustment.reset();
                          }}
                        />
                      </label>
                    ))}
                  </div>
                  <p className={styles.recipeMenuCaption}>Để nguyên ô trống nếu không muốn ghi đè thông số đó. Giá trị phải nằm trong khoảng hiển thị.</p>
                  {formError ? <p className={styles.recipeMenuError} role="alert">{formError}</p> : null}
                  {saveAdjustment.isError ? <p className={styles.recipeMenuError} role="alert">{recipeApiError(saveAdjustment.error)}</p> : null}
                  {saveAdjustment.isSuccess ? (
                    <p className={styles.recipeMenuSuccess} role="status">
                      Đã lưu điều chỉnh cho tài khoản. Máy chưa nhận thay đổi cho đến khi bạn gửi yêu cầu đồng bộ.
                    </p>
                  ) : null}
                  <div className={styles.recipeMenuActions}>
                    <ButtonBar className={styles.recipeMenuPrimary} type="submit" disabled={!dosageBounds.some((bound) => bound.adjustable) || saveAdjustment.isPending || localRecipes.isPending || localRecipes.isError || localDetailBlocked}>
                      {saveAdjustment.isPending ? "Đang lưu…" : selectedLocalId ? "Lưu điều chỉnh" : "Tạo điều chỉnh"}
                    </ButtonBar>
                    {selectedLocalId ? (
                      <ButtonBar type="button" disabled={deleteAdjustment.isPending} onClick={() => {
                        if (window.confirm("Xóa điều chỉnh định lượng riêng này?")) deleteAdjustment.mutate(selectedLocalId);
                      }}>
                        {deleteAdjustment.isPending ? "Đang xóa…" : "Xóa điều chỉnh"}
                      </ButtonBar>
                    ) : null}
                    <ButtonBar type="button" onClick={() => void router.push(PATH_CUSTOMER.MENU_SYNC)}>Đồng bộ với máy</ButtonBar>
                  </div>
                  {deleteAdjustment.isError ? <p className={styles.recipeMenuError} role="alert">{recipeApiError(deleteAdjustment.error)}</p> : null}
                  {deleteAdjustment.isSuccess ? <p className={styles.recipeMenuSuccess} role="status">Đã xóa điều chỉnh riêng.</p> : null}
                </form>
              </>
            ) : null}
          </>
        ) : null}
      </section>
    </section>
  );
}
