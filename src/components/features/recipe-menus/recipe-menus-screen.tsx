import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/router";
import { recipesApi } from "@/apis/recipes.api";
import { recipeMenusApi } from "@/apis/recipe-menus.api";
import { ButtonBar } from "@/components/button/button-bar";
import { DataTable } from "@/components/table/data-table";
import { TableFilters } from "@/components/table/table-filters";
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
  const menuDialog = useRef<HTMLDialogElement>(null);
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
    if (!owner && menuAction && !menuDialog.current?.open) menuDialog.current?.showModal();
    const form = menuAction ? menuEditorRef.current : mode !== "view" ? editorRef.current : null;
    if (form) {
      form.scrollIntoView({ block: "nearest" });
      form.querySelector<HTMLInputElement>("input:not([type=checkbox])")?.focus({ preventScroll: true });
    }
  }, [owner, mode, menuAction]);

  useEffect(() => {
    if (selectedId && detail.data?.id === selectedId && mode === "view") {
      const title = document.getElementById("recipe-management-title");
      if (!owner && title) { title.focus(); return; }
      detailRef.current?.scrollIntoView({ block: "nearest" });
      detailRef.current?.querySelector<HTMLHeadingElement>("h3")?.focus({ preventScroll: true });
    }
  }, [owner, selectedId, detail.data?.id, mode]);

  const invalidate = () => Promise.all([
    client.invalidateQueries({ queryKey: ["dolores", "recipes"] }),
    client.invalidateQueries({ queryKey: ["dolores", "recipe-menus"] }),
    client.invalidateQueries({ queryKey: ["dolores", "recipe-sync"] }),
    client.invalidateQueries({ queryKey: ["dolores", "recipe-sync-history"] }),
  ]);
  const clearFeedback = () => { setFeedback(""); setError(null); setValidation(""); };
  const closeMenuDialog = () => { menuDialog.current?.close(); setMenuAction(null); };
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
      setMenuId(result?.id ?? ""); setSelectedId(""); setRecipePage(0); setMode("view"); closeMenuDialog();
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
    setRecipeSearch(""); setRecipeQ("");
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
  const coffeeDose = recipeStepValue("DOSE") ?? recipeStepValue("GRIND");
  const waterVolume = recipeStepValue("EXTRACT") ?? recipeStepValue("BREW");

  const activeMenu = menu.data?.name ?? menus.data?.content.find((item) => item.id === menuId)?.name
    ?? (menuId && menuId !== DEFAULT_MENU ? "Menu đang chọn" : "Menu mặc định");
  const detailMenu = menus.data?.content.find((item) => item.id === detail.data?.menuId)?.name
    ?? (detail.data?.menuId === menuId ? activeMenu : detail.data?.menuId === DEFAULT_MENU ? "Menu mặc định" : "Chưa tải được tên menu");
  const library = operatorScreen === "menus" && mode === "view";
  const editing = mode !== "view";
  const backToList = () => {
    if (detailOnly && owner) { void router.push(PATH_CUSTOMER.MENU); return; }
    if (operatorRole === "MODERATOR" && initialGlobalRecipeId) { void router.push(PATH_MODERATOR.MENU); return; }
    clearFeedback(); setSelectedId(""); setMenuAction(null);
    setOperatorScreen(operatorScreen === "detail" ? "recipes" : "menus");
  };
  const recipeTools = useRef<HTMLDetailsElement>(null);
  const toggleTools = (tools: HTMLDetailsElement | null) => {
    if (tools) { tools.open = !tools.open; if (tools.open) tools.querySelector("summary")?.focus({ preventScroll: true }); if (tools.open) tools.scrollIntoView({ block: "nearest" }); }
  };
  const formatMenuDate = (date: string) => Number.isNaN(new Date(date).getTime()) ? "—" : new Intl.DateTimeFormat("vi-VN", { dateStyle: "short" }).format(new Date(date));
  const canDeleteMenu = !recipeQ && recipes.isSuccess && !recipes.isFetching && "totalElements" in recipes.data && recipes.data.totalElements === 0;
  const searchMenus = (event: FormEvent) => { event.preventDefault(); if (busy) return; setMenuQ(menuSearch); setMenuPage(0); setMoveMenuId(""); setDeleteTarget(null); setMode("view"); setMenuAction(null); };
  const searchRecipes = (event: FormEvent) => { event.preventDefault(); if (busy) return; setRecipeQ(recipeSearch); setRecipePage(0); setSelectedId(""); setMode("view"); setDeleteTarget(null); };
  const extraRecipeFields = <details className={styles.recipeMenuDisclosure}><summary>{admin ? "Mã món và đường dẫn ảnh" : "Mã tên và ảnh · không bắt buộc"}</summary><div className={styles.recipeMenuFormGrid}>
              <label className={styles.formField}><span>{admin ? "Mã món" : "Mã tên"}</span><input value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="espresso" /></label>
              <label className={styles.formField + " " + styles.recipeMenuFieldWide}><span>Đường dẫn ảnh</span><input value={imagePath} onChange={(event) => setImagePath(event.target.value)} placeholder="assets/images/espresso.webp" /></label>
            </div></details>;

  return <div className={showHeading ? styles.pageContent : styles.screen} data-recipe-layout data-recipe-mode={view === "global" ? editing ? "editor" : operatorScreen : undefined}>
    {showHeading && !owner ? <header className={styles.adminRecipeHeader}>
      <div>
        {view === "global" && !library && !editing ? <ButtonBar className={styles.adminRecipeBack} onClick={backToList}>{operatorScreen === "detail" ? "Về danh sách món" : "Về danh sách menu"}</ButtonBar> : null}
        <h1 id="recipe-management-title" tabIndex={-1}>{view !== "global" || library ? "Công thức pha chế" : mode === "create" ? "Thêm công thức" : mode === "edit" ? "Chỉnh sửa công thức" : operatorScreen === "detail" ? detail.data?.name ?? "Chi tiết công thức" : activeMenu}</h1>
        {view === "global" && library ? <p>Quản lý menu và công thức dùng chung.</p> : null}
        {view === "global" && mode === "create" ? <p>Menu đích: {activeMenu}</p> : null}
        {view === "global" && mode !== "create" && detail.data && (mode === "edit" || operatorScreen === "detail") ? <p>{editing ? detail.data.name : detailMenu} · Phiên bản v{detail.data.revision}</p> : null}
      </div>
      {view === "global" ? <div className={styles.recipeMenuActions}>
        {library ? <ButtonBar variant="primary" disabled={busy} onClick={() => { clearFeedback(); setMenuName(""); setMenuAction("create"); }}>Tạo menu</ButtonBar>
          : editing ? <>
            <ButtonBar disabled={busy} onClick={() => { if (!window.confirm("Hủy chỉnh sửa? Các thay đổi chưa lưu sẽ bị mất.")) return; clearFeedback(); setMode("view"); setOperatorScreen(editTargetId ? "detail" : "recipes"); }}>Hủy</ButtonBar>
            <ButtonBar variant="primary" type="submit" form="global-recipe-form" disabled={busy || (mode === "edit" && (!confirmed || unsupportedProcedureSteps.length > 0))}>{write.isPending ? "Đang lưu…" : "Lưu công thức"}</ButtonBar>
          </> : operatorScreen === "recipes" ? <>
            {menu.data && menuId !== DEFAULT_MENU ? <>
              <ButtonBar disabled={busy} onClick={() => { clearFeedback(); setMenuName(menu.data.name); setMenuAction("rename"); }}>Đổi tên menu</ButtonBar>
              {canDeleteMenu ? <ButtonBar variant="danger" disabled={busy} onClick={() => { clearFeedback(); setMenuAction("delete"); }}>Xóa menu</ButtonBar> : null}
            </> : null}
            <ButtonBar variant="primary" disabled={busy} onClick={() => openForm(false)}>Thêm món</ButtonBar>
          </> : <>
            <ButtonBar variant="primary" disabled={busy || !detail.data} onClick={() => openForm(true)}>Chỉnh sửa</ButtonBar>
            <ButtonBar disabled={busy || !detail.data} onClick={() => toggleTools(recipeTools.current)}>Thao tác</ButtonBar>
          </>}
      </div> : null}
    </header> : null}
    {showHeading && owner ? <BackButtonHeading title="Công thức pha chế" titleId="recipe-management-title"
      description="Khám phá công thức Dolores và lưu món yêu thích vào menu riêng." className={styles.pageHeading} back={null} /> : null}
    {owner && !library ? <div><ButtonBar onClick={backToList}>{detailOnly ? "Về thư viện Dolores" : "Về danh sách menu"}</ButtonBar></div> : null}
    {showNavigation && (library || view !== "global") ? <nav className={styles.recipeMenuTabs} aria-label="Khu vực công thức">
      <button type="button" aria-pressed={view === "global"} className={view === "global" ? styles.recipeMenuTabActive : ""} onClick={() => setView("global")}>Menu dùng chung</button>
      {owner ? <>
        <button type="button" onClick={() => void router.push(PATH_CUSTOMER.MENU_ADJUSTMENTS)}>Menu của tôi</button>
        <button type="button" onClick={() => void router.push(PATH_CUSTOMER.MENU_SYNC)}>Đồng bộ với máy</button>
      </> : admin ? <>
        <button type="button" aria-pressed={view === "legacy"} className={view === "legacy" ? styles.recipeMenuTabActive : ""} onClick={() => setView("legacy")}>Điều chỉnh định lượng cũ</button>
        <button type="button" aria-pressed={view === "sync"} className={view === "sync" ? styles.recipeMenuTabActive : ""} onClick={() => setView("sync")}>Đồng bộ với máy</button>
      </> : null}
    </nav> : null}
    {view === "legacy" && admin ? <LegacyRecipeOverrides role="ADMIN" /> : null}
    {view === "sync" && admin ? <RecipeSyncPanel role="ADMIN" /> : null}
    {view === "global" ? <>
        {!owner && menuAction ? <dialog ref={menuDialog} className={styles.adminRecipeDialog} aria-labelledby="create-menu-title" onCancel={(event) => {
          event.preventDefault(); if (!busy) { clearFeedback(); closeMenuDialog(); }
        }}>
          <form ref={menuEditorRef} onSubmit={(event) => { event.preventDefault(); if (busy || (menuAction === "delete" ? !canDeleteMenu : !menuName.trim())) return; clearFeedback(); changeMenu.mutate({ action: menuAction, menuId, name: menuName }); }}>
            <div className={styles.panelHeading}>
              <h2 id="create-menu-title">{menuAction === "create" ? "Tạo menu" : menuAction === "rename" ? "Đổi tên menu" : "Xóa menu?"}</h2>
              <button type="button" className={styles.adminRecipeDialogClose} aria-label="Đóng hộp thoại" disabled={busy} onClick={() => { clearFeedback(); closeMenuDialog(); }}>×</button>
            </div>
            {menuAction === "delete" ? <p>Xóa “{activeMenu}”? Thao tác này không thể hoàn tác.</p> : <label className={styles.formField}><span>Tên menu *</span><input required maxLength={255} placeholder="Ví dụ: Menu buổi sáng" value={menuName} onChange={(event) => setMenuName(event.target.value)} /></label>}
            {error ? <p className={styles.recipeMenuError} role="alert">{getRecipeApiErrorMessage(error, "mutation")}</p> : null}
            <div className={styles.recipeMenuActions}>
              <ButtonBar disabled={busy} onClick={() => { clearFeedback(); closeMenuDialog(); }}>Hủy</ButtonBar>
              <ButtonBar variant={menuAction === "delete" ? "danger" : "primary"} holdToConfirm={menuAction === "delete"} type="submit" disabled={busy || (menuAction === "delete" ? !canDeleteMenu : !menuName.trim())}>{busy ? "Đang xử lý…" : menuAction === "create" ? "Tạo menu" : menuAction === "rename" ? "Lưu tên menu" : "Giữ để xóa"}</ButtonBar>
            </div>
          </form>
        </dialog> : null}
      {feedback ? <p className={styles.recipeMenuSuccess} role="status">{feedback}</p> : null}
      {error && !(!owner && menuAction) ? <p className={styles.recipeMenuError} role="alert">{getRecipeApiErrorMessage(error, "mutation")}</p> : null}
      {mode === "view" && !detailOnly && operatorScreen === "menus" ? <section className={styles.recipeMenuPanel}>
        <div className={styles.panelHeading}><div><h2>Danh sách menu</h2></div>
        </div>
        <TableFilters search={{ ariaLabel: "Tìm menu", placeholder: "Tìm theo tên menu", value: menuSearch, maxLength: 200, onChange: setMenuSearch }}
          submitLabel="Tìm kiếm" onSubmit={searchMenus} disabled={busy} />
        {menus.isPending ? <p role="status">Đang tải menu…</p> : null}
        {menus.isError ? <div role="alert"><p>{getRecipeApiErrorMessage(menus.error)}</p><ButtonBar onClick={() => void menus.refetch()}>Thử lại</ButtonBar></div> : null}
        {menus.data ? <>
          <DataTable variant="accounts" style={{ minWidth: 0 }} rows={menus.data.content} rowKey={(item) => item.id} emptyMessage="Chưa có menu phù hợp." columns={[
            { key: "name", header: "Tên menu", cellProps: () => ({ className: styles.adminRecipeName }), render: (item) => <strong>{item.name}</strong> },
            { key: "date", header: "Ngày tạo", render: (item) => formatMenuDate(item.createdAt) },
            { key: "action", header: "", align: "right", render: (item) => <ButtonBar rollingLabel disabled={busy} aria-label={"Mở menu " + item.name} onClick={() => openMenu(item.id)}>Mở menu</ButtonBar> },
          ]} />
          {pagination(menus.data.page, !menus.data.last, (page) => { setMenuPage(page); setMoveMenuId(""); setDeleteTarget(null); setMode("view"); setMenuAction(null); }, "Danh sách menu")}
        </> : null}
        {menu.isError ? <p role="alert">{getRecipeApiErrorMessage(menu.error)}</p> : null}
      </section> : null}
      {mode !== "view" || detailOnly || operatorScreen !== "menus" ? <section className={styles.recipeMenuPanel}>
        {mode === "view" && operatorScreen === "recipes" ? <div className={styles.panelHeading}><div>
          {owner ? <h2>{activeMenu}</h2> : <h2>Công thức trong menu</h2>}
          {recipes.data && "totalElements" in recipes.data ? <p>{recipes.data.totalElements} món trong menu.</p> : null}
        </div></div> : null}
        <div className={styles.recipeMenuWorkspace} data-editing={mode !== "view" || detailOnly}>
        {mode === "view" && !detailOnly && operatorScreen === "recipes" ? <div className={styles.recipeMenuBrowser}>
        <TableFilters search={{ ariaLabel: "Tìm công thức", placeholder: "Tìm theo tên món", value: recipeSearch, maxLength: 200, onChange: setRecipeSearch }}
          submitLabel="Tìm kiếm" onSubmit={searchRecipes} disabled={busy} />
        {recipes.isPending ? <p role="status">Đang tải công thức…</p> : null}
        {recipes.isError ? <div role="alert"><p>{getRecipeApiErrorMessage(recipes.error)}</p><ButtonBar onClick={() => void recipes.refetch()}>Thử lại</ButtonBar></div> : null}
        {recipes.data ? <>
          <DataTable variant="accounts" style={{ minWidth: 0 }} rows={recipes.data.items} rowKey={(item) => item.id} emptyMessage="Chưa có món nào phù hợp." columns={[
            { key: "name", header: "Tên món", cellProps: () => ({ className: styles.adminRecipeName }), render: (item) => <strong>{item.name}</strong> },
            { key: "version", header: "Phiên bản", render: (item) => "v" + item.revision },
            { key: "action", header: "", align: "right", render: (item) => <ButtonBar rollingLabel disabled={busy} aria-label={"Xem chi tiết " + item.name} onClick={() => openRecipe(item.id)}>Xem chi tiết</ButtonBar> },
          ]} />
          {pagination(recipes.data.page, recipes.data.hasNext, (page) => { setRecipePage(page); setSelectedId(""); setMode("view"); setDeleteTarget(null); }, "Danh sách công thức")}
        </> : null}
        </div> : null}
        {!owner && mode !== "view" ? <form id="global-recipe-form" ref={editorRef} className={styles.recipeMenuEditor} onInvalidCapture={(event) => { const disclosure = (event.target as HTMLElement).closest("details"); if (disclosure) disclosure.open = true; }} onSubmit={submitRecipe} aria-label="Thông tin công thức" aria-busy={write.isPending}>
          <div hidden={!owner} className={styles.panelHeading}><div><h3>{mode === "create" ? "Thêm công thức mới" : "Chỉnh sửa công thức"}</h3><p>{mode === "edit" ? <>Đang sửa <strong>{name || "công thức"}</strong> · Phiên bản v{detail.data?.revision ?? "—"} · Menu: <strong>{menus.data?.content.find((item) => item.id === detail.data?.menuId)?.name ?? "Menu hiện tại"}</strong></> : <>Menu đích: <strong>{menus.data?.content.find((item) => item.id === menuId)?.name ?? menu.data?.name ?? (!menuId || menuId === DEFAULT_MENU ? "Menu mặc định" : "Menu đã chọn (chưa tải được tên)")}</strong></>}</p></div></div>
          {mode === "edit" && unsupportedProcedureSteps.length ? <div className={styles.recipeMenuError} role="alert"><div><strong>Không thể nạp đầy đủ thông số pha.</strong><p>Để tránh làm mất bước khi lưu, hãy giữ nguyên công thức này hoặc nhờ quản trị viên kiểm tra dữ liệu.</p><ul>{unsupportedProcedureSteps.map((step, index) => <li key={`${index}-${step}`}>{step}</li>)}</ul></div></div> : null}
          <section className={styles.recipeMenuEditSection} aria-labelledby="recipe-identity-heading">
            <div className={styles.recipeMenuEditSectionHeading}><h4 id="recipe-identity-heading">Thông tin món</h4></div>
            <label className={styles.formField}><span>{admin ? "Tên món *" : "Tên món / công thức *"}</span><input required placeholder="Ví dụ: Espresso đậm vị" value={name} onChange={(event) => setName(event.target.value)} /></label>

          </section>
          <section className={styles.recipeMenuEditSection} aria-labelledby="recipe-procedure-heading">
            <div className={styles.recipeMenuEditSectionHeading}><h4 id="recipe-procedure-heading">Thông số pha</h4></div>
            <RecipeProcedureFields value={procedure} onChange={setProcedure} prefix="global-procedure" disabled={write.isPending} compact />
          </section>
          {extraRecipeFields}
          {mode === "edit" ? <label className={styles.recipeMenuConfirmation}><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} required /> {admin ? "Đã kiểm tra thông số trước khi lưu." : "Tôi đã kiểm tra các thông số được nạp từ công thức hiện tại trước khi lưu."}</label> : null}
          {validation ? <p className={styles.recipeMenuError} role="alert">{validation}</p> : null}

        </form> : null}
        {!owner && editing ? <aside className={styles.adminRecipeCard}>
          <h2>Xem lại công thức</h2>
          <dl className={styles.adminRecipeFacts}>
            <div><dt>Menu</dt><dd>{mode === "edit" ? detailMenu : activeMenu}</dd></div>
            <div><dt>Tên món</dt><dd>{name.trim() || "Chưa nhập"}</dd></div>
            <div><dt>Lượng cà phê</dt><dd>{procedure.DOSE ? procedure.DOSE + " g" : "Chưa nhập"}</dd></div>
            <div><dt>Nước chiết xuất</dt><dd>{procedure.EXTRACT ? procedure.EXTRACT + " ml" : "Chưa nhập"}</dd></div>
          </dl>
        </aside> : null}
        {mode === "view" && recipeId && (detailOnly || operatorScreen === "detail") ? <section ref={detailRef} className={styles.recipeMenuDetail} aria-label="Chi tiết công thức">
          {detail.isPending ? <p role="status">Đang tải chi tiết…</p> : null}
          {detail.isError ? <div role="alert"><p>{getRecipeApiErrorMessage(detail.error)}</p><ButtonBar onClick={() => void detail.refetch()}>Thử lại</ButtonBar></div> : null}
          {detail.data ? <>
            {owner ? <div className={styles.panelHeading}><div><h3 tabIndex={-1}>{detail.data.name}</h3><p>{detailMenu} · Phiên bản v{detail.data.revision}</p></div></div> : null}
            <div className={styles.adminRecipeColumns}>
              <section className={styles.adminRecipeCard + " " + styles.recipeStepCard}><h2>Các bước pha</h2><RecipeSteps steps={detail.data.steps} /></section>
              <div className={styles.recipeDetailSide}>
              <section className={styles.adminRecipeCard}><h2>Thông số pha</h2>
                <dl className={styles.adminRecipeFacts}>
                  <div><dt>Lượng cà phê</dt><dd>{coffeeDose ? coffeeDose + " g" : "Chưa có thông số"}</dd></div>
                  <div><dt>Nước chiết xuất</dt><dd>{waterVolume ? waterVolume + " ml" : "Chưa có thông số"}</dd></div>
                </dl>
              </section>
            <details className={styles.recipeDetailDisclosure}>
              <summary>Thông số và đồng bộ</summary>
              <p>Các bước trong thư viện có thể chưa phản ánh lần cập nhật gần nhất. Xem trạng thái đồng bộ để biết máy đã xác nhận áp dụng chưa.</p>
              {owner ? <ButtonBar href={PATH_CUSTOMER.MENU_SYNC}>Xem đồng bộ với máy</ButtonBar> : admin ? <ButtonBar onClick={() => setView("sync")}>Xem đồng bộ với máy</ButtonBar> : null}
            </details>
            {owner ? <div className={styles.adminRecipeCard + " " + styles.recipeDetailSide}><h2>Lưu vào Menu của tôi</h2><p className={styles.recipeMenuMeta}>Chọn menu nhận bản sao. Công thức gốc trong thư viện vẫn được giữ nguyên.</p>
              {ownerMenus.isPending ? <p>Đang tải menu của bạn…</p> : null}
              {ownerMenus.isError ? <div role="alert"><p>{getRecipeApiErrorMessage(ownerMenus.error)}</p><ButtonBar onClick={() => void ownerMenus.refetch()}>Thử lại</ButtonBar></div> : null}
              {ownerMenus.data ? <>
                {ownerMenus.data.totalElements > 0 ? <label className={styles.formField}><span>Sao chép vào menu của tôi *</span><select aria-label="Sao chép vào menu của tôi" value={copyMenuId} onChange={(event) => setCopyMenuId(event.target.value)}><option value="">Chọn menu</option>{ownerMenus.data.content.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label> : <p>Chưa có menu riêng; bản sao sẽ tạo cùng “Menu của tôi”.</p>}
                {pagination(ownerMenus.data.page, !ownerMenus.data.last, (page) => { setOwnerMenuPage(page); setCopyMenuId(""); }, "Menu đích của Owner")}
                <ButtonBar disabled={busy || (ownerMenus.data.totalElements > 0 && !copyMenuId)} onClick={() => { clearFeedback(); copy.mutate({ globalRecipeId: detail.data.id, ...(copyMenuId ? { menuId: copyMenuId } : {}) }); }}>{copy.isPending ? "Đang sao chép…" : "Lưu bản sao riêng"}</ButtonBar>
                <ButtonBar href={PATH_CUSTOMER.MENU_ADJUSTMENTS}>Mở Menu của tôi</ButtonBar>
              </> : null}
            </div> : <details ref={recipeTools} className={styles.recipeDetailDisclosure}><summary>Quản lý công thức</summary><div className={styles.recipeMenuOperatorTools}>
              <label className={styles.formField}><span>Chuyển công thức sang menu</span><select aria-label="Chuyển công thức sang menu" value={moveMenuId} onChange={(event) => setMoveMenuId(event.target.value)}><option value="">Chọn menu đích</option>{menus.data?.content.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <div className={styles.recipeMenuActions}>
                <ButtonBar disabled={busy || !moveMenuId || moveMenuId === detail.data.menuId} onClick={() => { clearFeedback(); move.mutate({ remove: false, id: detail.data.id, menuId: moveMenuId }); }}>Chuyển menu</ButtonBar>
                <ButtonBar disabled={busy || !detail.data.menuId || detail.data.menuId === DEFAULT_MENU} onClick={() => { clearFeedback(); move.mutate({ remove: true, id: detail.data.id, menuId: detail.data.menuId! }); }}>Về menu mặc định</ButtonBar>
                <ButtonBar variant="danger" disabled={busy} onClick={() => setDeleteTarget({ id: detail.data.id, name: detail.data.name })}>Xóa công thức</ButtonBar>
              </div>
              {deleteTarget ? <div className={styles.recipeMenuEditor}><p>Xóa “{deleteTarget.name}”? Hệ thống có thể từ chối nếu còn điều chỉnh cũ tham chiếu.</p><div className={styles.recipeMenuActions}><ButtonBar holdToConfirm disabled={busy} onClick={() => { clearFeedback(); remove.mutate(deleteTarget.id); }}>Xác nhận xóa</ButtonBar><ButtonBar disabled={busy} onClick={() => setDeleteTarget(null)}>Hủy</ButtonBar></div></div> : null}
            </div></details>}
            </div>
            </div>
          </> : null}
        </section> : null}
        </div>
      </section> : null}
    </> : null}
  </div>;
}
