import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/router";
import { recipesApi } from "@/apis/recipes.api";
import { recipeMenusApi } from "@/apis/recipe-menus.api";
import { PageActions } from "@/components/action-bar/page-actions";
import { ButtonBar } from "@/components/button/button-bar";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import { getRecipeApiErrorDetails, getRecipeApiErrorMessage } from "@/lib/api-errors";
import { authScopedQuerySubject } from "@/lib/query-subject";
import { PATH_CUSTOMER, PATH_MODERATOR } from "@/routes/path";
import { buildRecipeProcedure, emptyRecipeProcedure, GlobalRecipeIdSchema, type RecipeProcedureDraft, type RecipePublishRequest } from "@/schema/recipes.schema";
import { RecipeProcedureFields, RecipeSteps } from "./recipe-procedure-fields";
import { LegacyRecipeOverrides } from "./legacy-recipe-overrides";
import { RecipeSyncPanel } from "./recipe-sync-panel";
import styles from "../repair-workflow/repair-workflow.module.css";

const DEFAULT_MENU = "00000000-0000-0000-0000-000000000090";
const RECIPE_STEP_ALIASES: Record<string, string> = { GRIND: "DOSE", BREW: "EXTRACT" };

function readRecipeProcedure(steps: string[]): { draft: RecipeProcedureDraft; dryTamp: string | null; unsupported: string[] } {
  const draft = { ...emptyRecipeProcedure(), TAMP: "", HOLDTAMP: "" };
  const unsupported: string[] = [];
  const seen = new Set<string>();
  let dryTamp: string | null = null;

  for (const step of steps) {
    const match = /^([A-Z]+):(-?\d+(?:\.\d+)?)$/.exec(step.trim());
    if (!match) {
      unsupported.push(step);
      continue;
    }

    const directive = RECIPE_STEP_ALIASES[match[1]] ?? match[1];
    const value = match[2];
    if (directive === "DRYTAMP") {
      if (dryTamp !== null && dryTamp !== value) unsupported.push(`Có nhiều giá trị DRYTAMP khác nhau: ${step}`);
      dryTamp = value;
      continue;
    }
    if (!Object.prototype.hasOwnProperty.call(draft, directive)) {
      unsupported.push(step);
      continue;
    }
    if (seen.has(directive)) {
      unsupported.push(`Thông số ${directive} bị lặp: ${step}`);
      continue;
    }

    draft[directive as keyof RecipeProcedureDraft] = value;
    seen.add(directive);
  }

  if (!draft.DOSE) unsupported.push("Thiếu lượng cà phê trong dữ liệu công thức hiện tại.");
  if (!draft.EXTRACT) unsupported.push("Thiếu lượng nước chiết xuất trong dữ liệu công thức hiện tại.");
  return { draft, dryTamp, unsupported };
}

