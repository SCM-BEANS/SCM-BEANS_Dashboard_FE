import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { machinesApi } from "@/apis/machines.api";
import { recipeMenusApi } from "@/apis/recipe-menus.api";
import { recipesApi } from "@/apis/recipes.api";
import { ButtonBar } from "@/components/button/button-bar";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import { getApiErrorMessage } from "@/lib/api-errors";
import { authScopedQuerySubject, getAuthenticatedSubjectId } from "@/lib/query-subject";
import styles from "../repair-workflow/repair-workflow.module.css";

type Role = "owner" | "operator";

function QueryError({ error, retry }: { error: unknown; retry: () => unknown }) {
  return <div className={`${styles.notice} ${styles.error}`} role="alert"><p>{getApiErrorMessage(error)}</p><ButtonBar type="button" onClick={() => void retry()}>Thử lại</ButtonBar></div>;
}

export function RecipeMenusScreen({ role, operatorRole }: { role: Role; operatorRole?: "ADMIN" | "MODERATOR" }) {
  const owner = role === "owner";
  const subject = authScopedQuerySubject(owner ? "OWNER" : operatorRole ?? "operator");
  const ownerSubjectId = getAuthenticatedSubjectId();
  const client = useQueryClient();
  const [globalMenuId, setGlobalMenuId] = useState("");
  const [localMenuId, setLocalMenuId] = useState("");
  const [globalRecipeId, setGlobalRecipeId] = useState("");
  const [viewGlobalRecipeId, setViewGlobalRecipeId] = useState("");
  const [localRecipeId, setLocalRecipeId] = useState("");
  const [menuName, setMenuName] = useState("");
  const [recipeName, setRecipeName] = useState("");
  const [steps, setSteps] = useState("");
  const [bounds, setBounds] = useState("");
  const [overrides, setOverrides] = useState("");
  const [machineId, setMachineId] = useState("");
  const [readSync, setReadSync] = useState(false);

  const globalMenus = useQuery({ queryKey: ["dolores", "recipe-menus", "global", subject], queryFn: ({ signal }) => recipeMenusApi.listGlobal({ page: 0, size: 100 }, signal), retry: false });
  const selectedGlobalMenuId = globalMenuId || globalMenus.data?.content[0]?.id || "";
  const globalMenuRecipes = useQuery({ queryKey: ["dolores", "recipe-menu", "global", selectedGlobalMenuId, subject], queryFn: ({ signal }) => recipeMenusApi.listGlobalRecipes(selectedGlobalMenuId, { page: 0, size: 100 }, signal), enabled: Boolean(selectedGlobalMenuId), retry: false });
  const globalRecipes = useQuery({ queryKey: ["dolores", "recipe-global-summaries", subject], queryFn: ({ signal }) => recipesApi.listGlobalSummaries(signal, 0, 100), enabled: !owner, retry: false });
  const globalRecipeDetail = useQuery({ queryKey: ["dolores", "recipe-global-detail", subject, viewGlobalRecipeId], queryFn: ({ signal }) => recipesApi.getGlobalById(viewGlobalRecipeId, signal), enabled: Boolean(viewGlobalRecipeId), retry: false });

  const localMenus = useQuery({ queryKey: ["dolores", "recipe-menus", "local", subject], queryFn: ({ signal }) => recipeMenusApi.listLocal({ page: 0, size: 100 }, signal), enabled: owner, retry: false });
  const selectedLocalMenuId = localMenuId || localMenus.data?.content[0]?.id || "";
  const localRecipes = useQuery({ queryKey: ["dolores", "recipe-menu", "local", subject, selectedLocalMenuId], queryFn: ({ signal }) => recipeMenusApi.listLocalRecipes(selectedLocalMenuId, { page: 0, size: 100 }, signal), enabled: owner && Boolean(selectedLocalMenuId), retry: false });
  const selectedLocalRecipeId = localRecipeId || localRecipes.data?.content[0]?.id || "";
  const localRecipe = useQuery({ queryKey: ["dolores", "recipe-local-detail", subject, selectedLocalRecipeId], queryFn: ({ signal }) => recipeMenusApi.getLocalRecipe(selectedLocalRecipeId, signal), enabled: owner && Boolean(selectedLocalRecipeId), retry: false });
  const machines = useQuery({ queryKey: ["dolores", "owner", "recipe-sync-machines", subject], queryFn: ({ signal }) => machinesApi.list(signal), enabled: owner, retry: false });
  const ownerMachines = machines.data?.filter((item) => item.ownerId?.toLowerCase() === ownerSubjectId?.toLowerCase()) ?? [];
  const selectedMachineId = machineId || ownerMachines[0]?.id || "";
  const syncStatus = useQuery({ queryKey: ["dolores", "recipe-sync", subject, selectedMachineId], queryFn: ({ signal }) => recipesApi.getSyncStatus(selectedMachineId, signal), enabled: owner && readSync && Boolean(selectedMachineId), retry: false });
  const syncHistory = useQuery({ queryKey: ["dolores", "recipe-sync-history", subject, selectedMachineId], queryFn: ({ signal }) => recipesApi.getSyncHistory(selectedMachineId, 0, 20, signal), enabled: owner && readSync && Boolean(selectedMachineId), retry: false });

  useEffect(() => {
    if (!localRecipe.data) return;
    setRecipeName(localRecipe.data.name);
    setSteps(localRecipe.data.steps.join("\n"));
    setBounds(localRecipe.data.dosageBounds.join("\n"));
    setOverrides(localRecipe.data.dosageOverrides.join("\n"));
  }, [localRecipe.data]);

  const invalidateMenus = async () => Promise.all([
    client.invalidateQueries({ queryKey: ["dolores", "recipe-menus", "global", subject] }),
    client.invalidateQueries({ queryKey: ["dolores", "recipe-menus", "local", subject] }),
    client.invalidateQueries({ queryKey: ["dolores", "recipe-menu", subject] }),
    client.invalidateQueries({ queryKey: ["dolores", "recipe-menu"] }),
  ]);
  const createMenu = useMutation({ mutationFn: (name: string) => owner ? recipeMenusApi.createLocal(name) : recipeMenusApi.createGlobal(name), onSuccess: async (menu) => { if (owner) setLocalMenuId(menu.id); else setGlobalMenuId(menu.id); setMenuName(""); await invalidateMenus(); } });
  const renameMenu = useMutation({ mutationFn: (input: { id: string; name: string }) => owner ? recipeMenusApi.renameLocal(input.id, input.name) : recipeMenusApi.renameGlobal(input.id, input.name), onSuccess: invalidateMenus });
  const deleteMenu = useMutation({ mutationFn: (id: string) => owner ? recipeMenusApi.deleteLocal(id) : recipeMenusApi.deleteGlobal(id), onSuccess: async () => { if (owner) setLocalMenuId(""); else setGlobalMenuId(""); await invalidateMenus(); } });
  const assignRecipe = useMutation({ mutationFn: (input: { menuId: string; recipeId: string }) => recipeMenusApi.assignGlobalRecipe(input.menuId, input.recipeId), onSuccess: invalidateMenus });
  const removeRecipe = useMutation({ mutationFn: (input: { menuId: string; recipeId: string }) => recipeMenusApi.removeGlobalRecipe(input.menuId, input.recipeId), onSuccess: invalidateMenus });
  const copyRecipe = useMutation({ mutationFn: (input: { globalRecipeId: string; menuId?: string }) => recipeMenusApi.copyGlobalRecipe(input), onSuccess: async (recipe) => { setLocalMenuId(recipe.menuId); setLocalRecipeId(recipe.id); await invalidateMenus(); } });
  const editRecipe = useMutation({ mutationFn: (input: { id: string; name: string; steps: string[]; dosageBounds: string[]; dosageOverrides: string[] }) => recipeMenusApi.editLocalRecipe(input.id, input), onSuccess: async (recipe) => { setLocalRecipeId(recipe.id); await invalidateMenus(); } });
  const deleteRecipe = useMutation({ mutationFn: (id: string) => recipeMenusApi.deleteLocalRecipe(id), onSuccess: async () => { setLocalRecipeId(""); await invalidateMenus(); } });
  const sync = useMutation({ mutationFn: (id: string) => recipesApi.requestSync([id]), onSuccess: async () => { setReadSync(true); await Promise.all([client.invalidateQueries({ queryKey: ["dolores", "recipe-sync", subject] }), client.invalidateQueries({ queryKey: ["dolores", "recipe-sync-history", subject] })]); } });
  const mutationError = createMenu.error ?? renameMenu.error ?? deleteMenu.error ?? assignRecipe.error ?? removeRecipe.error ?? copyRecipe.error ?? editRecipe.error ?? deleteRecipe.error ?? sync.error;

  const submitMenu = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (menuName.trim()) createMenu.mutate(menuName.trim()); };
  const submitRename = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const id = owner ? selectedLocalMenuId : selectedGlobalMenuId; if (id && menuName.trim()) renameMenu.mutate({ id, name: menuName.trim() }); };
  const submitEdit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const id = selectedLocalRecipeId;
    const clean = (value: string) => value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (id && recipeName.trim() && clean(steps).length && clean(bounds).length) editRecipe.mutate({ id, name: recipeName.trim(), steps: clean(steps), dosageBounds: clean(bounds), dosageOverrides: clean(overrides) });
  };

  return <div className={styles.screen}>
    <BackButtonHeading title={owner ? "Menu của tôi và công thức" : "Quản lý menu công thức"} titleId="recipe-menus-title" description={owner ? "Duyệt công thức toàn cục, sao chép thành snapshot riêng, chỉnh sửa bản sao và xem trạng thái đồng bộ máy." : "Quản lý danh mục menu toàn cục và thành viên công thức."} back={null} />
    <section className={styles.panel} aria-labelledby="global-menu-panel-title">
      <div className={styles.panelHeading}><div><h2 id="global-menu-panel-title" className={styles.sectionTitle}>{owner ? "Menu toàn cục" : "Menu toàn cục"}</h2><p className={styles.formHint}>Công thức nguồn vẫn là bản chỉ đọc; thao tác Owner tạo snapshot cục bộ độc lập.</p></div></div>
      {globalMenus.isPending ? <p className={styles.notice} role="status">Đang tải menu toàn cục…</p> : null}
      {globalMenus.isError ? <QueryError error={globalMenus.error} retry={() => globalMenus.refetch()} /> : null}
      <label className={styles.formField}><span>Chọn menu toàn cục</span><select value={selectedGlobalMenuId} onChange={(event) => setGlobalMenuId(event.target.value)}><option value="">Chọn menu</option>{globalMenus.data?.content.map((menu) => <option key={menu.id} value={menu.id}>{menu.name}</option>)}</select></label>
      {globalMenuRecipes.isError ? <QueryError error={globalMenuRecipes.error} retry={() => globalMenuRecipes.refetch()} /> : null}
      {globalMenuRecipes.data?.content.length ? <div className={styles.detailGrid}>{globalMenuRecipes.data.content.map((recipe) => <article className={styles.detailItem} key={recipe.id}><strong>{recipe.name}</strong><span>Rev {recipe.revision}</span><span className={styles.codeValue}>{recipe.id}</span><ButtonBar type="button" onClick={() => setViewGlobalRecipeId(recipe.id)}>Xem công thức</ButtonBar>{owner ? <ButtonBar type="button" disabled={copyRecipe.isPending || !localMenus.isSuccess || (!selectedLocalMenuId && Boolean(localMenus.data?.content.length))} onClick={() => copyRecipe.mutate({ globalRecipeId: recipe.id, ...(selectedLocalMenuId ? { menuId: selectedLocalMenuId } : {}) })}>Sao chép vào menu riêng</ButtonBar> : null}{!owner && selectedGlobalMenuId ? <ButtonBar type="button" disabled={removeRecipe.isPending} onClick={() => removeRecipe.mutate({ menuId: selectedGlobalMenuId, recipeId: recipe.id })}>Chuyển về menu mặc định</ButtonBar> : null}</article>)}</div> : globalMenuRecipes.isSuccess ? <p className={styles.notice} role="status">Menu chưa có công thức.</p> : null}
      {globalRecipeDetail.data ? <div className={styles.formPanel}><h3 className={styles.sectionTitle}>{globalRecipeDetail.data.name}</h3><p>Các bước</p><ol>{globalRecipeDetail.data.steps.map((step, index) => <li key={`${globalRecipeDetail.data!.id}-${index}`}>{step}</li>)}</ol><p>Giới hạn định lượng</p><ul>{globalRecipeDetail.data.dosageBounds.map((bound, index) => <li key={`${globalRecipeDetail.data!.id}-bound-${index}`}>{bound}</li>)}</ul></div> : null}
    </section>

    {owner ? <>
      <section className={styles.panel} aria-labelledby="owner-menu-panel-title"><h2 id="owner-menu-panel-title" className={styles.sectionTitle}>Menu riêng</h2>
        {localMenus.isError ? <QueryError error={localMenus.error} retry={() => localMenus.refetch()} /> : null}
        <form className={styles.technicalRequestActions} onSubmit={submitMenu}><label className={styles.formField}><span>Tạo menu</span><input value={menuName} maxLength={160} onChange={(event) => setMenuName(event.target.value)} /></label><ButtonBar type="submit" disabled={!menuName.trim() || createMenu.isPending}>Tạo menu riêng</ButtonBar></form>
        <label className={styles.formField}><span>Chọn menu riêng</span><select value={selectedLocalMenuId} onChange={(event) => { setLocalMenuId(event.target.value); setLocalRecipeId(""); }}><option value="">Chọn menu</option>{localMenus.data?.content.map((menu) => <option key={menu.id} value={menu.id}>{menu.name}</option>)}</select></label>
        {selectedLocalMenuId ? <div className={styles.technicalRequestActions}><form className={styles.technicalRequestActions} onSubmit={submitRename}><label className={styles.formField}><span>Đổi tên menu</span><input value={menuName} maxLength={160} onChange={(event) => setMenuName(event.target.value)} /></label><ButtonBar type="submit" disabled={!menuName.trim() || renameMenu.isPending}>Đổi tên</ButtonBar></form><ButtonBar type="button" disabled={deleteMenu.isPending} onClick={() => deleteMenu.mutate(selectedLocalMenuId)}>Xóa menu rỗng</ButtonBar></div> : null}
        {localRecipes.isError ? <QueryError error={localRecipes.error} retry={() => localRecipes.refetch()} /> : null}
        {localRecipes.data?.content.length ? <div className={styles.detailGrid}>{localRecipes.data.content.map((recipe) => <button key={recipe.id} className={styles.detailItem} type="button" aria-pressed={selectedLocalRecipeId === recipe.id} onClick={() => setLocalRecipeId(recipe.id)}><strong>{recipe.name}</strong><span>Snapshot từ rev {recipe.sourceRevision ?? "—"}</span><span className={styles.codeValue}>{recipe.id}</span></button>)}</div> : selectedLocalMenuId && localRecipes.isSuccess ? <p className={styles.notice} role="status">Menu riêng này chưa có snapshot. Sao chép công thức từ menu toàn cục.</p> : null}
        {localRecipe.isError ? <QueryError error={localRecipe.error} retry={() => localRecipe.refetch()} /> : null}
        {localRecipe.data ? <form className={styles.formPanel} onSubmit={submitEdit}><h3 className={styles.sectionTitle}>Chỉnh snapshot riêng</h3><label className={styles.formField}><span>Tên</span><input value={recipeName} maxLength={160} onChange={(event) => setRecipeName(event.target.value)} /></label><label className={styles.formField}><span>Các bước, mỗi dòng một bước</span><textarea value={steps} onChange={(event) => setSteps(event.target.value)} /></label><label className={styles.formField}><span>Giới hạn định lượng</span><textarea value={bounds} onChange={(event) => setBounds(event.target.value)} /></label><label className={styles.formField}><span>Override riêng (mỗi dòng một giá trị)</span><textarea value={overrides} onChange={(event) => setOverrides(event.target.value)} /></label><ButtonBar type="submit" disabled={editRecipe.isPending}>Lưu snapshot cục bộ</ButtonBar><ButtonBar type="button" disabled={deleteRecipe.isPending} onClick={() => deleteRecipe.mutate(localRecipe.data!.id)}>Xóa snapshot</ButtonBar></form> : null}
      </section>
      <section className={styles.panel} aria-labelledby="sync-panel-title"><h2 id="sync-panel-title" className={styles.sectionTitle}>Đồng bộ công thức lên máy</h2>{machines.isError ? <QueryError error={machines.error} retry={() => machines.refetch()} /> : null}<label className={styles.formField}><span>Máy thuộc Owner này</span><select value={selectedMachineId} onChange={(event) => { setMachineId(event.target.value); setReadSync(false); }}><option value="">Chọn máy</option>{ownerMachines.map((machine) => <option key={machine.id} value={machine.id}>{machine.serialNumber ?? machine.id} · {machine.status}</option>)}</select></label><div className={styles.technicalRequestActions}><ButtonBar type="button" disabled={!selectedMachineId || sync.isPending} onClick={() => sync.mutate(selectedMachineId)}>Yêu cầu đồng bộ</ButtonBar><ButtonBar type="button" disabled={!selectedMachineId} onClick={() => setReadSync(true)}>Đọc trạng thái / lịch sử</ButtonBar></div>{syncStatus.isError ? <p className={`${styles.notice} ${styles.error}`} role="alert">{getApiErrorMessage(syncStatus.error)}</p> : null}{syncStatus.data ? <p className={styles.notice} role="status">{syncStatus.data.state} · target v{syncStatus.data.targetVersion} · applied {syncStatus.data.appliedVersion ?? "chưa xác nhận"}</p> : null}{syncHistory.data?.length ? <ul>{syncHistory.data.map((item) => <li key={item.commandId ?? `${item.machineId}-${item.requestedAt}`}>{item.state} · {item.requestedAt ?? "—"} · {item.lastError ?? ""}</li>)}</ul> : null}</section>
    </> : <section className={styles.panel} aria-labelledby="operator-menu-panel-title"><h2 id="operator-menu-panel-title" className={styles.sectionTitle}>Quản lý menu và công thức toàn cục</h2><form className={styles.technicalRequestActions} onSubmit={submitMenu}><label className={styles.formField}><span>Tên menu mới</span><input value={menuName} maxLength={160} onChange={(event) => setMenuName(event.target.value)} /></label><ButtonBar type="submit" disabled={!menuName.trim() || createMenu.isPending}>Tạo menu toàn cục</ButtonBar></form><label className={styles.formField}><span>Chọn menu để quản lý</span><select value={selectedGlobalMenuId} onChange={(event) => setGlobalMenuId(event.target.value)}><option value="">Chọn menu</option>{globalMenus.data?.content.map((menu) => <option key={menu.id} value={menu.id}>{menu.name}</option>)}</select></label>{selectedGlobalMenuId ? <div className={styles.technicalRequestActions}><form className={styles.technicalRequestActions} onSubmit={submitRename}><label className={styles.formField}><span>Đổi tên menu</span><input value={menuName} maxLength={160} onChange={(event) => setMenuName(event.target.value)} /></label><ButtonBar type="submit" disabled={!menuName.trim() || renameMenu.isPending}>Đổi tên</ButtonBar></form><ButtonBar type="button" disabled={deleteMenu.isPending} onClick={() => deleteMenu.mutate(selectedGlobalMenuId)}>Xóa menu rỗng</ButtonBar></div> : null}<label className={styles.formField}><span>Công thức toàn cục thêm vào menu</span><select value={globalRecipeId} onChange={(event) => setGlobalRecipeId(event.target.value)}><option value="">Chọn công thức</option>{globalRecipes.data?.map((recipe) => <option key={recipe.id} value={recipe.id}>{recipe.name} · rev {recipe.revision}</option>)}</select></label><ButtonBar type="button" disabled={!selectedGlobalMenuId || !globalRecipeId || assignRecipe.isPending} onClick={() => assignRecipe.mutate({ menuId: selectedGlobalMenuId, recipeId: globalRecipeId })}>Thêm công thức vào menu</ButtonBar></section>}
    {mutationError ? <p className={`${styles.notice} ${styles.error}`} role="alert">{getApiErrorMessage(mutationError)}</p> : null}
  </div>;
}
