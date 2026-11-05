import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/router";
import { recipesApi } from "@/apis/recipes.api";
import { ButtonBar } from "@/components/button/button-bar";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import { getApiErrorMessage } from "@/lib/api-errors";
import { authScopedQuerySubject } from "@/lib/query-subject";
import { PATH_CUSTOMER } from "@/routes/path";
import {
  RecipeDosageBoundSchema,
  RecipePublishRequestSchema,
  type GlobalRecipeSummary,
  type LocalRecipeSummary,
} from "@/schema/recipes.schema";
import styles from "../repair-workflow/repair-workflow.module.css";

type Role = "owner" | "operator";
type View = "global" | "local";
type GlobalFormMode = "view" | "create" | "edit";
type DosageBoundDraft = { parameter: string; min: string; max: string };

function dosageBoundsForEditor(values: string[]): DosageBoundDraft[] {
  const bounds = values.map((value) => {
    try {
      const parsed: unknown = JSON.parse(value);
      if (parsed && typeof parsed === "object") {
        const bound = parsed as Record<string, unknown>;
        if (
          typeof bound.parameter === "string" &&
          typeof bound.minPercent === "number" &&
          typeof bound.maxPercent === "number"
        ) {
          return { parameter: bound.parameter, min: String(bound.minPercent), max: String(bound.maxPercent) };
        }
      }
    } catch {
      // Keep non-JSON values as entered.
    }
    const parts = value.split(":");
    if (parts.length === 3) return { parameter: parts[0].trim(), min: parts[1].trim(), max: parts[2].trim() };
    return { parameter: value, min: "", max: "" };
  });
  return bounds.length ? bounds : [{ parameter: "", min: "", max: "" }];
}

function PageControls({ page, hasNext, onChange }: { page: number; hasNext: boolean; onChange: (page: number) => void }) {
  if (page === 0 && !hasNext) return null;
  return (
    <nav className={styles.recipeMenuPagination} aria-label="Phân trang công thức">
      <ButtonBar type="button" disabled={page <= 0} onClick={() => onChange(page - 1)}>Trang trước</ButtonBar>
      <span aria-live="polite">Trang {page + 1}</span>
      <ButtonBar type="button" disabled={!hasNext} onClick={() => onChange(page + 1)}>Trang sau</ButtonBar>
    </nav>
  );
}

function QueryError({ error, retry }: { error: unknown; retry: () => unknown }) {
  return (
    <div className={styles.recipeMenuError} role="alert">
      <p>{getApiErrorMessage(error)}</p>
      <ButtonBar type="button" onClick={() => void retry()}>Thử lại</ButtonBar>
    </div>
  );
}

function RecipeSummaryButton({
  recipe,
  selected,
  onSelect,
}: {
  recipe: GlobalRecipeSummary;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <li className={styles.recipeMenuItem}>
      <button type="button" aria-pressed={selected} onClick={onSelect}>
        <span className={styles.recipeMenuRecipeMain}>
          <strong>{recipe.name}</strong>
          <span className={styles.recipeMenuMeta}>Phiên bản {recipe.revision}</span>
        </span>
        <span aria-hidden="true">›</span>
      </button>
    </li>
  );
}

function LocalOverrideSummaryButton({
  recipe,
  selected,
  onSelect,
}: {
  recipe: LocalRecipeSummary;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <li className={styles.recipeMenuItem}>
      <button type="button" aria-pressed={selected} onClick={onSelect}>
        <span className={styles.recipeMenuRecipeMain}>
          <strong>{recipe.globalRecipeName || "Công thức dùng chung"}</strong>
          <span className={styles.recipeMenuMeta}>
            Owner ID: {recipe.ownerId ?? "—"}
          </span>
        </span>
        <span aria-hidden="true">›</span>
      </button>
    </li>
  );
}

