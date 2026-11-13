import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { recipesApi } from "@/apis/recipes.api";
import { ButtonBar } from "@/components/button/button-bar";
import { DataTable } from "@/components/table/data-table";
import { getRecipeApiErrorMessage } from "@/lib/api-errors";
import { authScopedQuerySubject } from "@/lib/query-subject";
import { LocalRecipeUpsertRequestSchema } from "@/schema/recipes.schema";
import styles from "../repair-workflow/repair-workflow.module.css";

function dosageRow(raw: string): [string, string] {
  const separator = raw.indexOf(":");
  return separator === -1 ? [raw, ""] : [raw.slice(0, separator), raw.slice(separator + 1)];
}

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
  const [values, setValues] = useState<[string, string][]>([]);
  const [validation, setValidation] = useState("");
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
    onSuccess: async (result) => { setSelectedId(result.id); setEditId(""); setValues([]); setNotice("Đã lưu điều chỉnh cho công thức dùng chung."); await invalidate(); },
    retry: false,
  });
  const remove = useMutation({
    mutationFn: (targetId: string) => recipesApi.deleteLocal(targetId),
    onSuccess: async () => { setSelectedId(""); setEditId(""); setValues([]); setRemoveTarget(null); setNotice("Đã xóa điều chỉnh cũ."); await invalidate(); },
    retry: false,
  });
  const submit = (event: FormEvent) => {
    event.preventDefault(); if (busy) return; setValidation(""); setNotice(""); save.reset(); remove.reset();
    const parsed = LocalRecipeUpsertRequestSchema.safeParse({
      ...(editId ? { id: editId } : {}), globalRecipeId: globalId,
      dosageOverrides: values.map(([key, value]) => [key.trim(), value.trim()])
        .filter(([key, value]) => key || value)
        .map(([key, value]) => key + ":" + value),
    });
    if (!parsed.success) { setValidation("Mỗi thông số cần có tên và giá trị số. Dùng dấu chấm cho phần thập phân, ví dụ 18.5."); return; }
    save.mutate(parsed.data);
  };
  const busy = save.isPending || remove.isPending;
  const changePage = (next: number) => { setPage(next); setSelectedId(""); setRemoveTarget(null); setEditId(""); setGlobalId(""); setValues([]); };
  const selectItem = (itemId: string) => { setSelectedId(itemId); setRemoveTarget(null); };
  const owner = role === "OWNER";
  const editForm = "legacy-recipe-form";
  return <section className={styles.recipeMenuPanel} data-admin-legacy>

    <div className={styles.panelHeading}><div><h2>Điều chỉnh định lượng cũ</h2>{role === "OWNER" ? <p>Điều chỉnh định lượng cho công thức dùng chung. Bản sao trong Menu của tôi được quản lý riêng.</p> : null}</div></div>
    {notice ? <p className={styles.notice} role="status">{notice}</p> : null}
    <div className={detail.data || detail.isFetching || detail.isError ? styles.adminRecipeColumns : undefined}>
    <div>
    {local.isPending ? <p role="status">Đang tải điều chỉnh…</p> : null}
    {local.isError ? <div role="alert"><p>{getRecipeApiErrorMessage(local.error)}</p><ButtonBar onClick={() => void local.refetch()}>Thử lại</ButtonBar></div> : null}
    {local.data ? <>
      <DataTable variant="accounts" style={{ minWidth: 0 }} rows={local.data.items} rowKey={(item) => item.id}
        rowProps={(item) => ({ "data-selected": item.id === id ? "true" : undefined })}
        columns={[
          { key: "recipe", header: "Công thức", cellProps: () => ({ className: styles.adminRecipeName }), render: (item) => <strong>{item.globalRecipeName ?? "Công thức tương thích"}</strong> },
          ...(owner ? [] : [{ key: "owner", header: "Mã khách hàng", cellProps: (item: NonNullable<typeof local.data>["items"][number]) => ({ title: item.ownerId }), render: (item: NonNullable<typeof local.data>["items"][number]) => item.ownerId.slice(0, 8).toUpperCase() }]),
          { key: "action", header: "", align: "right", render: (item) => <ButtonBar rollingLabel aria-pressed={item.id === id} disabled={busy} onClick={() => selectItem(item.id)}>Xem điều chỉnh</ButtonBar> },
        ]} />
      {!local.data.items.length ? <p className={styles.recipeMenuEmpty}>Chưa có điều chỉnh cũ.</p> : null}
      {page > 0 || local.data.hasNext ? <nav className={styles.recipeMenuPagination} aria-label="Điều chỉnh cũ"><ButtonBar disabled={!page || busy} onClick={() => changePage(page - 1)}>Trang trước</ButtonBar><span>Trang {page + 1}</span><ButtonBar disabled={!local.data.hasNext || busy} onClick={() => changePage(page + 1)}>Trang sau</ButtonBar></nav> : null}
    </> : null}
    </div>
    <div>
    {detail.isFetching ? <p role="status">Đang tải chi tiết…</p> : null}
    {detail.isError ? <div role="alert"><p>{getRecipeApiErrorMessage(detail.error)}</p><ButtonBar onClick={() => void detail.refetch()}>Thử lại</ButtonBar></div> : null}
    {detail.data ? <div className={styles.recipeMenuDetail}>
      <h3>{detail.data.globalRecipeName ?? "Định lượng đã lưu"}</h3>
      {role === "ADMIN" ? <h4>Định lượng đã lưu</h4> : null}
      <dl className={styles.adminRecipeFacts}>{detail.data.dosageOverrides.map((raw, index) => {
        const [key, value] = dosageRow(raw);
        return <div key={index}><dt>{key}</dt><dd>{value || "—"}</dd></div>;
      })}</dl>
      {!detail.data.dosageOverrides.length ? <p>Không ghi đè định lượng.</p> : null}
      <div className={styles.recipeMenuActions}>
        {role === "OWNER" ? <ButtonBar disabled={busy} onClick={() => { setEditId(detail.data.id); setGlobalId(detail.data.globalRecipeId); setValues(detail.data.dosageOverrides.map(dosageRow)); setValidation(""); setNotice(""); requestAnimationFrame(() => document.getElementById(editForm)?.scrollIntoView({ block: "nearest" })); }}>Sửa điều chỉnh cũ</ButtonBar> : null}
        <ButtonBar variant={role === "ADMIN" ? "danger" : "secondary"} disabled={busy} onClick={() => setRemoveTarget(detail.data.id)}>Xóa điều chỉnh</ButtonBar>
      </div>
      {removeTarget ? <div><p>Xóa điều chỉnh đã chọn?</p><div className={styles.recipeMenuActions}><ButtonBar holdToConfirm disabled={busy} onClick={() => remove.mutate(removeTarget)}>Xác nhận xóa</ButtonBar><ButtonBar disabled={busy} onClick={() => setRemoveTarget(null)}>Hủy</ButtonBar></div></div> : null}
    </div> : null}
    </div>
    </div>
    {role === "OWNER" ? <form id={editForm} className={styles.recipeMenuEditor} onSubmit={submit}>
      <h3>{editId ? "Sửa điều chỉnh" : "Tạo điều chỉnh"}</h3>
      {!editId ? <div className={styles.recipeMenuToolbar}>
        <label className={styles.formField}><span>Tìm công thức nguồn</span><input placeholder="Tìm theo tên món" maxLength={200} value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); setQ(search); setGlobalPage(0); } }} /></label>
        <ButtonBar disabled={busy} onClick={() => { setQ(search); setGlobalPage(0); }}>Tìm kiếm</ButtonBar>
      </div> : null}
      {global.isError ? <div role="alert"><p>{getRecipeApiErrorMessage(global.error)}</p><ButtonBar onClick={() => void global.refetch()}>Thử lại</ButtonBar></div> : null}
      <label className={styles.formField}><span>Công thức nguồn *</span><select required value={globalId} disabled={busy || Boolean(editId)} onChange={(event) => setGlobalId(event.target.value)}>
        <option value="">Chọn công thức</option>
        {editId && globalId && !global.data?.items.some((item) => item.id === globalId) ? <option value={globalId}>{detail.data?.globalRecipeName ?? "Nguồn của điều chỉnh đang sửa"}</option> : null}
        {global.data?.items.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select></label>
      {!editId && global.data && (globalPage > 0 || global.data.hasNext) ? <nav className={styles.recipeMenuPagination} aria-label="Công thức nguồn"><ButtonBar disabled={!globalPage} onClick={() => setGlobalPage(globalPage - 1)}>Trang trước</ButtonBar><span>Trang {globalPage + 1}</span><ButtonBar disabled={!global.data.hasNext} onClick={() => setGlobalPage(globalPage + 1)}>Trang sau</ButtonBar></nav> : null}
      <fieldset className={styles.legacyDosageFields} disabled={busy}>
        <legend>Định lượng tùy chỉnh</legend>
        <p className={styles.recipeMenuMeta}>Dùng mã thông số của công thức nguồn. Có thể để trống nếu không cần đổi định lượng.</p>
        {(values.length ? values : [["", ""]]).map(([key, value], index) => {
          const update = (next: [string, string]) => setValues((rows) => rows.length ? rows.map((item, i) => i === index ? next : item) : [next]);
          return <div key={index} className={styles.legacyDosageRow}>
            <label className={styles.formField}><span>Thông số {index + 1}</span><input placeholder="Ví dụ: water" value={key} onChange={(event) => update([event.target.value, value])} /></label>
            <label className={styles.formField}><span>Giá trị</span><input inputMode="decimal" placeholder="Ví dụ: 40" value={value} onChange={(event) => update([key, event.target.value])} /></label>
            <ButtonBar aria-label={"Bỏ thông số " + (index + 1)} disabled={values.length <= 1 && !key && !value} onClick={() => setValues((rows) => rows.filter((_, i) => i !== index))}>Bỏ dòng</ButtonBar>
          </div>;
        })}
        <ButtonBar onClick={() => setValues((rows) => rows.length ? [...rows, ["", ""]] : [["", ""], ["", ""]])}>Thêm thông số</ButtonBar>
      </fieldset>
      {validation ? <p className={styles.recipeMenuError} role="alert">{validation}</p> : null}
      {save.isError ? <p className={styles.recipeMenuError} role="alert">{getRecipeApiErrorMessage(save.error, "mutation")}</p> : null}
      <div className={styles.recipeMenuActions + " " + styles.legacySaveActions}>
        {editId ? <ButtonBar disabled={busy} onClick={() => { setEditId(""); setGlobalId(""); setValues([]); setValidation(""); save.reset(); }}>Hủy sửa</ButtonBar> : null}
        <ButtonBar type="submit" variant="primary" disabled={busy || !globalId}>{save.isPending ? "Đang lưu…" : "Lưu điều chỉnh"}</ButtonBar>
      </div>
    </form> : null}
    {remove.isError ? <p className={styles.recipeMenuError} role="alert">{getRecipeApiErrorMessage(remove.error, "mutation")}</p> : null}
  </section>;
}
