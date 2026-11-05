import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/router";
import { recipesApi } from "@/apis/recipes.api";
import { recipeMenusApi } from "@/apis/recipe-menus.api";
import { ButtonBar } from "@/components/button/button-bar";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import { getRecipeApiErrorDetails, getRecipeApiErrorMessage } from "@/lib/api-errors";
import { authScopedQuerySubject } from "@/lib/query-subject";
import { PATH_CUSTOMER } from "@/routes/path";
import { buildRecipeProcedure, emptyRecipeProcedure, GlobalRecipeIdSchema, type RecipePublishRequest } from "@/schema/recipes.schema";
import { RecipeProcedureFields, RecipeSteps } from "./recipe-procedure-fields";
import { LegacyRecipeOverrides } from "./legacy-recipe-overrides";
import { RecipeSyncPanel } from "./recipe-sync-panel";
import styles from "../repair-workflow/repair-workflow.module.css";

const DEFAULT_MENU = "00000000-0000-0000-0000-000000000090";

export function RecipeManagementScreen({ role, operatorRole, showHeading = true, initialGlobalRecipeId }: {
  role: "owner" | "operator"; operatorRole?: "ADMIN" | "MODERATOR"; showHeading?: boolean; initialGlobalRecipeId?: string;
}) {
  const router = useRouter();
  const owner = role === "owner";
  const admin = !owner && operatorRole === "ADMIN";
  const subject = authScopedQuerySubject(owner ? "OWNER" : operatorRole ?? "operator");
  const client = useQueryClient();
  const [view, setView] = useState<"global" | "legacy" | "sync">("global");
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
      return { items: page.content, page: page.page, hasNext: !page.last };
    },
    enabled: view === "global", retry: false,
  });
  const recipeId = selectedId || recipes.data?.items[0]?.id || "";
  const detail = useQuery({
    queryKey: ["dolores", "recipes", "global-detail", subject, recipeId],
    queryFn: ({ signal }) => recipesApi.getGlobalById(recipeId, signal),
    enabled: view === "global" && Boolean(recipeId), retry: false,
  });
  const ownerMenus = useQuery({
    queryKey: ["dolores", "recipe-menus", "local", subject, ownerMenuPage],
    queryFn: ({ signal }) => recipeMenusApi.listLocal({ page: ownerMenuPage, size: 20 }, signal),
    enabled: owner && view === "global", retry: false,
  });
  useEffect(() => { if (initialGlobalRecipeId) { setSelectedId(initialGlobalRecipeId); setMode("view"); setDeleteTarget(null); setEditTargetId(""); } }, [initialGlobalRecipeId]);

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
      setSelectedId(recipe.id); setMode("view");
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
        if (GlobalRecipeIdSchema.safeParse(saved.recipeId).success) setSelectedId(saved.recipeId!);
        setMode("view"); await invalidate();
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
    onSuccess: async (result) => {
      setMenuId(result?.id ?? ""); setSelectedId(""); setRecipePage(0); setMode("view"); setMenuAction(null);
      setFeedback("Đã cập nhật menu. Thao tác này không xác nhận việc triển khai lên máy."); await invalidate();
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
    onSuccess: async () => { setSelectedId(""); setDeleteTarget(null); setFeedback("Đã xóa công thức."); await invalidate(); },
    onError: setError, retry: false,
  });
  const copy = useMutation({
    mutationFn: (input: { globalRecipeId: string; menuId?: string }) => recipeMenusApi.copyGlobalRecipe(input),
    onSuccess: async () => { setFeedback("Đã tạo bản sao riêng. Bản này được giữ nguyên khi công thức của hãng thay đổi; kiểm tra trạng thái đồng bộ riêng."); await invalidate(); },
    onError: setError, retry: false,
  });

  const submitRecipe = (event: FormEvent) => {
    event.preventDefault(); clearFeedback();
    if (busy) return;
    try {
      const payload: RecipePublishRequest = { name: name.trim(), procedure: buildRecipeProcedure(procedure), ...(slug.trim() ? { slug: slug.trim() } : {}), ...(imagePath.trim() ? { imagePath: imagePath.trim() } : {}) };
      if (!payload.name || (mode === "edit" && !confirmed)) { setValidation("Nhập tên và xác nhận quy trình mới trước khi lưu."); return; }
      if (mode === "edit" && !editTargetId) return;
      write.mutate({ payload, ...(mode === "edit" ? { id: editTargetId } : {}), target: menuId });
    } catch { setValidation("Kiểm tra lượng cà phê, lượng nước và các thông số. Mã công thức sữa phải là số nguyên."); }
  };
  const openForm = (edit: boolean) => {
    clearFeedback(); setMode(edit ? "edit" : "create"); setName(edit ? detail.data?.name ?? "" : "");
    setSlug(""); setImagePath(""); setProcedure(emptyRecipeProcedure()); setConfirmed(false); setDeleteTarget(null); setEditTargetId(edit ? detail.data?.id ?? "" : "");
  };
  const pagination = (page: number, hasNext: boolean, onChange: (value: number) => void, label: string) => <nav className={styles.recipeMenuPagination} aria-label={label}>
    <ButtonBar disabled={busy || page === 0} onClick={() => onChange(page - 1)}>Trang trước</ButtonBar><span>Trang {page + 1}</span>
    <ButtonBar disabled={busy || !hasNext} onClick={() => onChange(page + 1)}>Trang sau</ButtonBar>
  </nav>;
  const busy = write.isPending || move.isPending || remove.isPending || copy.isPending || changeMenu.isPending;

  return <div className={showHeading ? styles.pageContent : styles.screen}>
    {showHeading ? <BackButtonHeading title={owner ? "Công thức pha chế" : "Menu & công thức"} titleId="recipe-management-title"
      description="Quản lý thư viện công thức; theo dõi việc lưu và áp dụng lên máy riêng biệt." back={null} /> : null}
    <nav className={styles.recipeMenuTabs} aria-label="Khu vực công thức">
      <button type="button" aria-pressed={view === "global"} className={view === "global" ? styles.recipeMenuTabActive : ""} onClick={() => setView("global")}>Thư viện dùng chung</button>
      {owner ? <>
        <button type="button" onClick={() => void router.push(PATH_CUSTOMER.MENU_ADJUSTMENTS)}>Menu của tôi</button>
        <button type="button" onClick={() => void router.push(PATH_CUSTOMER.MENU_SYNC)}>Đồng bộ với máy</button>
      </> : admin ? <>
        <button type="button" aria-pressed={view === "legacy"} className={view === "legacy" ? styles.recipeMenuTabActive : ""} onClick={() => setView("legacy")}>Điều chỉnh cũ</button>
        <button type="button" aria-pressed={view === "sync"} className={view === "sync" ? styles.recipeMenuTabActive : ""} onClick={() => setView("sync")}>Theo dõi đồng bộ</button>
      </> : null}
    </nav>
    {view === "legacy" && admin ? <LegacyRecipeOverrides role="ADMIN" /> : null}
    {view === "sync" && admin ? <RecipeSyncPanel role="ADMIN" /> : null}
    {view === "global" ? <>
      {feedback ? <p className={styles.recipeMenuSuccess} role="status">{feedback}</p> : null}
      {error ? <p className={styles.recipeMenuError} role="alert">{getRecipeApiErrorMessage(error, "mutation")}</p> : null}
      <section className={styles.recipeMenuPanel}>
        <div className={styles.panelHeading}><div><h2>Menu dùng chung</h2><p>Menu tổ chức thư viện; không phải lựa chọn menu triển khai cho máy.</p></div>
          {!owner ? <ButtonBar onClick={() => { clearFeedback(); setMenuAction("create"); setMenuName(""); }}>Tạo menu</ButtonBar> : null}</div>
        <form className={styles.recipeMenuToolbar} onSubmit={(event) => { event.preventDefault(); if (busy) return; setMenuQ(menuSearch); setMenuPage(0); setMoveMenuId(""); setDeleteTarget(null); setMode("view"); setMenuAction(null); }}>
          <label className={styles.formField}><span>Tìm menu</span><input value={menuSearch} onChange={(event) => setMenuSearch(event.target.value)} /></label>
          <ButtonBar type="submit">Tìm kiếm</ButtonBar>
        </form>
        {menus.isPending ? <p role="status">Đang tải menu…</p> : null}
        {menus.isError ? <div role="alert"><p>{getRecipeApiErrorMessage(menus.error)}</p><ButtonBar onClick={() => void menus.refetch()}>Thử lại</ButtonBar></div> : null}
        {menus.data ? <>
          <label className={styles.formField}><span>Menu đang xem</span><select aria-label="Menu đang xem" value={menuId} disabled={busy} onChange={(event) => { setMenuId(event.target.value); setSelectedId(""); setRecipePage(0); setMode("view"); setMenuAction(null); setDeleteTarget(null); }}>
            <option value="">Tất cả công thức</option>
            {menuId && !menus.data.content.some((item) => item.id === menuId) ? <option value={menuId}>{menu.data?.name ?? "Menu đang chọn"}</option> : null}
            {menus.data.content.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select></label>
          {pagination(menus.data.page, !menus.data.last, (page) => { setMenuPage(page); setMoveMenuId(""); setDeleteTarget(null); setMode("view"); setMenuAction(null); }, "Danh sách menu")}
        </> : null}
        {menu.isError ? <p role="alert">{getRecipeApiErrorMessage(menu.error)}</p> : null}
        {!owner && menu.data ? <div className={styles.recipeMenuActions}>
          <ButtonBar disabled={menuId === DEFAULT_MENU || busy} onClick={() => { clearFeedback(); setMenuName(menu.data.name); setMenuAction("rename"); }}>Đổi tên menu</ButtonBar>
          <ButtonBar disabled={menuId === DEFAULT_MENU || busy} onClick={() => { clearFeedback(); setMenuAction("delete"); }}>Xóa menu rỗng</ButtonBar>
          {menuId === DEFAULT_MENU ? <span className={styles.recipeMenuMeta}>Giữ tên menu mặc định để bảo toàn thao tác chuyển công thức về mặc định.</span> : null}
        </div> : null}
        {!owner && menuAction ? <form className={styles.recipeMenuEditor} onSubmit={(event) => { event.preventDefault(); if (busy) return; clearFeedback(); changeMenu.mutate({ action: menuAction, menuId, name: menuName }); }}>
          <h3>{menuAction === "delete" ? "Xóa menu đang chọn?" : menuAction === "create" ? "Menu mới" : "Đổi tên menu"}</h3>
          {menuAction !== "delete" ? <label className={styles.formField}><span>Tên menu *</span><input required maxLength={255} value={menuName} onChange={(event) => setMenuName(event.target.value)} /></label> : <p>Chỉ xóa được khi menu không còn công thức.</p>}
          <div className={styles.recipeMenuActions}><ButtonBar type="submit" disabled={busy || (menuAction !== "delete" && !menuName.trim())}>Xác nhận</ButtonBar><ButtonBar disabled={busy} onClick={() => setMenuAction(null)}>Hủy</ButtonBar></div>
        </form> : null}
      </section>
      <section className={styles.recipeMenuPanel}>
        <div className={styles.panelHeading}><div><h2>Công thức dùng chung</h2><p>{owner ? "Bản hiện hành từ Dolores. Sao chép để giữ công thức riêng của bạn." : "Tạo công thức mới trong menu mặc định, sau đó chuyển sang menu mong muốn."}</p></div>
          {!owner ? <ButtonBar className={styles.recipeMenuPrimary} disabled={busy} onClick={() => openForm(false)}>Tạo công thức</ButtonBar> : null}</div>
        <form className={styles.recipeMenuToolbar} onSubmit={(event) => { event.preventDefault(); if (busy) return; setRecipeQ(recipeSearch); setRecipePage(0); setSelectedId(""); setMode("view"); setDeleteTarget(null); }}>
          <label className={styles.formField}><span>Tìm công thức</span><input value={recipeSearch} onChange={(event) => setRecipeSearch(event.target.value)} /></label><ButtonBar type="submit">Tìm kiếm</ButtonBar>
        </form>
        {recipes.isPending ? <p role="status">Đang tải công thức…</p> : null}
        {recipes.isError ? <div role="alert"><p>{getRecipeApiErrorMessage(recipes.error)}</p><ButtonBar onClick={() => void recipes.refetch()}>Thử lại</ButtonBar></div> : null}
        {recipes.data ? <>
          <ul className={styles.recipeMenuList}>{recipes.data.items.map((item) => <li className={styles.recipeMenuItem} key={item.id}>
            <button type="button" disabled={busy} aria-pressed={item.id === recipeId} onClick={() => { setSelectedId(item.id); setMode("view"); setDeleteTarget(null); clearFeedback(); }}>
              <span className={styles.recipeMenuRecipeMain}><strong>{item.name}</strong><span className={styles.recipeMenuMeta}>Phiên bản {item.revision}</span></span><span aria-hidden="true">›</span>
            </button></li>)}</ul>
          {!recipes.data.items.length ? <p className={styles.recipeMenuEmpty}>Chưa có công thức phù hợp.</p> : null}
          {pagination(recipes.data.page, recipes.data.hasNext, (page) => { setRecipePage(page); setSelectedId(""); setMode("view"); setDeleteTarget(null); }, "Danh sách công thức")}
        </> : null}
        {!owner && mode !== "view" ? <form className={styles.recipeMenuEditor} onSubmit={submitRecipe}>
          <h3>{mode === "create" ? "Tạo công thức" : "Cập nhật công thức bằng quy trình mới"}</h3>
          {mode === "edit" ? <p className={styles.recipeMenuError}>Thư viện chưa trả đầy đủ quy trình và thông tin ảnh/mã. Hãy nhập lại toàn bộ thông số cần lưu; không dùng các bước tham khảo bên dưới để suy ra giá trị hiện hành.</p> : null}
          <div className={styles.recipeMenuFormGrid}>
            <label className={styles.formField}><span>Tên công thức *</span><input required value={name} onChange={(event) => setName(event.target.value)} /></label>
            <label className={styles.formField}><span>Mã tên (tùy chọn)</span><input value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="espresso" /></label>
            <label className={styles.formField + " " + styles.recipeMenuFieldWide}><span>Đường dẫn ảnh (tùy chọn)</span><input value={imagePath} onChange={(event) => setImagePath(event.target.value)} placeholder="assets/images/espresso.webp" /></label>
          </div>
          <RecipeProcedureFields value={procedure} onChange={setProcedure} prefix="global-procedure" disabled={write.isPending} />
          {mode === "edit" ? <label><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} required /> Tôi đã kiểm tra toàn bộ quy trình mới; mã tên và ảnh sẽ dùng dữ liệu nhập hoặc mặc định của hệ thống.</label> : null}
          {validation ? <p className={styles.recipeMenuError} role="alert">{validation}</p> : null}
          <div className={styles.recipeMenuActions}><ButtonBar className={styles.recipeMenuPrimary} type="submit" disabled={busy || (mode === "edit" && !confirmed)}>{write.isPending ? "Đang lưu…" : "Lưu công thức"}</ButtonBar><ButtonBar disabled={busy} onClick={() => setMode("view")}>Hủy</ButtonBar></div>
        </form> : null}
        {mode === "view" && recipeId ? <section className={styles.recipeMenuDetail}>
          {detail.isPending ? <p role="status">Đang tải chi tiết…</p> : null}
          {detail.isError ? <div role="alert"><p>{getRecipeApiErrorMessage(detail.error)}</p><ButtonBar onClick={() => void detail.refetch()}>Thử lại</ButtonBar></div> : null}
          {detail.data ? <>
            <div className={styles.panelHeading}><div><h3>{detail.data.name}</h3><p>Phiên bản {detail.data.revision}</p></div>{!owner ? <ButtonBar disabled={busy} onClick={() => openForm(true)}>Chỉnh sửa</ButtonBar> : null}</div>
            <p className={styles.recipeMenuMeta}>Menu: {menus.data?.content.find((item) => item.id === detail.data.menuId)?.name ?? (detail.data.menuId === DEFAULT_MENU ? "Menu mặc định" : "Chưa tải tên menu")}</p>
            <h4>Các bước được thư viện trả về</h4><RecipeSteps steps={detail.data.steps} />
            <p className={styles.recipeMenuMeta}>Các bước thư viện trả về có thể chưa phản ánh quy trình vừa cập nhật. Dữ liệu này chưa đủ để xác nhận toàn bộ thông số vật lý hoặc trạng thái máy đang áp dụng.</p>
            {owner ? <>
              {ownerMenus.isPending ? <p>Đang tải menu của bạn…</p> : null}
              {ownerMenus.isError ? <div role="alert"><p>{getRecipeApiErrorMessage(ownerMenus.error)}</p><ButtonBar onClick={() => void ownerMenus.refetch()}>Thử lại</ButtonBar></div> : null}
              {ownerMenus.data ? <>
                {ownerMenus.data.totalElements > 0 ? <label className={styles.formField}><span>Sao chép vào menu của tôi *</span><select aria-label="Sao chép vào menu của tôi" value={copyMenuId} onChange={(event) => setCopyMenuId(event.target.value)}><option value="">Chọn menu</option>{ownerMenus.data.content.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label> : <p>Chưa có menu riêng; bản sao sẽ tạo cùng “Menu của tôi”.</p>}
                {pagination(ownerMenus.data.page, !ownerMenus.data.last, (page) => { setOwnerMenuPage(page); setCopyMenuId(""); }, "Menu đích của Owner")}
                <ButtonBar disabled={busy || (ownerMenus.data.totalElements > 0 && !copyMenuId)} onClick={() => { clearFeedback(); copy.mutate({ globalRecipeId: detail.data.id, ...(copyMenuId ? { menuId: copyMenuId } : {}) }); }}>{copy.isPending ? "Đang sao chép…" : "Lưu bản sao riêng"}</ButtonBar>
              </> : null}
            </> : <>
              <label className={styles.formField}><span>Chuyển công thức sang menu</span><select aria-label="Chuyển công thức sang menu" value={moveMenuId} onChange={(event) => setMoveMenuId(event.target.value)}><option value="">Chọn menu đích</option>{menus.data?.content.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
              <div className={styles.recipeMenuActions}>
                <ButtonBar disabled={busy || !moveMenuId || moveMenuId === detail.data.menuId} onClick={() => { clearFeedback(); move.mutate({ remove: false, id: detail.data.id, menuId: moveMenuId }); }}>Chuyển menu</ButtonBar>
                <ButtonBar disabled={busy || !detail.data.menuId || detail.data.menuId === DEFAULT_MENU} onClick={() => { clearFeedback(); move.mutate({ remove: true, id: detail.data.id, menuId: detail.data.menuId! }); }}>Về menu mặc định</ButtonBar>
                <ButtonBar disabled={busy} onClick={() => setDeleteTarget({ id: detail.data.id, name: detail.data.name })}>Xóa công thức</ButtonBar>
              </div>
              {deleteTarget ? <div className={styles.recipeMenuEditor}><p>Xóa “{deleteTarget.name}”? Hệ thống có thể từ chối nếu còn điều chỉnh cũ tham chiếu.</p><div className={styles.recipeMenuActions}><ButtonBar disabled={busy} onClick={() => { clearFeedback(); remove.mutate(deleteTarget.id); }}>Xác nhận xóa</ButtonBar><ButtonBar disabled={busy} onClick={() => setDeleteTarget(null)}>Hủy</ButtonBar></div></div> : null}
            </>}
          </> : null}
        </section> : null}
      </section>
    </> : null}
  </div>;
}