export function RecipeManagementScreen({ role, operatorRole, showHeading = true, showNavigation = true, detailOnly = false, initialGlobalRecipeId }: {
  role: "owner" | "operator"; operatorRole?: "ADMIN" | "MODERATOR"; showHeading?: boolean; showNavigation?: boolean; detailOnly?: boolean; initialGlobalRecipeId?: string;
}) {
  const router = useRouter();
  const editorRef = useRef<HTMLFormElement>(null);
  const menuEditorRef = useRef<HTMLFormElement>(null);
  const detailRef = useRef<HTMLElement>(null);
  const owner = role === "owner";
  const admin = !owner && operatorRole === "ADMIN";
  const subject = authScopedQuerySubject(owner ? "OWNER" : operatorRole ?? "operator");
  const client = useQueryClient();
  const [view, setView] = useState<"global" | "legacy" | "sync">("global");
  const [operatorScreen, setOperatorScreen] = useState<"menus" | "recipes" | "detail">(initialGlobalRecipeId ? "detail" : "menus");
  const [menuPage, setMenuPage] = useState(0);
  const [recipePage, setRecipePage] = useState(0);
  const [ownerMenuPage, setOwnerMenuPage] = useState(0);
  const [menuId, setMenuId] = useState("");
  const [selectedId, setSelectedId] = useState(initialGlobalRecipeId ?? "");
  const [menuSearch, setMenuSearch] = useState("");
  const [menuQ, setMenuQ] = useState("");
  const [recipeSearch, setRecipeSearch] = useState("");
  const [recipeQ, setRecipeQ] = useState("");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [imagePath, setImagePath] = useState("");
  const [procedure, setProcedure] = useState(emptyRecipeProcedure);
  const [dryTamp, setDryTamp] = useState<string | null>("100");
  const [unsupportedProcedureSteps, setUnsupportedProcedureSteps] = useState<string[]>([]);
  const [mode, setMode] = useState<"view" | "create" | "edit">("view");
  const [confirmed, setConfirmed] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [validation, setValidation] = useState("");
  const [menuName, setMenuName] = useState("");
  const [menuAction, setMenuAction] = useState<"create" | "rename" | "delete" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [editTargetId, setEditTargetId] = useState("");
  const [moveMenuId, setMoveMenuId] = useState("");
  const [copyMenuId, setCopyMenuId] = useState("");

  const menus = useQuery({
    queryKey: ["dolores", "recipe-menus", "global", subject, menuPage, menuQ],
    queryFn: ({ signal }) => recipeMenusApi.listGlobal({ page: menuPage, size: 20, q: menuQ }, signal),
    enabled: view === "global", retry: false,
  });
  const menu = useQuery({
    queryKey: ["dolores", "recipe-menus", "global-detail", subject, menuId],
    queryFn: ({ signal }) => recipeMenusApi.getGlobal(menuId, signal),
    enabled: view === "global" && Boolean(menuId), retry: false,
  });
  const recipes = useQuery({
    queryKey: ["dolores", "recipes", "global", subject, menuId, recipePage, recipeQ],
    queryFn: async ({ signal }) => {
      if (!menuId) return recipesApi.listGlobalPage(recipePage, 20, signal, recipeQ);
      const page = await recipeMenusApi.listGlobalRecipes(menuId, { page: recipePage, size: 20, q: recipeQ }, signal);
      return { items: page.content, page: page.page, hasNext: !page.last, totalElements: page.totalElements };
    },
    enabled: view === "global" && !detailOnly && operatorScreen !== "menus", retry: false,
  });
  const recipeId = selectedId || (detailOnly ? initialGlobalRecipeId ?? "" : "");
  const detail = useQuery({
    queryKey: ["dolores", "recipes", "global-detail", subject, recipeId],
    queryFn: ({ signal }) => recipesApi.getGlobalById(recipeId, signal),
    enabled: view === "global" && Boolean(recipeId) && (detailOnly || operatorScreen === "detail"), retry: false,
  });
  const ownerMenus = useQuery({
    queryKey: ["dolores", "recipe-menus", "local", subject, ownerMenuPage],
    queryFn: ({ signal }) => recipeMenusApi.listLocal({ page: ownerMenuPage, size: 20 }, signal),
    enabled: owner && view === "global", retry: false,
  });
  useEffect(() => {
    if (initialGlobalRecipeId) {
      setSelectedId(initialGlobalRecipeId); setOperatorScreen("detail"); setMode("view"); setDeleteTarget(null); setEditTargetId("");
    } else if (!owner) {
      setSelectedId(""); setOperatorScreen("menus"); setMode("view");
    }
  }, [initialGlobalRecipeId, owner]);

  useEffect(() => {
    const form = menuAction ? menuEditorRef.current : mode !== "view" ? editorRef.current : null;
    if (form) {
      form.scrollIntoView({ block: "nearest" });
      form.querySelector<HTMLInputElement>("input:not([type=checkbox])")?.focus({ preventScroll: true });
    }
  }, [mode, menuAction]);

  useEffect(() => {
    if (selectedId && detail.data?.id === selectedId && mode === "view") {
      detailRef.current?.scrollIntoView({ block: "nearest" });
      detailRef.current?.querySelector<HTMLHeadingElement>("h3")?.focus({ preventScroll: true });
    }
  }, [selectedId, detail.data?.id, mode]);

  const invalidate = () => Promise.all([
    client.invalidateQueries({ queryKey: ["dolores", "recipes"] }),
    client.invalidateQueries({ queryKey: ["dolores", "recipe-menus"] }),
    client.invalidateQueries({ queryKey: ["dolores", "recipe-sync"] }),
    client.invalidateQueries({ queryKey: ["dolores", "recipe-sync-history"] }),
  ]);
  const clearFeedback = () => { setFeedback(""); setError(null); setValidation(""); };
  const write = useMutation({
    mutationFn: async (input: { payload: RecipePublishRequest; id?: string; target: string }) => {
      const recipe = input.id ? await recipesApi.updateGlobal(input.id, input.payload) : await recipesApi.publishGlobal(input.payload);
      if (!input.id && input.target && input.target !== recipe.menuId) {
        try { return { recipe: await recipeMenusApi.assignGlobalRecipe(input.target, recipe.id), moveError: undefined as unknown }; }
        catch (moveError) { return { recipe, moveError }; }
      }
      return { recipe, moveError: undefined as unknown };
    },
    onSuccess: async ({ recipe, moveError }) => {
      setSelectedId(recipe.id); setMode("view"); setOperatorScreen("detail");
      if (operatorRole === "MODERATOR") void router.replace(PATH_MODERATOR.MENU_RECIPE_DETAIL(recipe.id));
      setFeedback(moveError
        ? "Đã tạo công thức. Chưa xác nhận được menu đích; hãy tải lại chi tiết trước khi chuyển lại. Không tạo công thức lần nữa."
        : "Đã lưu công thức. Trạng thái máy áp dụng được theo dõi riêng trong phần đồng bộ.");
      if (moveError) setError(moveError);
      await invalidate();
    },
    onError: async (failure) => {
      setError(failure);
      const saved = getRecipeApiErrorDetails(failure);
      if (saved.saved) {
        if (GlobalRecipeIdSchema.safeParse(saved.recipeId).success) {
          setSelectedId(saved.recipeId!);
          if (operatorRole === "MODERATOR") void router.replace(PATH_MODERATOR.MENU_RECIPE_DETAIL(saved.recipeId!));
        }
        setMode("view"); setOperatorScreen("detail"); await invalidate();
      }
    },
    retry: false,
  });
  const changeMenu = useMutation({
    mutationFn: async (input: { action: "create" | "rename" | "delete"; menuId: string; name: string }) => {
      if (input.action === "create") return recipeMenusApi.createGlobal(input.name);
      if (input.action === "rename" && input.menuId) return recipeMenusApi.renameGlobal(input.menuId, input.name);
      if (input.action === "delete" && input.menuId) { await recipeMenusApi.deleteGlobal(input.menuId); return null; }
      throw new Error("No menu operation selected.");
    },
    onSuccess: async (result, variables) => {
      setMenuId(result?.id ?? ""); setSelectedId(""); setRecipePage(0); setMode("view"); setMenuAction(null);
      setOperatorScreen(variables.action === "delete" ? "menus" : "recipes");
      setFeedback("Đã cập nhật menu. Bạn có thể thêm hoặc chọn công thức trong menu này."); await invalidate();
    },
    onError: setError, retry: false,
  });
  const move = useMutation({
    mutationFn: (input: { remove: boolean; id: string; menuId: string }) => input.remove ? recipeMenusApi.removeGlobalRecipe(input.menuId, input.id) : recipeMenusApi.assignGlobalRecipe(input.menuId, input.id),
    onSuccess: async () => { setFeedback("Đã chuyển công thức sang menu đích."); await invalidate(); },
    onError: setError, retry: false,
  });
  const remove = useMutation({
    mutationFn: (id: string) => recipesApi.deleteGlobal(id),
    onSuccess: async () => {
      setSelectedId(""); setOperatorScreen("recipes"); setDeleteTarget(null); setFeedback("Đã xóa công thức.");
      if (operatorRole === "MODERATOR") void router.push(PATH_MODERATOR.MENU);
      await invalidate();
    },
    onError: setError, retry: false,
  });
  const copy = useMutation({
    mutationFn: (input: { globalRecipeId: string; menuId?: string }) => recipeMenusApi.copyGlobalRecipe(input),
    onSuccess: async () => { setFeedback("Đã lưu món vào menu của bạn. Mở Menu của tôi để xem bản sao riêng; công thức này được giữ lại khi Dolores cập nhật bản gốc."); await invalidate(); },
    onError: setError, retry: false,
  });

  const submitRecipe = (event: FormEvent) => {
    event.preventDefault(); clearFeedback();
    if (busy) return;
    if (mode === "edit" && unsupportedProcedureSteps.length) {
      setValidation("Không thể lưu an toàn vì một số bước pha hiện tại chưa thể chuyển thành thông số. Hãy giữ nguyên công thức hoặc nhờ quản trị viên kiểm tra dữ liệu.");
      return;
    }
    try {
      const payload: RecipePublishRequest = { name: name.trim(), procedure: buildRecipeProcedure(procedure, mode === "edit" ? dryTamp : undefined), ...(slug.trim() ? { slug: slug.trim() } : {}), ...(imagePath.trim() ? { imagePath: imagePath.trim() } : {}) };
      if (!payload.name || (mode === "edit" && !confirmed)) { setValidation("Nhập tên và xác nhận quy trình mới trước khi lưu."); return; }
      if (mode === "edit" && !editTargetId) return;
      write.mutate({ payload, ...(mode === "edit" ? { id: editTargetId } : {}), target: menuId });
    } catch { setValidation("Kiểm tra lượng cà phê, lượng nước và các thông số. Mã công thức sữa phải là số nguyên."); }
  };
  const openForm = (edit: boolean) => {
    const currentRecipe = edit ? detail.data : undefined;
    const currentProcedure = currentRecipe ? readRecipeProcedure(currentRecipe.steps) : null;
    clearFeedback(); setMenuAction(null); setMode(edit ? "edit" : "create"); setName(edit ? detail.data?.name ?? "" : "");
    setSlug(""); setImagePath(""); setProcedure(currentProcedure?.draft ?? emptyRecipeProcedure());
    setDryTamp(edit ? currentProcedure?.dryTamp ?? null : "100");
    setUnsupportedProcedureSteps(currentProcedure?.unsupported ?? []);
    setConfirmed(false); setDeleteTarget(null); setEditTargetId(edit ? detail.data?.id ?? "" : "");
  };
  const pagination = (page: number, hasNext: boolean, onChange: (value: number) => void, label: string) => page === 0 && !hasNext ? null : <nav className={styles.recipeMenuPagination} aria-label={label}>
    <ButtonBar disabled={busy || page === 0} onClick={() => onChange(page - 1)}>Trang trước</ButtonBar><span>Trang {page + 1}</span>
    <ButtonBar disabled={busy || !hasNext} onClick={() => onChange(page + 1)}>Trang sau</ButtonBar>
  </nav>;
  const busy = write.isPending || move.isPending || remove.isPending || copy.isPending || changeMenu.isPending;
  const openMenu = (id: string) => {
    setMenuId(id);
    setSelectedId("");
    setRecipePage(0);
    setOperatorScreen("recipes");
    setMode("view");
    setMenuAction(null);
    setDeleteTarget(null);
    setMoveMenuId("");
  };
  const openRecipe = (id: string) => {
    if (owner) { void router.push(PATH_CUSTOMER.MENU_RECIPE(id)); return; }
    if (operatorRole === "MODERATOR") { void router.push(PATH_MODERATOR.MENU_RECIPE_DETAIL(id)); return; }
    setSelectedId(id);
    setOperatorScreen("detail");
    setMode("view");
    setDeleteTarget(null);
    clearFeedback();
  };
  const recipeStepValue = (directive: string) => detail.data?.steps.find((step) => step.startsWith(`${directive}:`))?.slice(directive.length + 1);
  const coffeeDose = recipeStepValue("DOSE");
  const waterVolume = recipeStepValue("EXTRACT");
  const milkVolume = recipeStepValue("PREMILK") ?? recipeStepValue("POSTMILK");

  return <div className={showHeading ? styles.pageContent : styles.screen}>
    {showHeading ? <BackButtonHeading title={owner ? "Công thức pha chế" : "Global Menu & công thức"} titleId="recipe-management-title"
      description={owner ? "Khám phá menu Dolores và lưu món yêu thích vào menu riêng." : "Quản lý menu dùng chung và các công thức pha chế của Dolores."} back={null} /> : null}
    {view === "global" && mode === "view" && (operatorScreen === "recipes" || operatorScreen === "detail" || detailOnly) ? <button type="button" onClick={() => {
      if (detailOnly && owner) { void router.push(PATH_CUSTOMER.MENU); return; }
      if (operatorRole === "MODERATOR" && initialGlobalRecipeId) { void router.push(PATH_MODERATOR.MENU); return; }
      setSelectedId(""); setOperatorScreen(operatorScreen === "detail" ? "recipes" : "menus"); setMode("view");
    }}>Quay lại</button> : null}
    {showNavigation ? <nav className={styles.recipeMenuTabs} aria-label="Khu vực công thức">
      <button type="button" aria-pressed={view === "global"} className={view === "global" ? styles.recipeMenuTabActive : ""} onClick={() => setView("global")}>Thư viện dùng chung</button>
      {owner ? <>
        <button type="button" onClick={() => void router.push(PATH_CUSTOMER.MENU_ADJUSTMENTS)}>Menu của tôi</button>
        <button type="button" onClick={() => void router.push(PATH_CUSTOMER.MENU_SYNC)}>Đồng bộ với máy</button>
      </> : admin ? <>
        <button type="button" aria-pressed={view === "legacy"} className={view === "legacy" ? styles.recipeMenuTabActive : ""} onClick={() => setView("legacy")}>Điều chỉnh cũ</button>
        <button type="button" aria-pressed={view === "sync"} className={view === "sync" ? styles.recipeMenuTabActive : ""} onClick={() => setView("sync")}>Theo dõi đồng bộ</button>
      </> : null}
    </nav> : null}
    {view === "legacy" && admin ? <LegacyRecipeOverrides role="ADMIN" /> : null}
    {view === "sync" && admin ? <RecipeSyncPanel role="ADMIN" /> : null}
    {view === "global" ? <>
      {feedback ? <p className={styles.recipeMenuSuccess} role="status">{feedback}</p> : null}
      {error ? <p className={styles.recipeMenuError} role="alert">{getRecipeApiErrorMessage(error, "mutation")}</p> : null}
      {mode === "view" && !detailOnly && operatorScreen === "menus" ? <section className={styles.recipeMenuPanel}>
        <div className={styles.panelHeading}><div><h2>Danh sách</h2></div>
        </div>
        <form className={styles.recipeMenuToolbar} onSubmit={(event) => { event.preventDefault(); if (busy) return; setMenuQ(menuSearch); setMenuPage(0); setMoveMenuId(""); setDeleteTarget(null); setMode("view"); setMenuAction(null); }}>
          <label className={styles.formField}><span>Tìm menu</span><input placeholder="Nhập tên menu…" value={menuSearch} onChange={(event) => setMenuSearch(event.target.value)} /></label>
          <ButtonBar type="submit">Tìm kiếm</ButtonBar>
        </form>
        {menus.isPending ? <p role="status">Đang tải menu…</p> : null}
        {menus.isError ? <div role="alert"><p>{getRecipeApiErrorMessage(menus.error)}</p><ButtonBar onClick={() => void menus.refetch()}>Thử lại</ButtonBar></div> : null}
        {menus.data ? <>
          <div className={styles.recipeMenuTableScroll}>
            <table className={styles.recipeMenuTable}>
              <thead><tr><th scope="col">Menu</th><th scope="col">Ngày tạo</th></tr></thead>
              <tbody>
                {menus.data.content.map((item) => <tr key={item.id} data-clickable="true" data-selected={menuId === item.id || undefined}
                  tabIndex={busy ? -1 : 0} aria-label={`Mở menu ${item.name}`}
                  onClick={() => { if (!busy) openMenu(item.id); }}
                  onKeyDown={(event) => {
                    if ((event.key === "Enter" || event.key === " ") && !busy) {
                      event.preventDefault();
                      openMenu(item.id);
                    }
                  }}>
                  <th scope="row">{item.name}</th>
                  <td>{Number.isNaN(new Date(item.createdAt).getTime()) ? "—" : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(new Date(item.createdAt))}</td>
                </tr>)}
                {!menus.data.content.length ? <tr><td colSpan={2}>Chưa có menu phù hợp.</td></tr> : null}
              </tbody>
            </table>
          </div>
          {pagination(menus.data.page, !menus.data.last, (page) => { setMenuPage(page); setMoveMenuId(""); setDeleteTarget(null); setMode("view"); setMenuAction(null); }, "Danh sách menu")}
        </> : null}
        {menu.isError ? <p role="alert">{getRecipeApiErrorMessage(menu.error)}</p> : null}
        {!owner && menuAction === "create" ? <form ref={menuEditorRef} className={styles.recipeMenuEditor} aria-label="Quản lý menu" aria-busy={changeMenu.isPending} onSubmit={(event) => { event.preventDefault(); if (busy) return; clearFeedback(); changeMenu.mutate({ action: menuAction, menuId, name: menuName }); }}>
          <h3>Menu mới</h3>
          <label className={styles.formField}><span>Tên menu *</span><input required maxLength={255} placeholder="Ví dụ: Cà phê truyền thống" value={menuName} onChange={(event) => setMenuName(event.target.value)} /></label>
          <div className={styles.recipeMenuActions}><ButtonBar type="submit" disabled={busy || !menuName.trim()}>{changeMenu.isPending ? "Đang lưu…" : "Tạo menu"}</ButtonBar><ButtonBar disabled={busy} onClick={() => setMenuAction(null)}>Hủy</ButtonBar></div>
        </form> : null}
      </section> : null}
      {mode !== "view" || detailOnly || operatorScreen !== "menus" ? <section className={styles.recipeMenuPanel}>
        {mode === "view" && operatorScreen === "recipes" ? <div className={styles.panelHeading}><div>
          <h2>{menu.data?.name ?? (menuId ? "Menu đang chọn" : "Tất cả công thức")} · các món</h2>
          <p>{menuId && recipes.data && "totalElements" in recipes.data ? `${recipes.data.totalElements} món trong menu.` : "Chọn một món để xem thông tin chi tiết."}</p>
        </div>{!owner ? <div className={styles.recipeMenuActions}>
          {menuId && menu.data ? <>
            <ButtonBar disabled={menuId === DEFAULT_MENU || busy} onClick={() => { clearFeedback(); setMenuName(menu.data.name); setMenuAction("rename"); }}>Đổi tên menu</ButtonBar>
            <ButtonBar disabled={menuId === DEFAULT_MENU || busy || !recipes.data || !("totalElements" in recipes.data) || recipes.data.totalElements > 0}
              onClick={() => { clearFeedback(); setMenuAction("delete"); }}>Xóa menu rỗng</ButtonBar>
          </> : null}

        </div> : null}</div> : null}
        {!owner && operatorScreen === "recipes" && (menuAction === "rename" || menuAction === "delete") ? <form ref={menuEditorRef} className={styles.recipeMenuEditor} aria-label="Quản lý menu" aria-busy={changeMenu.isPending} onSubmit={(event) => { event.preventDefault(); if (busy) return; clearFeedback(); changeMenu.mutate({ action: menuAction, menuId, name: menuName }); }}>
          <h3>{menuAction === "delete" ? "Xóa menu đang chọn?" : "Đổi tên menu"}</h3>
          {menuAction === "rename" ? <label className={styles.formField}><span>Tên menu *</span><input required maxLength={255} placeholder="Ví dụ: Cà phê truyền thống" value={menuName} onChange={(event) => setMenuName(event.target.value)} /></label> : <p>Chỉ xóa được khi menu không còn công thức.</p>}
          <div className={styles.recipeMenuActions}><ButtonBar type="submit" disabled={busy || (menuAction === "rename" && !menuName.trim())}>{changeMenu.isPending ? "Đang lưu…" : menuAction === "rename" ? "Lưu tên menu" : "Xóa menu"}</ButtonBar><ButtonBar disabled={busy} onClick={() => setMenuAction(null)}>Hủy</ButtonBar></div>
        </form> : null}
        <div className={styles.recipeMenuWorkspace} data-editing={mode !== "view" || detailOnly}>
        {mode === "view" && !detailOnly && operatorScreen === "recipes" ? <div className={styles.recipeMenuBrowser}>
        <form className={styles.recipeMenuToolbar} onSubmit={(event) => { event.preventDefault(); if (busy) return; setRecipeQ(recipeSearch); setRecipePage(0); setSelectedId(""); setMode("view"); setDeleteTarget(null); }}>
          <label className={styles.formField}><span>Tìm công thức</span><input placeholder="Nhập tên món, ví dụ Espresso…" value={recipeSearch} onChange={(event) => setRecipeSearch(event.target.value)} /></label><ButtonBar type="submit">Tìm kiếm</ButtonBar>
        </form>
        {recipes.isPending ? <p role="status">Đang tải công thức…</p> : null}
        {recipes.isError ? <div role="alert"><p>{getRecipeApiErrorMessage(recipes.error)}</p><ButtonBar onClick={() => void recipes.refetch()}>Thử lại</ButtonBar></div> : null}
        {recipes.data ? <>
          <div className={styles.recipeMenuTableScroll}>
            <table className={styles.recipeMenuTable}>
              <thead><tr><th scope="col">Món</th><th scope="col">Phiên bản</th></tr></thead>
              <tbody>
                {recipes.data.items.map((item) => <tr key={item.id} data-clickable="true" tabIndex={busy ? -1 : 0}
                  aria-label={`Mở công thức ${item.name}`} onClick={() => { if (!busy) openRecipe(item.id); }}
                  onKeyDown={(event) => {
                    if ((event.key === "Enter" || event.key === " ") && !busy) {
                      event.preventDefault();
                      openRecipe(item.id);
                    }
                  }}>
                  <th scope="row">{item.name}</th>
                  <td>v{item.revision}</td>
                </tr>)}
                {!recipes.data.items.length ? <tr><td colSpan={2}>Chưa có món nào trong menu này.</td></tr> : null}
              </tbody>
            </table>
          </div>
          {pagination(recipes.data.page, recipes.data.hasNext, (page) => { setRecipePage(page); setSelectedId(""); setMode("view"); setDeleteTarget(null); }, "Danh sách công thức")}
        </> : null}
        </div> : null}
        {!owner && mode !== "view" ? <form id="global-recipe-form" ref={editorRef} className={styles.recipeMenuEditor} onInvalidCapture={(event) => { const disclosure = (event.target as HTMLElement).closest("details"); if (disclosure) disclosure.open = true; }} onSubmit={submitRecipe} aria-label="Thông tin công thức" aria-busy={write.isPending}>
          <div className={styles.panelHeading}><div><h3>{mode === "create" ? "Thêm công thức mới" : "Chỉnh sửa công thức"}</h3><p>{mode === "edit" ? <>Đang sửa <strong>{name || "công thức"}</strong> · Phiên bản v{detail.data?.revision ?? "—"} · Menu: <strong>{menus.data?.content.find((item) => item.id === detail.data?.menuId)?.name ?? "Menu hiện tại"}</strong></> : <>Menu đích: <strong>{menus.data?.content.find((item) => item.id === menuId)?.name ?? menu.data?.name ?? (!menuId || menuId === DEFAULT_MENU ? "Menu mặc định" : "Menu đã chọn (chưa tải được tên)")}</strong></>}</p></div></div>
          {mode === "edit" && unsupportedProcedureSteps.length ? <div className={styles.recipeMenuError} role="alert"><div><strong>Không thể nạp đầy đủ thông số pha.</strong><p>Để tránh làm mất bước khi lưu, hãy giữ nguyên công thức này hoặc nhờ quản trị viên kiểm tra dữ liệu.</p><ul>{unsupportedProcedureSteps.map((step, index) => <li key={`${index}-${step}`}>{step}</li>)}</ul></div></div> : null}
          <section className={styles.recipeMenuEditSection} aria-labelledby="recipe-identity-heading">
            <div className={styles.recipeMenuEditSectionHeading}><h4 id="recipe-identity-heading">Thông tin món</h4></div>
            <label className={styles.formField}><span>Tên món / công thức *</span><input required placeholder="Ví dụ: Espresso đậm vị" value={name} onChange={(event) => setName(event.target.value)} /></label>
            <details className={styles.recipeMenuDisclosure}><summary>Mã tên và ảnh · không bắt buộc</summary><div className={styles.recipeMenuFormGrid}>
              <label className={styles.formField}><span>Mã tên</span><input value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="espresso" /></label>
              <label className={styles.formField + " " + styles.recipeMenuFieldWide}><span>Đường dẫn ảnh</span><input value={imagePath} onChange={(event) => setImagePath(event.target.value)} placeholder="assets/images/espresso.webp" /></label>
            </div></details>
          </section>
          <section className={styles.recipeMenuEditSection} aria-labelledby="recipe-procedure-heading">
            <div className={styles.recipeMenuEditSectionHeading}><h4 id="recipe-procedure-heading">Thông số pha</h4></div>
            <RecipeProcedureFields value={procedure} onChange={setProcedure} prefix="global-procedure" disabled={write.isPending} />
          </section>
          {mode === "edit" ? <label className={styles.recipeMenuConfirmation}><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} required /> Tôi đã kiểm tra các thông số được nạp từ công thức hiện tại trước khi lưu.</label> : null}
          {validation ? <p className={styles.recipeMenuError} role="alert">{validation}</p> : null}

        </form> : null}
        {mode === "view" && recipeId && (detailOnly || operatorScreen === "detail") ? <section ref={detailRef} className={styles.recipeMenuDetail} aria-label="Chi tiết công thức">
          {detail.isPending ? <p role="status">Đang tải chi tiết…</p> : null}
          {detail.isError ? <div role="alert"><p>{getRecipeApiErrorMessage(detail.error)}</p><ButtonBar onClick={() => void detail.refetch()}>Thử lại</ButtonBar></div> : null}
          {detail.data ? <>
            <div className={styles.panelHeading}><div><h3 tabIndex={-1}>{detail.data.name}</h3><p>Phiên bản v{detail.data.revision}</p></div></div>
            <div className={styles.recipeMenuDetailGrid}>
              <div><span>Menu / món</span><strong>{(menus.data?.content.find((item) => item.id === detail.data.menuId)?.name ?? (detail.data.menuId === DEFAULT_MENU ? "Menu mặc định" : "Chưa tải được tên menu")) + " / " + detail.data.name}</strong></div>
              <div><span>Thành phần</span><strong>{coffeeDose ? milkVolume ? "Cà phê và sữa" : "Cà phê" : "Chưa có thông số thành phần"}</strong></div>
              <div><span>Lượng cà phê</span><strong>{coffeeDose ? `${coffeeDose} g` : "Chưa có thông số"}</strong></div>
              <div><span>Lượng nước pha</span><strong>{waterVolume ? `${waterVolume} ml` : "Chưa có thông số"}</strong></div>
            </div>
            <h4>Các bước pha</h4><RecipeSteps steps={detail.data.steps} />
            <details className={styles.recipeMenuDisclosure}><summary>Lưu ý về thông số và đồng bộ</summary><p className={styles.recipeMenuMeta}>Các bước thư viện trả về có thể chưa phản ánh quy trình vừa cập nhật. Dữ liệu này chưa đủ để xác nhận toàn bộ thông số vật lý hoặc trạng thái máy đang áp dụng.</p></details>
            {owner ? <div className={styles.recipeMenuCopyPanel}><h4>Lưu món này vào menu của tôi</h4><p className={styles.recipeMenuMeta}>Chọn menu nhận bản sao. Công thức gốc trong thư viện vẫn được giữ nguyên.</p>
              {ownerMenus.isPending ? <p>Đang tải menu của bạn…</p> : null}
              {ownerMenus.isError ? <div role="alert"><p>{getRecipeApiErrorMessage(ownerMenus.error)}</p><ButtonBar onClick={() => void ownerMenus.refetch()}>Thử lại</ButtonBar></div> : null}
              {ownerMenus.data ? <>
                {ownerMenus.data.totalElements > 0 ? <label className={styles.formField}><span>Sao chép vào menu của tôi *</span><select aria-label="Sao chép vào menu của tôi" value={copyMenuId} onChange={(event) => setCopyMenuId(event.target.value)}><option value="">Chọn menu</option>{ownerMenus.data.content.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label> : <p>Chưa có menu riêng; bản sao sẽ tạo cùng “Menu của tôi”.</p>}
                {pagination(ownerMenus.data.page, !ownerMenus.data.last, (page) => { setOwnerMenuPage(page); setCopyMenuId(""); }, "Menu đích của Owner")}
                <ButtonBar disabled={busy || (ownerMenus.data.totalElements > 0 && !copyMenuId)} onClick={() => { clearFeedback(); copy.mutate({ globalRecipeId: detail.data.id, ...(copyMenuId ? { menuId: copyMenuId } : {}) }); }}>{copy.isPending ? "Đang sao chép…" : "Lưu bản sao riêng"}</ButtonBar>
                <ButtonBar href={PATH_CUSTOMER.MENU_ADJUSTMENTS}>Mở Menu của tôi</ButtonBar>
              </> : null}
            </div> : <details className={styles.recipeMenuDisclosure}><summary>Sắp xếp hoặc xóa công thức</summary><div className={styles.recipeMenuOperatorTools}>
              <label className={styles.formField}><span>Chuyển công thức sang menu</span><select aria-label="Chuyển công thức sang menu" value={moveMenuId} onChange={(event) => setMoveMenuId(event.target.value)}><option value="">Chọn menu đích</option>{menus.data?.content.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <div className={styles.recipeMenuActions}>
                <ButtonBar disabled={busy || !moveMenuId || moveMenuId === detail.data.menuId} onClick={() => { clearFeedback(); move.mutate({ remove: false, id: detail.data.id, menuId: moveMenuId }); }}>Chuyển menu</ButtonBar>
                <ButtonBar disabled={busy || !detail.data.menuId || detail.data.menuId === DEFAULT_MENU} onClick={() => { clearFeedback(); move.mutate({ remove: true, id: detail.data.id, menuId: detail.data.menuId! }); }}>Về menu mặc định</ButtonBar>
                <ButtonBar disabled={busy} onClick={() => setDeleteTarget({ id: detail.data.id, name: detail.data.name })}>Xóa công thức</ButtonBar>
              </div>
              {deleteTarget ? <div className={styles.recipeMenuEditor}><p>Xóa “{deleteTarget.name}”? Hệ thống có thể từ chối nếu còn điều chỉnh cũ tham chiếu.</p><div className={styles.recipeMenuActions}><ButtonBar disabled={busy} onClick={() => { clearFeedback(); remove.mutate(deleteTarget.id); }}>Xác nhận xóa</ButtonBar><ButtonBar disabled={busy} onClick={() => setDeleteTarget(null)}>Hủy</ButtonBar></div></div> : null}
            </div></details>}
          </> : null}
        </section> : null}
        </div>
      </section> : null}
      <PageActions actions={view === "global" && !owner && mode !== "view" ? [
        { id: "recipe-cancel", label: "Hủy", priority: 100, disabled: busy, onClick: () => { clearFeedback(); setMode("view"); if (editTargetId) setOperatorScreen("detail"); else setOperatorScreen("recipes"); }, confirm: { title: "Hủy chỉnh sửa?", description: "Các thay đổi chưa lưu sẽ bị mất.", confirmLabel: "Hủy chỉnh sửa" } },
        { id: "recipe-save", label: "Lưu công thức", variant: "primary", priority: 100, type: "submit", form: "global-recipe-form", disabled: busy || (mode === "edit" && !confirmed), disabledReason: "Xác nhận thay đổi và chờ yêu cầu hoàn tất.", pending: write.isPending, pendingLabel: "Đang lưu…" },
      ] : view === "global" && !owner && mode === "view" && !detailOnly && operatorScreen === "menus" && !menuAction ? [{ id: "menu-create", label: "T\u1ea1o menu", variant: "primary", priority: 20, disabled: busy, disabledReason: "\u0110ang x\u1eed l\u00fd y\u00eau c\u1ea7u.", onClick: () => { clearFeedback(); setMenuAction("create"); setMenuName(""); } }] : view === "global" && !owner && mode === "view" && operatorScreen === "recipes" && !menuAction ? [{ id: "recipe-create", label: "Th\u00eam m\u00f3n", variant: "primary", priority: 20, disabled: busy, disabledReason: "\u0110ang x\u1eed l\u00fd y\u00eau c\u1ea7u.", onClick: () => openForm(false) }] : view === "global" && (detailOnly || (mode === "view" && operatorScreen === "detail")) && !owner && mode === "view" ? [{ id: "recipe-edit", label: `Chỉnh sửa ${detail.data?.name ?? "món"}`, variant: "primary", priority: 10, disabled: busy || !detail.data, disabledReason: "Đang tải hoặc xử lý công thức.", onClick: () => openForm(true) }] : []} />
    </> : null}
  </div>;
}
