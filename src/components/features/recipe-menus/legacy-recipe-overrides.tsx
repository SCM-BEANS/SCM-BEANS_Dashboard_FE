import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { recipesApi } from "@/apis/recipes.api";
import { PageActions } from "@/components/action-bar/page-actions";
import { ButtonBar } from "@/components/button/button-bar";
import { getRecipeApiErrorMessage } from "@/lib/api-errors";
import { authScopedQuerySubject } from "@/lib/query-subject";
import { LocalRecipeUpsertRequestSchema } from "@/schema/recipes.schema";
import styles from "../repair-workflow/repair-workflow.module.css";

export function LegacyRecipeOverrides({ role }: { role: "OWNER" | "ADMIN" }) {
  const client = useQueryClient();
  const subject = authScopedQuerySubject(role);
  const [page, setPage] = useState(0);
  const [globalPage, setGlobalPage] = useState(0);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [globalId, setGlobalId] = useState("");
  const [editId, setEditId] = useState("");
  const [values, setValues] = useState("");
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const global = useQuery({
    queryKey: ["dolores", "recipes", "global", subject, "legacy-options", globalPage, q],
    queryFn: ({ signal }) => recipesApi.listGlobalPage(globalPage, 20, signal, q), enabled: role === "OWNER", retry: false,
  });
  const local = useQuery({
    queryKey: ["dolores", "recipes", "local", subject, page],
    queryFn: ({ signal }) => recipesApi.listLocalPage({ page, size: 20 }, signal), retry: false,
  });
  const id = selectedId || local.data?.items[0]?.id || "";
  const detail = useQuery({
    queryKey: ["dolores", "recipes", "local-detail", subject, id],
    queryFn: ({ signal }) => recipesApi.getLocalById(id, signal), enabled: Boolean(id), retry: false,
  });
  const invalidate = () => Promise.all([
    client.invalidateQueries({ queryKey: ["dolores", "recipes", "local"] }),
    client.invalidateQueries({ queryKey: ["dolores", "recipes", "local-detail"] }),
    client.invalidateQueries({ queryKey: ["dolores", "recipe-sync"] }),
    client.invalidateQueries({ queryKey: ["dolores", "recipe-sync-history"] }),
  ]);
  const save = useMutation({
    mutationFn: (input: { id?: string; globalRecipeId: string; dosageOverrides: string[] }) => recipesApi.upsertLocal(input),
    onSuccess: async (result) => { setSelectedId(result.id); setEditId(""); setValues(""); setNotice("Đã lưu điều chỉnh cũ. Điều chỉnh chỉ tham gia nhánh tương thích khi máy dùng công thức chung; không thay thế công thức trong menu riêng."); await invalidate(); },
    retry: false,
  });
  const remove = useMutation({
    mutationFn: (targetId: string) => recipesApi.deleteLocal(targetId),
    onSuccess: async () => { setSelectedId(""); setEditId(""); setValues(""); setRemoveTarget(null); setNotice("Đã xóa điều chỉnh cũ."); await invalidate(); },
    retry: false,
  });
  const submit = (event: FormEvent) => {
    event.preventDefault(); setNotice(""); save.reset(); remove.reset();
    const parsed = LocalRecipeUpsertRequestSchema.safeParse({
      ...(editId ? { id: editId } : {}), globalRecipeId: globalId,
      dosageOverrides: values.split(/\r?\n/).map((value) => value.trim()).filter(Boolean),
    });
    if (!parsed.success) { setNotice("Chọn công thức và nhập mỗi dòng theo dạng tên:giá_trị, ví dụ water:40. Có thể để trống toàn bộ định lượng."); return; }
    save.mutate(parsed.data);
  };
  const busy = save.isPending || remove.isPending;
  const changePage = (next: number) => { setPage(next); setSelectedId(""); setRemoveTarget(null); setEditId(""); setGlobalId(""); setValues(""); };
  return <section className={styles.recipeMenuPanel}>
    <div className={styles.panelHeading}><div><h2>Điều chỉnh định lượng cũ</h2><p>Duy trì các bản ghi tương thích trước đây. Công thức trong menu riêng và thông số máy áp dụng được quản lý riêng.</p></div></div>
    {notice ? <p className={styles.notice} role="status">{notice}</p> : null}
    {local.isPending ? <p role="status">Đang tải điều chỉnh…</p> : null}
    {local.isError ? <div role="alert"><p>{getRecipeApiErrorMessage(local.error)}</p><ButtonBar onClick={() => void local.refetch()}>Thử lại</ButtonBar></div> : null}
    {local.data ? <>
      <ul className={styles.recipeMenuList}>{local.data.items.map((item) => <li className={styles.recipeMenuItem} key={item.id}><button type="button" disabled={busy} aria-pressed={item.id === id} onClick={() => { setSelectedId(item.id); setRemoveTarget(null); }}>
        <span className={styles.recipeMenuRecipeMain}><strong>{item.globalRecipeName ?? "Công thức tương thích"}</strong>{role === "ADMIN" ? <span className={styles.recipeMenuMeta}>Owner: {item.ownerId}</span> : null}</span><span aria-hidden="true">›</span>
      </button></li>)}</ul>
      {!local.data.items.length ? <p className={styles.recipeMenuEmpty}>Chưa có điều chỉnh cũ.</p> : null}
      <nav className={styles.recipeMenuPagination} aria-label="Điều chỉnh cũ"><ButtonBar disabled={!page || busy} onClick={() => changePage(page - 1)}>Trang trước</ButtonBar><span>Trang {page + 1}</span><ButtonBar disabled={!local.data.hasNext || busy} onClick={() => changePage(page + 1)}>Trang sau</ButtonBar></nav>
    </> : null}
    {detail.isFetching ? <p role="status">Đang tải chi tiết…</p> : null}
    {detail.isError ? <div role="alert"><p>{getRecipeApiErrorMessage(detail.error)}</p><ButtonBar onClick={() => void detail.refetch()}>Thử lại</ButtonBar></div> : null}
    {detail.data ? <div className={styles.recipeMenuDetail}>
      <h3>{detail.data.globalRecipeName ?? "Định lượng đã lưu"}</h3>
      <ul>{detail.data.dosageOverrides.map((value, index) => <li key={index}>{value}</li>)}</ul>
      {!detail.data.dosageOverrides.length ? <p>Không ghi đè định lượng.</p> : null}
      <div className={styles.recipeMenuActions}>
        {role === "OWNER" ? <ButtonBar disabled={busy} onClick={() => { setEditId(detail.data.id); setGlobalId(detail.data.globalRecipeId); setValues(detail.data.dosageOverrides.join("\n")); setNotice(""); }}>Sửa điều chỉnh cũ</ButtonBar> : null}
        <ButtonBar disabled={busy} onClick={() => setRemoveTarget(detail.data.id)}>Xóa điều chỉnh</ButtonBar>
      </div>
      {removeTarget ? <div><p>Xóa điều chỉnh đã chọn?</p><div className={styles.recipeMenuActions}><ButtonBar holdToConfirm disabled={busy} onClick={() => remove.mutate(removeTarget)}>Xác nhận xóa</ButtonBar><ButtonBar disabled={busy} onClick={() => setRemoveTarget(null)}>Hủy</ButtonBar></div></div> : null}
    </div> : null}
    {role === "OWNER" ? <form id="legacy-recipe-form" className={styles.recipeMenuEditor} onSubmit={submit}>
      <h3>{editId ? "Cập nhật điều chỉnh cũ" : "Tạo điều chỉnh tương thích"}</h3>
      <div className={styles.recipeMenuToolbar}>
        <label className={styles.formField}><span>Tìm công thức nguồn</span><input value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        <ButtonBar onClick={() => { setQ(search); setGlobalPage(0); }}>Tìm kiếm</ButtonBar>
      </div>
      {global.isError ? <div role="alert"><p>{getRecipeApiErrorMessage(global.error)}</p><ButtonBar onClick={() => void global.refetch()}>Thử lại</ButtonBar></div> : null}
      <label className={styles.formField}><span>Công thức nguồn *</span><select required value={globalId} disabled={busy || Boolean(editId)} onChange={(event) => setGlobalId(event.target.value)}>
        <option value="">Chọn công thức</option>
        {editId && globalId && !global.data?.items.some((item) => item.id === globalId) ? <option value={globalId}>{detail.data?.globalRecipeName ?? "Nguồn của điều chỉnh đang sửa"}</option> : null}
        {global.data?.items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select></label>
      {global.data ? <nav className={styles.recipeMenuPagination} aria-label="Công thức nguồn"><ButtonBar disabled={!globalPage} onClick={() => setGlobalPage(globalPage - 1)}>Trang trước</ButtonBar><span>Trang {globalPage + 1}</span><ButtonBar disabled={!global.data.hasNext} onClick={() => setGlobalPage(globalPage + 1)}>Trang sau</ButtonBar></nav> : null}
      <label className={styles.formField}><span>Định lượng (mỗi dòng một giá trị)</span><textarea rows={4} placeholder="water:40" value={values} onChange={(event) => setValues(event.target.value)} /><small>Để trống nếu bạn không muốn thay đổi định lượng. Giá trị sẽ được kiểm tra trước khi lưu.</small></label>

    </form> : null}
    <PageActions actions={role === "OWNER" ? [
      ...(editId ? [{ id: "legacy-cancel", label: "Hủy sửa", priority: 100, disabled: busy, onClick: () => { setEditId(""); setGlobalId(""); setValues(""); }, confirm: { title: "Hủy chỉnh sửa?", description: "Các thay đổi chưa lưu sẽ bị mất.", confirmLabel: "Hủy sửa" } }] : []),
      { id: "legacy-save", label: "Lưu điều chỉnh cũ", variant: "primary", priority: 100, type: "submit", form: "legacy-recipe-form", disabled: busy || !globalId, disabledReason: "Chọn công thức nguồn hoặc chờ yêu cầu hoàn tất.", pending: save.isPending, pendingLabel: "Đang lưu…" },
    ] : []} />
    {save.isError || remove.isError ? <p className={styles.recipeMenuError} role="alert">{getRecipeApiErrorMessage(save.error ?? remove.error, "mutation")}</p> : null}
  </section>;
}
