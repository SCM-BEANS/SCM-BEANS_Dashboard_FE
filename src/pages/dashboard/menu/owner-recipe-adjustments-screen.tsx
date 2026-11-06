import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { recipeMenusApi } from "@/apis/recipe-menus.api";
import { recipesApi } from "@/apis/recipes.api";
import { ButtonBar } from "@/components/button/button-bar";
import { OwnerMenuHeader } from "./menu-screen";
import { OwnerMenuSchema } from "@/schema/recipe-menus.schema";
import { RecipeProcedureFields, RecipeSteps } from "@/components/features/recipe-menus/recipe-procedure-fields";
import { LegacyRecipeOverrides } from "@/components/features/recipe-menus/legacy-recipe-overrides";
import { getRecipeApiErrorMessage } from "@/lib/api-errors";
import { authScopedQuerySubject } from "@/lib/query-subject";
import { PATH_CUSTOMER } from "@/routes/path";
import { buildRecipeProcedure, emptyRecipeProcedure, RecipeOverrideValueSchema } from "@/schema/recipes.schema";
import styles from "@/components/features/repair-workflow/repair-workflow.module.css";
import pageStyles from "../customer-shell.module.css";

export function OwnerRecipeAdjustmentsScreen({ creating = false }: { creating?: boolean }) {
  const router = useRouter();
  const editorRef = useRef<HTMLFormElement>(null);
  const menuEditorRef = useRef<HTMLFormElement>(null);
  const detailRef = useRef<HTMLElement>(null);
  const client = useQueryClient();
  const subject = authScopedQuerySubject("OWNER");
  const legacy = !creating && router.query?.view === "legacy";
  const parsedMenuId = OwnerMenuSchema.shape.id.safeParse(router.query?.menuId);
  const parsedRecipeId = OwnerMenuSchema.shape.id.safeParse(router.query?.recipeId);
  const menuFromUrl = parsedMenuId.success ? parsedMenuId.data : "";
  const recipeFromUrl = parsedRecipeId.success ? parsedRecipeId.data : "";
  const [menuPage, setMenuPage] = useState(0);
  const [recipePage, setRecipePage] = useState(0);
  const [selectedMenuId, setSelectedMenuId] = useState(menuFromUrl);
  const [selectedRecipeId, setSelectedRecipeId] = useState(recipeFromUrl);
  const [menuSearch, setMenuSearch] = useState("");
  const [menuQ, setMenuQ] = useState("");
  const [recipeSearch, setRecipeSearch] = useState("");
  const [recipeQ, setRecipeQ] = useState("");
  const [menuAction, setMenuAction] = useState<"create" | "rename" | "delete" | null>(null);
  const [menuName, setMenuName] = useState("");
  const [mode, setMode] = useState<"view" | "create" | "edit">(creating ? "create" : "view");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [imagePath, setImagePath] = useState("");
  const [procedure, setProcedure] = useState(emptyRecipeProcedure);
  const [editSteps, setEditSteps] = useState("");
  const [editOverrides, setEditOverrides] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [targetMenu, setTargetMenu] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [editTargetId, setEditTargetId] = useState("");
  const [feedback, setFeedback] = useState("");
  const [validation, setValidation] = useState("");
  const [error, setError] = useState<unknown>(null);

  const menus = useQuery({
    queryKey: ["dolores", "recipe-menus", "local", subject, menuPage, menuQ],
    queryFn: ({ signal }) => recipeMenusApi.listLocal({ page: menuPage, size: 20, q: menuQ }, signal),
    enabled: !legacy, retry: false,
  });
  const menuId = selectedMenuId || menus.data?.content[0]?.id || "";
  const menu = useQuery({
    queryKey: ["dolores", "recipe-menus", "local-detail", subject, menuId],
    queryFn: ({ signal }) => recipeMenusApi.getLocal(menuId, signal), enabled: !legacy && Boolean(menuId), retry: false,
  });
  const recipes = useQuery({
    queryKey: ["dolores", "recipe-menus", "local-recipes", subject, menuId, recipePage, recipeQ],
    queryFn: ({ signal }) => recipeMenusApi.listLocalRecipes(menuId, { page: recipePage, size: 20, q: recipeQ }, signal),
    enabled: !legacy && Boolean(menuId), retry: false,
  });
  const recipeId = selectedRecipeId || recipes.data?.content[0]?.id || "";
  const detail = useQuery({
    queryKey: ["dolores", "recipe-menus", "local-recipe-detail", subject, recipeId],
    queryFn: ({ signal }) => recipeMenusApi.getLocalRecipe(recipeId, signal), enabled: !legacy && Boolean(recipeId), retry: false,
  });
  const sourceId = detail.data?.sourceGlobalRecipeId;
  const source = useQuery({
    queryKey: ["dolores", "recipes", "global-detail", subject, sourceId],
    queryFn: ({ signal }) => recipesApi.getGlobalById(sourceId!, signal), enabled: !legacy && Boolean(sourceId), retry: false,
  });
  useEffect(() => {
    setMode(creating ? "create" : "view");
    setSelectedMenuId(menuFromUrl); setSelectedRecipeId(recipeFromUrl);
    setDeleteTarget(null); setEditTargetId(""); setMenuAction(null); setTargetMenu("");
    if (creating) { setName(""); setSlug(""); setImagePath(""); setProcedure(emptyRecipeProcedure()); }
  }, [creating, menuFromUrl, recipeFromUrl]);

  useEffect(() => {
    const form = menuAction ? menuEditorRef.current : mode !== "view" ? editorRef.current : null;
    if (form) {
      form.scrollIntoView({ block: "nearest" });
      form.querySelector<HTMLInputElement>("input:not([type=checkbox])")?.focus({ preventScroll: true });
    }
  }, [mode, menuAction]);

  useEffect(() => {
    if (selectedRecipeId && detail.data?.id === selectedRecipeId && mode === "view") {
      detailRef.current?.scrollIntoView({ block: "nearest" });
      detailRef.current?.querySelector<HTMLHeadingElement>("h3")?.focus({ preventScroll: true });
    }
  }, [selectedRecipeId, detail.data?.id, mode]);

  const invalidate = () => Promise.all([
    client.invalidateQueries({ queryKey: ["dolores", "recipe-menus"] }),
    client.invalidateQueries({ queryKey: ["dolores", "recipe-sync"] }),
    client.invalidateQueries({ queryKey: ["dolores", "recipe-sync-history"] }),
  ]);
  const replaceSelection = (nextMenuId: string, nextRecipeId = "") => router.replace({
    pathname: PATH_CUSTOMER.MENU_ADJUSTMENTS,
    query: { ...(nextMenuId ? { menuId: nextMenuId } : {}), ...(nextRecipeId ? { recipeId: nextRecipeId } : {}) },
  }, undefined, { scroll: false });
  const clear = () => { setError(null); setFeedback(""); setValidation(""); };
  const menuMutation = useMutation({
    mutationFn: async (input: { action: "create" | "rename" | "delete"; menuId: string; name: string }) => {
      if (input.action === "create") return recipeMenusApi.createLocal(input.name);
      if (input.action === "rename") return recipeMenusApi.renameLocal(input.menuId, input.name);
      if (input.action === "delete") { await recipeMenusApi.deleteLocal(input.menuId); return null; }
      throw new Error("No menu operation selected.");
    },
    onSuccess: async (result) => { setSelectedMenuId(result?.id ?? ""); setSelectedRecipeId(""); setRecipePage(0); setMenuAction(null); setFeedback("Đã cập nhật menu của bạn."); setMenuPage(0); setMenuQ(""); setMenuSearch(""); await replaceSelection(result?.id ?? ""); await invalidate(); },
    onError: setError, retry: false,
  });
  const create = useMutation({
    mutationFn: (input: { payload: { name: string; procedure: string[]; slug?: string; imagePath?: string }; menuId?: string }) => recipeMenusApi.createLocalDsl(input.payload, input.menuId),
    onSuccess: async (recipe) => { setSelectedMenuId(recipe.menuId); setSelectedRecipeId(recipe.id); setMode("view"); setFeedback("Đã tạo món trong menu của bạn. Mở Đồng bộ với máy để kiểm tra kết quả áp dụng."); await replaceSelection(recipe.menuId, recipe.id); await invalidate(); },
    onError: setError, retry: false,
  });
  const edit = useMutation({
    mutationFn: (input: { id: string; name: string; steps: string[]; dosageOverrides: string[] }) => {
      const { id, ...payload } = input;
      return recipeMenusApi.editLocalRecipe(id, payload);
    },
    onSuccess: async () => { setMode("view"); setFeedback("Đã lưu thông tin món. Mở Đồng bộ với máy để kiểm tra; thay đổi này chưa xác nhận quy trình pha trên máy."); await invalidate(); },
    onError: setError, retry: false,
  });
  const move = useMutation({
    mutationFn: (input: { menuId: string; recipeId: string }) => recipeMenusApi.moveLocalRecipe(input.menuId, input.recipeId),
    onSuccess: async (recipe) => { setSelectedMenuId(recipe.menuId); setSelectedRecipeId(recipe.id); setRecipePage(0); setFeedback("Đã chuyển công thức sang menu đích."); setMenuPage(0); setMenuQ(""); setMenuSearch(""); setRecipeQ(""); setRecipeSearch(""); await replaceSelection(recipe.menuId, recipe.id); await invalidate(); },
    onError: setError, retry: false,
  });
  const remove = useMutation({
    mutationFn: (id: string) => recipeMenusApi.deleteLocalRecipe(id),
    onSuccess: async () => { setSelectedRecipeId(""); setDeleteTarget(null); setFeedback("Đã xóa công thức riêng."); await replaceSelection(menuId); await invalidate(); },
    onError: setError, retry: false,
  });
  const copyNew = useMutation({
    mutationFn: (input: { globalRecipeId: string; menuId: string }) => recipeMenusApi.copyGlobalRecipe(input),
    onSuccess: async (recipe) => { setSelectedRecipeId(recipe.id); setFeedback("Đã tạo bản sao từ phiên bản nguồn hiện hành. Công thức cũ vẫn được giữ nguyên."); await replaceSelection(recipe.menuId, recipe.id); await invalidate(); },
    onError: setError, retry: false,
  });
  const busy = menuMutation.isPending || create.isPending || edit.isPending || move.isPending || remove.isPending || copyNew.isPending;
  const canCreate = menus.isSuccess && (Boolean(menuId) || (!menuQ && menus.data.totalElements === 0));
  const resetContext = () => { setSelectedRecipeId(""); setMode("view"); setDeleteTarget(null); setEditTargetId(""); setMenuAction(null); setTargetMenu(""); };
  const openCreate = () => { clear(); setMenuAction(null); setMode("create"); setDeleteTarget(null); setEditTargetId(""); setName(""); setSlug(""); setImagePath(""); setProcedure(emptyRecipeProcedure()); void router.push({ pathname: PATH_CUSTOMER.MENU_ADD_DISH, query: menuId ? { menuId } : {} }, undefined, { scroll: false }); };
  const cancelEditor = () => {
    clear(); setMode("view");
    if (creating) void replaceSelection(menuId);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault(); clear();
    if (busy) return;
    if (!name.trim()) { setValidation("Nhập tên công thức trước khi lưu."); return; }
    if (mode === "edit") {
      const steps = editSteps.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
      const overrides = editOverrides.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
      if (!name.trim() || !steps.length || !confirmed || overrides.some((value) => !RecipeOverrideValueSchema.safeParse(value).success)) { setValidation("Nhập tên, các bước và xác nhận giới hạn chỉnh sửa. Định lượng cũ dùng dạng water:40."); return; }
      if (!editTargetId) return;
      edit.mutate({ id: editTargetId, name: name.trim(), steps, dosageOverrides: overrides }); return;
    }
    try {
      if (!canCreate) { setValidation("Tải hoặc chọn menu đích trước khi tạo công thức."); return; }
      create.mutate({ payload: { name: name.trim(), procedure: buildRecipeProcedure(procedure), ...(slug.trim() ? { slug: slug.trim() } : {}), ...(imagePath.trim() ? { imagePath: imagePath.trim() } : {}) }, ...(menuId ? { menuId } : {}) });
    } catch { setValidation("Kiểm tra lượng cà phê, lượng nước và giá trị các thông số trước khi lưu."); }
  };
  const pagination = (page: number, last: boolean, change: (page: number) => void, label: string) => page === 0 && last ? null : <nav className={styles.recipeMenuPagination} aria-label={label}>
    <ButtonBar disabled={busy || page === 0} onClick={() => change(page - 1)}>Trang trước</ButtonBar><span>Trang {page + 1}</span><ButtonBar disabled={busy || last} onClick={() => change(page + 1)}>Trang sau</ButtonBar>
  </nav>;

  return <section className={pageStyles.pageContent}>
    <OwnerMenuHeader active="mine" />
    {legacy ? <><div><ButtonBar href={PATH_CUSTOMER.MENU_ADJUSTMENTS}>← Về Menu của tôi</ButtonBar></div><LegacyRecipeOverrides role="OWNER" /></> : <>
      {feedback ? <p className={styles.notice} role="status">{feedback}</p> : null}
      {error ? <p className={styles.recipeMenuError} role="alert">{getRecipeApiErrorMessage(error, "mutation")}</p> : null}
      {mode === "view" ? <section className={styles.recipeMenuPanel}>
        <div className={styles.panelHeading}><div><h2>Menu của tôi</h2><p>Chỉ tài khoản của bạn được quản lý các menu riêng này.</p></div><ButtonBar disabled={busy} onClick={() => { clear(); setMenuName(""); setMenuAction("create"); }}>Tạo menu</ButtonBar></div>
        <form className={styles.recipeMenuToolbar} onSubmit={(event) => { event.preventDefault(); if (busy) return; resetContext(); setSelectedMenuId(""); setRecipePage(0); setMenuQ(menuSearch); setMenuPage(0); }}>
          <label className={styles.formField}><span>Tìm menu</span><input placeholder="Nhập tên menu…" value={menuSearch} onChange={(event) => setMenuSearch(event.target.value)} /></label><ButtonBar type="submit" disabled={busy}>Tìm kiếm</ButtonBar>
        </form>
        {menus.isPending ? <p role="status">Đang tải menu…</p> : null}
        {menus.isError ? <div role="alert"><p>{getRecipeApiErrorMessage(menus.error)}</p><ButtonBar onClick={() => void menus.refetch()}>Thử lại</ButtonBar></div> : null}
        {menus.data ? <>
          {menus.data.totalElements ? <label className={styles.formField}><span>Menu đang xem</span><select aria-label="Menu đang xem" value={menuId} disabled={busy} onChange={(event) => { resetContext(); setSelectedMenuId(event.target.value); setRecipePage(0); void router.push({ pathname: PATH_CUSTOMER.MENU_ADJUSTMENTS, query: { menuId: event.target.value } }, undefined, { scroll: false }); }}>
            {!menus.data.content.some((item) => item.id === menuId) ? <option value={menuId}>{menu.data?.name ?? "Menu đang chọn"}</option> : null}
            {menus.data.content.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select></label> : <p className={styles.recipeMenuEmpty}>Chưa có menu phù hợp. Khi tạo món đầu tiên, bạn có thể để hệ thống tạo “Menu của tôi”.</p>}
          {pagination(menus.data.page, menus.data.last, (page) => { resetContext(); setMenuPage(page); setSelectedMenuId(""); setRecipePage(0); }, "Danh sách menu của tôi")}
        </> : null}
        {menu.isError ? <p role="alert">{getRecipeApiErrorMessage(menu.error)}</p> : null}
        {menu.data ? <div className={styles.recipeMenuActions}><ButtonBar disabled={busy} onClick={() => { clear(); setMenuName(menu.data.name); setMenuAction("rename"); }}>Đổi tên</ButtonBar><ButtonBar disabled={busy} onClick={() => { clear(); setMenuAction("delete"); }}>Xóa menu rỗng</ButtonBar></div> : null}
        {menuAction ? <form ref={menuEditorRef} className={styles.recipeMenuEditor} aria-label="Quản lý menu riêng" aria-busy={menuMutation.isPending} onSubmit={(event) => { event.preventDefault(); if (busy) return; clear(); menuMutation.mutate({ action: menuAction, menuId, name: menuName }); }}>
          <h3>{menuAction === "delete" ? "Xóa menu đang chọn?" : menuAction === "create" ? "Tạo menu riêng" : "Đổi tên menu"}</h3>
          {menuAction !== "delete" ? <label className={styles.formField}><span>Tên menu *</span><input required maxLength={255} placeholder="Ví dụ: Món yêu thích" value={menuName} onChange={(event) => setMenuName(event.target.value)} /></label> : <p>Chỉ menu rỗng mới được xóa; các công thức không bị tự động xóa.</p>}
          <div className={styles.recipeMenuActions}><ButtonBar type="submit" disabled={busy || (menuAction !== "delete" && !menuName.trim())}>{menuMutation.isPending ? "Đang lưu…" : menuAction === "create" ? "Tạo menu" : menuAction === "rename" ? "Lưu tên menu" : "Xóa menu"}</ButtonBar><ButtonBar disabled={busy} onClick={() => setMenuAction(null)}>Hủy</ButtonBar></div>
        </form> : null}
      </section> : null}
      <section className={styles.recipeMenuPanel}>
        <div className={styles.panelHeading}><div><h2>{mode === "create" ? "Thêm món riêng" : mode === "edit" ? "Chỉnh sửa công thức riêng" : "Công thức riêng"}</h2><p>{mode === "view" ? "Chọn món để xem chi tiết, hoặc thêm món mới vào menu của bạn." : "Điền thông tin và kiểm tra trước khi lưu."}</p></div>{mode === "view" ? <ButtonBar className={styles.recipeMenuPrimary} disabled={busy || !canCreate} onClick={openCreate}>Tạo công thức riêng</ButtonBar> : null}</div>
        <div className={styles.recipeMenuWorkspace} data-editing={mode !== "view"}>
        {mode === "view" ? <div className={styles.recipeMenuBrowser}>
        {menuId ? <form className={styles.recipeMenuToolbar} onSubmit={(event) => { event.preventDefault(); if (busy) return; resetContext(); setRecipeQ(recipeSearch); setRecipePage(0); }}>
          <label className={styles.formField}><span>Tìm công thức trong menu</span><input placeholder="Nhập tên món…" value={recipeSearch} onChange={(event) => setRecipeSearch(event.target.value)} /></label><ButtonBar type="submit">Tìm kiếm</ButtonBar>
        </form> : null}
        {recipes.isFetching ? <p role="status">Đang tải công thức…</p> : null}
        {recipes.isError ? <div role="alert"><p>{getRecipeApiErrorMessage(recipes.error)}</p><ButtonBar onClick={() => void recipes.refetch()}>Thử lại</ButtonBar></div> : null}
        {recipes.data ? <>
          <ul className={styles.recipeMenuList}>{recipes.data.content.map((item) => <li key={item.id} className={styles.recipeMenuItem}><button type="button" aria-pressed={recipeId === item.id} disabled={busy} onClick={() => { if (selectedRecipeId === item.id && detail.data?.id === item.id) { detailRef.current?.scrollIntoView({ block: "nearest" }); detailRef.current?.querySelector<HTMLHeadingElement>("h3")?.focus({ preventScroll: true }); } resetContext(); setSelectedRecipeId(item.id); clear(); void router.push({ pathname: PATH_CUSTOMER.MENU_ADJUSTMENTS, query: { menuId, recipeId: item.id } }, undefined, { scroll: false }); }}><span className={styles.recipeMenuRecipeMain}><strong>{item.name}</strong><span className={styles.recipeMenuMeta}>{item.sourceGlobalRecipeId ? "Bản sao riêng · nguồn phiên bản " + (item.sourceRevision ?? "chưa xác định") : "Công thức tự tạo"}</span></span><span aria-hidden="true">›</span></button></li>)}</ul>
          {!recipes.data.content.length ? <p className={styles.recipeMenuEmpty}>Chưa có công thức phù hợp trong menu này.</p> : null}
          {pagination(recipes.data.page, recipes.data.last, (page) => { resetContext(); setRecipePage(page); }, "Công thức trong menu riêng")}
        </> : null}
        </div> : null}
        {mode !== "view" ? <form ref={editorRef} className={styles.recipeMenuEditor} onInvalidCapture={(event) => { const disclosure = (event.target as HTMLElement).closest("details"); if (disclosure) disclosure.open = true; }} onSubmit={submit} aria-label="Thông tin công thức riêng" aria-busy={create.isPending || edit.isPending}>
          <div className={styles.panelHeading}><div><h3>{mode === "create" ? "Thông tin món mới" : "Thông tin món"}</h3><p>Menu đích: <strong>{menus.data?.content.find((item) => item.id === menuId)?.name ?? menu.data?.name ?? (menuId ? "Menu đã chọn (chưa tải được tên)" : "Menu của tôi")}</strong></p></div><ButtonBar disabled={busy} onClick={cancelEditor}>Quay lại danh sách</ButtonBar></div>
          <label className={styles.formField}><span>Tên món / công thức *</span><input required placeholder="Ví dụ: Espresso đậm vị" value={name} onChange={(event) => setName(event.target.value)} /></label>
          {mode === "create" ? <>
            <details className={styles.recipeMenuDisclosure}><summary>Thông tin bổ sung (không bắt buộc)</summary><div className={styles.recipeMenuFormGrid}><label className={styles.formField}><span>Mã tên (tùy chọn)</span><input value={slug} onChange={(event) => setSlug(event.target.value)} /></label><label className={styles.formField}><span>Đường dẫn ảnh (tùy chọn)</span><input value={imagePath} onChange={(event) => setImagePath(event.target.value)} /></label></div></details>
            <RecipeProcedureFields value={procedure} onChange={setProcedure} prefix="owner-procedure" disabled={busy} />
          </> : <>
            <p className={styles.recipeMenuError}>Bạn có thể đổi tên và thông tin tham khảo của món tại đây. Muốn thay đổi đầy đủ thông số pha trên máy, hãy tạo công thức riêng mới và kiểm tra kết quả đồng bộ.</p>
            <label className={styles.formField}><span>Các bước tham khảo * (mỗi dòng một bước)</span><textarea required rows={5} value={editSteps} onChange={(event) => setEditSteps(event.target.value)} /></label>
            <label className={styles.formField}><span>Định lượng cũ (tùy chọn, mỗi dòng một giá trị như water:40)</span><textarea rows={3} value={editOverrides} onChange={(event) => setEditOverrides(event.target.value)} /></label>
            <label className={styles.recipeMenuConfirmation}><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} required /> Tôi hiểu việc lưu thông tin chưa xác nhận máy đã áp dụng thay đổi.</label>
          </>}
          {validation ? <p className={styles.recipeMenuError} role="alert">{validation}</p> : null}
          <div className={styles.recipeMenuEditorFooter}><p>Sau khi lưu, mở Đồng bộ với máy để kiểm tra món đã được áp dụng.</p><div className={styles.recipeMenuActions}><ButtonBar className={styles.recipeMenuPrimary} type="submit" disabled={busy || (mode === "edit" ? !confirmed || !editTargetId : !canCreate)}>{create.isPending || edit.isPending ? "Đang lưu…" : "Lưu công thức"}</ButtonBar><ButtonBar disabled={busy} onClick={cancelEditor}>Hủy</ButtonBar></div></div>
        </form> : detail.data ? <section ref={detailRef} className={styles.recipeMenuDetail} aria-label="Chi tiết công thức riêng">
          <div className={styles.panelHeading}><div><h3 tabIndex={-1}>{detail.data.name}</h3><p>Thông tin công thức trong menu của bạn</p></div></div>
          {sourceId ? <div className={styles.notice}>
            {source.isPending ? "Đang kiểm tra phiên bản nguồn…" : source.isError || !source.data || detail.data.sourceRevision === null ? "Chưa kiểm tra được phiên bản nguồn; chưa thể kết luận có bản mới." : source.data.revision > detail.data.sourceRevision ? "Có phiên bản mới từ Dolores. Công thức riêng hiện tại của bạn vẫn được giữ nguyên." : source.data.revision === detail.data.sourceRevision ? "Phiên bản nguồn khớp với lần sao chép; các điều chỉnh riêng vẫn được giữ." : "Phiên bản nguồn khác với lần sao chép; cần kiểm tra trước khi tạo bản mới."}
            {source.isError ? <ButtonBar onClick={() => void source.refetch()}>Kiểm tra lại</ButtonBar> : null}
            {source.isSuccess && !source.isFetching && source.data && detail.data.sourceRevision !== null && source.data.revision > detail.data.sourceRevision ? <ButtonBar disabled={busy} onClick={() => { clear(); copyNew.mutate({ globalRecipeId: sourceId, menuId: detail.data.menuId }); }}>Tạo bản sao từ phiên bản mới</ButtonBar> : null}
          </div> : <p className={styles.recipeMenuMeta}>Công thức tự tạo, không gắn với phiên bản dùng chung.</p>}
          <h4>Thông số pha tham khảo</h4><RecipeSteps steps={detail.data.steps} />
          <p className={styles.recipeMenuMeta}>Thông số trên dùng để tham khảo. Mở Đồng bộ với máy để kiểm tra máy đã nhận công thức.</p>
          <details className={styles.recipeMenuDisclosure}><summary>Sắp xếp hoặc chỉnh sửa công thức</summary><div className={styles.recipeMenuOperatorTools}>
          <label className={styles.formField}><span>Chuyển sang menu khác</span><select value={targetMenu} onChange={(event) => setTargetMenu(event.target.value)}><option value="">Chọn menu đích</option>{menus.data?.content.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <div className={styles.recipeMenuActions}>
            <ButtonBar disabled={busy || !targetMenu || targetMenu === detail.data.menuId} onClick={() => { clear(); move.mutate({ menuId: targetMenu, recipeId: detail.data.id }); }}>Chuyển menu</ButtonBar>
            <ButtonBar disabled={busy} onClick={() => { clear(); setName(detail.data.name); setEditSteps(detail.data.steps.join("\n")); setEditOverrides(detail.data.dosageOverrides.join("\n")); setConfirmed(false); setEditTargetId(detail.data.id); setDeleteTarget(null); setMode("edit"); }}>Chỉnh sửa thông tin món</ButtonBar>
            <ButtonBar disabled={busy} onClick={() => setDeleteTarget({ id: detail.data.id, name: detail.data.name })}>Xóa công thức riêng</ButtonBar>
          </div>
          {deleteTarget ? <div className={styles.recipeMenuEditor}><p>Xóa bản công thức riêng “{deleteTarget.name}”?</p><div className={styles.recipeMenuActions}><ButtonBar disabled={busy} onClick={() => { clear(); remove.mutate(deleteTarget.id); }}>Xác nhận xóa</ButtonBar><ButtonBar disabled={busy} onClick={() => setDeleteTarget(null)}>Hủy</ButtonBar></div></div> : null}
          </div></details>
        </section> : null}
        {mode === "view" && detail.isFetching ? <p role="status">Đang tải chi tiết…</p> : null}
        {mode === "view" && detail.isError ? <div role="alert"><p>{getRecipeApiErrorMessage(detail.error)}</p><ButtonBar onClick={() => void detail.refetch()}>Thử lại</ButtonBar></div> : null}
        </div>
      </section>
      {mode === "view" ? <details className={styles.recipeMenuDisclosure}><summary>Định lượng đã lưu trước đây</summary>
        <p className={styles.recipeMenuMeta}>Mở các điều chỉnh định lượng cũ nếu bạn đã sử dụng trước đây. Các món tự tạo và bản sao nằm trong Menu của tôi ở trên.</p>
        <ButtonBar href={PATH_CUSTOMER.MENU_ADJUSTMENTS + "?view=legacy"}>Xem điều chỉnh định lượng cũ</ButtonBar>
      </details> : null}
    </>}
  </section>;
}