export function RecipeManagementScreen({
  role,
  operatorRole,
  showHeading = true,
  initialGlobalRecipeId,
}: {
  role: Role;
  operatorRole?: "ADMIN" | "MODERATOR";
  showHeading?: boolean;
  initialGlobalRecipeId?: string;
}) {
  const router = useRouter();
  const owner = role === "owner";
  const canManageGlobal = !owner;
  const subject = authScopedQuerySubject(owner ? "OWNER" : operatorRole ?? "operator");
  const client = useQueryClient();
  const [view, setView] = useState<View>("global");
  const [globalPageIndex, setGlobalPageIndex] = useState(0);
  const [localPageIndex, setLocalPageIndex] = useState(0);
  const [selectedGlobalRecipeId, setSelectedGlobalRecipeId] = useState(initialGlobalRecipeId ?? "");
  const [selectedLocalRecipeId, setSelectedLocalRecipeId] = useState("");
  const [globalFormMode, setGlobalFormMode] = useState<GlobalFormMode>("view");
  const [globalName, setGlobalName] = useState("");
  const [globalSteps, setGlobalSteps] = useState<string[]>([""]);
  const [globalBounds, setGlobalBounds] = useState<DosageBoundDraft[]>([{ parameter: "", min: "", max: "" }]);
  const [globalFormError, setGlobalFormError] = useState("");

  const globalRecipes = useQuery({
    queryKey: ["dolores", "recipes", "global", subject, globalPageIndex],
    queryFn: ({ signal }) => recipesApi.listGlobalPage(globalPageIndex, 50, signal),
    retry: false,
  });
  const selectedGlobalId = selectedGlobalRecipeId || initialGlobalRecipeId || globalRecipes.data?.items[0]?.id || "";
  const globalRecipe = useQuery({
    queryKey: ["dolores", "recipes", "global-detail", subject, selectedGlobalId],
    queryFn: ({ signal }) => recipesApi.getGlobalById(selectedGlobalId, signal),
    enabled: Boolean(selectedGlobalId),
    retry: false,
  });
  const localRecipes = useQuery({
    queryKey: ["dolores", "recipes", "local", subject, localPageIndex],
    queryFn: ({ signal }) => recipesApi.listLocalPage({ page: localPageIndex, size: 50 }, signal),
    enabled: view === "local",
    retry: false,
  });
  const selectedLocalId = selectedLocalRecipeId || localRecipes.data?.items[0]?.id || "";
  const localRecipe = useQuery({
    queryKey: ["dolores", "recipes", "local-detail", subject, selectedLocalId],
    queryFn: ({ signal }) => recipesApi.getLocalById(selectedLocalId, signal),
    enabled: view === "local" && Boolean(selectedLocalId),
    retry: false,
  });

  useEffect(() => {
    if (initialGlobalRecipeId) setSelectedGlobalRecipeId(initialGlobalRecipeId);
  }, [initialGlobalRecipeId]);

  useEffect(() => {
    if (globalFormMode === "edit" && globalRecipe.data) {
      setGlobalName(globalRecipe.data.name);
      setGlobalSteps(globalRecipe.data.steps.length ? [...globalRecipe.data.steps] : [""]);
      setGlobalBounds(dosageBoundsForEditor(globalRecipe.data.dosageBounds));
    }
  }, [globalFormMode, globalRecipe.data]);

  const invalidateGlobal = async () => Promise.all([
    client.invalidateQueries({ queryKey: ["dolores", "recipes", "global", subject] }),
    client.invalidateQueries({ queryKey: ["dolores", "recipes", "global-options", subject] }),
    client.invalidateQueries({ queryKey: ["dolores", "recipes", "global-detail", subject] }),
  ]);
  const invalidateLocal = async () => Promise.all([
    client.invalidateQueries({ queryKey: ["dolores", "recipes", "local", subject] }),
    client.invalidateQueries({ queryKey: ["dolores", "recipes", "local-detail", subject] }),
  ]);

  const createGlobal = useMutation({
    mutationFn: (input: { name: string; steps: string[]; dosageBounds: string[] }) => recipesApi.publishGlobal(input),
    onSuccess: async (recipe) => {
      setSelectedGlobalRecipeId(recipe.id);
      setGlobalFormMode("view");
      setGlobalFormError("");
      await invalidateGlobal();
    },
  });
  const updateGlobal = useMutation({
    mutationFn: (input: { id: string; name: string; steps: string[]; dosageBounds: string[] }) => {
      const { id, ...recipe } = input;
      return recipesApi.updateGlobal(id, recipe);
    },
    onSuccess: async (recipe) => {
      setSelectedGlobalRecipeId(recipe.id);
      setGlobalFormMode("view");
      setGlobalFormError("");
      await invalidateGlobal();
    },
  });
  const deleteGlobal = useMutation({
    mutationFn: (id: string) => recipesApi.deleteGlobal(id),
    onSuccess: async () => {
      setSelectedGlobalRecipeId("");
      setGlobalFormMode("view");
      await invalidateGlobal();
    },
  });
  const deleteLocal = useMutation({
    mutationFn: (id: string) => recipesApi.deleteLocal(id),
    onSuccess: async () => {
      setSelectedLocalRecipeId("");
      await invalidateLocal();
    },
  });

  const mutationError = createGlobal.error
    ?? updateGlobal.error
    ?? deleteGlobal.error
    ?? deleteLocal.error;

  const submitGlobal = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const steps = globalSteps.map((step) => step.trim());
    const emptyStepIndex = steps.findIndex((step) => !step);
    if (emptyStepIndex !== -1) {
      setGlobalFormError(`Bước pha ${emptyStepIndex + 1} đang để trống. Hãy nhập nội dung hoặc xóa bước đó.`);
      return;
    }
    const dosageBounds = globalBounds.map(({ parameter, min, max }) => `${parameter.trim()}:${min.trim()}:${max.trim()}`);
    const invalidBoundIndex = dosageBounds.findIndex((bound) => !RecipeDosageBoundSchema.safeParse(bound).success);
    if (invalidBoundIndex !== -1) {
      setGlobalFormError(`Giới hạn định lượng ${invalidBoundIndex + 1} chưa đầy đủ hoặc chưa hợp lệ. Kiểm tra thông số, mức tối thiểu và mức tối đa.`);
      return;
    }
    const parsed = RecipePublishRequestSchema.safeParse({
      name: globalName,
      steps,
      dosageBounds,
    });
    if (!parsed.success) {
      setGlobalFormError("Hãy nhập tên công thức, ít nhất một bước pha và một giới hạn định lượng hợp lệ.");
      return;
    }
    setGlobalFormError("");
    const recipe = {
      name: parsed.data.name,
      steps: parsed.data.steps,
      dosageBounds: parsed.data.dosageBounds,
    };
    if (globalFormMode === "edit" && selectedGlobalId) {
      updateGlobal.mutate({ id: selectedGlobalId, ...recipe });
    } else {
      createGlobal.mutate(recipe);
    }
  };

  const startGlobalCreate = () => {
    setSelectedGlobalRecipeId("");
    setGlobalName("");
    setGlobalSteps([""]);
    setGlobalBounds([{ parameter: "", min: "", max: "" }]);
    setGlobalFormError("");
    setGlobalFormMode("create");
  };

  const startOverrideForGlobalRecipe = (id: string) => {
    void router.push({ pathname: PATH_CUSTOMER.MENU_ADJUSTMENTS, query: { recipeId: id } });
  };

  return (
    <div className={styles.screen}>
      {showHeading ? (
        <BackButtonHeading
          title={owner ? "Công thức pha chế" : "Quản lý công thức pha chế"}
          titleId="recipe-management-title"
          description={owner
            ? "Xem công thức Dolores, lưu điều chỉnh định lượng riêng và theo dõi trạng thái áp dụng trên máy."
            : "Quản lý công thức dùng chung và xem các điều chỉnh cục bộ theo quyền vận hành."}
          back={null}
        />
      ) : null}

      <nav className={styles.recipeMenuTabs} aria-label="Khu vực công thức">
        <button
          className={view === "global" ? styles.recipeMenuTabActive : ""}
          type="button"
          aria-pressed={view === "global"}
          onClick={() => owner ? void router.push(PATH_CUSTOMER.MENU) : setView("global")}
        >Công thức dùng chung</button>
        <button
          className={!owner && view === "local" ? styles.recipeMenuTabActive : ""}
          type="button"
          aria-pressed={!owner && view === "local"}
          onClick={() => owner ? void router.push(PATH_CUSTOMER.MENU_ADJUSTMENTS) : setView("local")}
        >{owner ? "Điều chỉnh của tôi" : "Bản ghi đè cục bộ"}</button>
        {owner ? (
          <button
            className=""
            type="button"
            aria-pressed={false}
            onClick={() => void router.push(PATH_CUSTOMER.MENU_SYNC)}
          >Đồng bộ với máy</button>
        ) : null}
      </nav>

      {view === "global" ? (
        <section className={styles.recipeMenuPanel} aria-labelledby="global-recipe-panel-title">
          <div className={styles.panelHeading}>
            <div>
              <h2 id="global-recipe-panel-title">Công thức dùng chung</h2>
              <p>{owner
                ? "Công thức hiện hành của Dolores. Bạn có thể lưu mức định lượng riêng mà không sửa công thức dùng chung."
                : "Công thức dùng chung được Admin và Moderator quản lý; thay đổi có thể ảnh hưởng các Owner đang sử dụng."}</p>
            </div>
            {canManageGlobal ? <ButtonBar className={styles.recipeMenuPrimary} type="button" onClick={startGlobalCreate}>Tạo công thức</ButtonBar> : null}
          </div>

          {globalRecipes.isPending ? <p className={styles.notice} role="status">Đang tải công thức…</p> : null}
          {globalRecipes.isError ? <QueryError error={globalRecipes.error} retry={() => globalRecipes.refetch()} /> : null}
          {globalRecipes.data?.items.length ? (
            <>
              <ul className={styles.recipeMenuList} aria-label="Danh sách công thức dùng chung">
                {globalRecipes.data.items.map((recipe) => (
                  <RecipeSummaryButton
                    key={recipe.id}
                    recipe={recipe}
                    selected={selectedGlobalId === recipe.id}
                    onSelect={() => {
                      setSelectedGlobalRecipeId(recipe.id);
                      setGlobalFormMode("view");
                    }}
                  />
                ))}
              </ul>
              <PageControls page={globalRecipes.data.page} hasNext={globalRecipes.data.hasNext} onChange={setGlobalPageIndex} />
            </>
          ) : globalRecipes.isSuccess ? <p className={styles.recipeMenuEmpty} role="status">Chưa có công thức dùng chung.</p> : null}

          {globalFormMode === "create" || globalFormMode === "edit" ? (
            <form className={styles.recipeMenuEditor} onSubmit={submitGlobal}>
              <div className={styles.panelHeading}>
                <div>
                  <h3>{globalFormMode === "create" ? "Tạo công thức dùng chung" : "Chỉnh sửa công thức dùng chung"}</h3>
                  <p>Nhập từng bước và từng thông số vào ô riêng. Các trường được gửi đúng định dạng API khi lưu.</p>
                </div>
              </div>
              <div className={styles.recipeMenuFormGrid}>
                <label className={styles.formField + " " + styles.recipeMenuFieldWide}>
                  <span>Tên công thức</span>
                  <input maxLength={160} placeholder="Espresso" required value={globalName} onChange={(event) => setGlobalName(event.target.value)} />
                </label>
              </div>
              <section className={styles.recipeMenuEditorGroup} aria-labelledby="global-recipe-steps-title">
                <div className={styles.recipeMenuEditorGroupHeading}>
                  <div>
                    <h4 id="global-recipe-steps-title">Các bước pha</h4>
                    <p>Thêm từng bước theo đúng thứ tự thực hiện.</p>
                  </div>
                  <ButtonBar type="button" onClick={() => setGlobalSteps((current) => [...current, ""])}>Thêm bước</ButtonBar>
                </div>
                <ol className={styles.recipeMenuStepList}>
                  {globalSteps.map((step, index) => (
                    <li className={styles.recipeMenuStepRow} key={index}>
                      <span className={styles.recipeMenuRowIndex} aria-hidden="true">{index + 1}</span>
                      <label className={styles.formField}>
                        <span>Bước {index + 1}</span>
                        <input
                          maxLength={300}
                          placeholder={index === 0 ? "Ví dụ: Xay hạt cà phê" : "Mô tả thao tác tiếp theo"}
                          required
                          value={step}
                          onChange={(event) => setGlobalSteps((current) => current.map((value, rowIndex) => rowIndex === index ? event.target.value : value))}
                        />
                      </label>
                      <ButtonBar type="button" disabled={globalSteps.length === 1} aria-label={`Xóa bước ${index + 1}`} onClick={() => setGlobalSteps((current) => current.filter((_, rowIndex) => rowIndex !== index))}>Xóa</ButtonBar>
                    </li>
                  ))}
                </ol>
              </section>
              <section className={styles.recipeMenuEditorGroup} aria-labelledby="global-recipe-bounds-title">
                <div className={styles.recipeMenuEditorGroupHeading}>
                  <div>
                    <h4 id="global-recipe-bounds-title">Giới hạn định lượng</h4>
                    <p>Đặt khoảng cho phép riêng cho từng thông số. Mức tối đa phải bằng hoặc lớn hơn mức tối thiểu.</p>
                  </div>
                  <ButtonBar type="button" onClick={() => setGlobalBounds((current) => [...current, { parameter: "", min: "", max: "" }])}>Thêm thông số</ButtonBar>
                </div>
                <div className={styles.recipeMenuDosageList}>
                  {globalBounds.map((bound, index) => (
                    <div className={styles.recipeMenuDosageRow} key={index}>
                      <label className={styles.formField}>
                        <span>Thông số {index + 1}</span>
                        <input
                          maxLength={80}
                          placeholder="Ví dụ: coffee"
                          required
                          value={bound.parameter}
                          onChange={(event) => setGlobalBounds((current) => current.map((value, rowIndex) => rowIndex === index ? { ...value, parameter: event.target.value } : value))}
                        />
                      </label>
                      <label className={styles.formField}>
                        <span>Giá trị tối thiểu</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="any"
                          placeholder="16"
                          required
                          value={bound.min}
                          onChange={(event) => setGlobalBounds((current) => current.map((value, rowIndex) => rowIndex === index ? { ...value, min: event.target.value } : value))}
                        />
                      </label>
                      <label className={styles.formField}>
                        <span>Giá trị tối đa</span>
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="any"
                          placeholder="20"
                          required
                          value={bound.max}
                          onChange={(event) => setGlobalBounds((current) => current.map((value, rowIndex) => rowIndex === index ? { ...value, max: event.target.value } : value))}
                        />
                      </label>
                      <ButtonBar type="button" disabled={globalBounds.length === 1} aria-label={`Xóa thông số ${index + 1}`} onClick={() => setGlobalBounds((current) => current.filter((_, rowIndex) => rowIndex !== index))}>Xóa</ButtonBar>
                    </div>
                  ))}
                </div>
              </section>
              {globalFormError ? <p className={styles.recipeMenuError} role="alert">{globalFormError}</p> : null}
              <div className={styles.recipeMenuActions}>
                <ButtonBar className={styles.recipeMenuPrimary} type="submit" disabled={createGlobal.isPending || updateGlobal.isPending}>
                  {createGlobal.isPending || updateGlobal.isPending ? "Đang lưu…" : "Lưu công thức"}
                </ButtonBar>
                <ButtonBar type="button" onClick={() => setGlobalFormMode("view")}>Hủy</ButtonBar>
              </div>
            </form>
          ) : selectedGlobalId ? (
            <>
              {globalRecipe.isPending ? <p className={styles.notice} role="status">Đang tải chi tiết công thức…</p> : null}
              {globalRecipe.isError ? <QueryError error={globalRecipe.error} retry={() => globalRecipe.refetch()} /> : null}
              {globalRecipe.data ? (
                <section className={styles.recipeMenuDetail} aria-label={"Chi tiết " + globalRecipe.data.name}>
                  <div className={styles.panelHeading}>
                    <div>
                      <h3>{globalRecipe.data.name}</h3>
                      <p>Phiên bản hiện hành · {globalRecipe.data.revision}</p>
                    </div>
                    <div className={styles.recipeMenuActions}>
                      {owner ? (
                        <ButtonBar className={styles.recipeMenuPrimary} type="button" onClick={() => startOverrideForGlobalRecipe(globalRecipe.data!.id)}>Điều chỉnh định lượng riêng</ButtonBar>
                      ) : (
                        <>
                          <ButtonBar type="button" onClick={() => setGlobalFormMode("edit")}>Chỉnh sửa</ButtonBar>
                          <ButtonBar type="button" disabled={deleteGlobal.isPending} onClick={() => {
                            if (window.confirm("Xóa công thức dùng chung này? Thao tác có thể bị từ chối nếu còn bản ghi đè đang tham chiếu.")) {
                              deleteGlobal.mutate(globalRecipe.data!.id);
                            }
                          }}>Xóa công thức</ButtonBar>
                        </>
                      )}
                    </div>
                  </div>
                  <div className={styles.recipeMenuDetailGrid}>
                    <div><h4>Các bước pha</h4><ol>{globalRecipe.data.steps.map((step, index) => <li key={index}>{step}</li>)}</ol></div>
                    <div><h4>Giới hạn định lượng</h4><ul>{globalRecipe.data.dosageBounds.map((bound, index) => <li key={index}>{bound}</li>)}</ul></div>
                  </div>
                </section>
              ) : null}
            </>
          ) : null}
        </section>
      ) : null}

      {view === "local" ? (
        <section className={styles.recipeMenuPanel} aria-labelledby="local-recipe-panel-title">
          <div className={styles.panelHeading}>
            <div>
              <h2 id="local-recipe-panel-title">Bản ghi đè cục bộ</h2>
              <p>Admin và Moderator có thể xem cấu hình cục bộ theo API; mỗi bản ghi thuộc một Owner.</p>
            </div>
          </div>

          {localRecipes.isPending ? <p className={styles.notice} role="status">Đang tải bản ghi cục bộ…</p> : null}
          {localRecipes.isError ? <QueryError error={localRecipes.error} retry={() => localRecipes.refetch()} /> : null}
          {localRecipes.data?.items.length ? (
            <>
              <ul className={styles.recipeMenuList} aria-label="Danh sách bản ghi đè cục bộ">
                {localRecipes.data.items.map((recipe) => (
                  <LocalOverrideSummaryButton
                    key={recipe.id}
                    recipe={recipe}
                    selected={selectedLocalId === recipe.id}
                    onSelect={() => setSelectedLocalRecipeId(recipe.id)}
                  />
                ))}
              </ul>
              <PageControls page={localRecipes.data.page} hasNext={localRecipes.data.hasNext} onChange={setLocalPageIndex} />
            </>
          ) : localRecipes.isSuccess ? (
            <p className={styles.recipeMenuEmpty} role="status">Chưa có bản ghi đè cục bộ.</p>
          ) : null}

          {selectedLocalId ? (
            <section className={styles.recipeMenuDetail} aria-label="Chi tiết bản ghi đè cục bộ">
              {localRecipe.isPending ? <p className={styles.notice} role="status">Đang tải chi tiết bản ghi…</p> : null}
              {localRecipe.isError ? <QueryError error={localRecipe.error} retry={() => localRecipe.refetch()} /> : null}
              {localRecipe.data ? (
                <>
                  <div className={styles.panelHeading}>
                    <div>
                      <h3>{localRecipes.data?.items.find((item) => item.id === selectedLocalId)?.globalRecipeName || "Điều chỉnh công thức"}</h3>
                      <p>Owner ID: {localRecipe.data.ownerId ?? "—"}</p>
                    </div>
                    <ButtonBar type="button" disabled={deleteLocal.isPending} onClick={() => {
                      if (window.confirm("Xóa bản ghi đè cục bộ này?")) deleteLocal.mutate(localRecipe.data!.id);
                    }}>Xóa bản ghi đè</ButtonBar>
                  </div>
                  <dl className={styles.recipeMenuStatus}>
                    <div><dt>Mã công thức dùng chung</dt><dd>{localRecipe.data.globalRecipeId}</dd></div>
                    <div><dt>Định lượng đã ghi đè</dt><dd>{localRecipe.data.dosageOverrides.length ? localRecipe.data.dosageOverrides.join(" · ") : "Chưa có giá trị"}</dd></div>
                  </dl>
                </>
              ) : null}
            </section>
          ) : null}
        </section>
      ) : null}

      {mutationError ? <p className={styles.recipeMenuError} role="alert">{getApiErrorMessage(mutationError, "mutation")}</p> : null}
    </div>
  );
}
