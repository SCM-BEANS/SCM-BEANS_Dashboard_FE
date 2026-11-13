import axios from "axios";
import { useRouter } from "next/router";
import { useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { machinesApi } from "@/apis/machines.api";
import { recipesApi } from "@/apis/recipes.api";
import { PageActions } from "@/components/action-bar/page-actions";
import { ButtonBar } from "@/components/button/button-bar";
import { getRecipeApiErrorMessage } from "@/lib/api-errors";
import { authScopedQuerySubject } from "@/lib/query-subject";
import { isRecipeSyncApplied, type RecipeSyncStatus } from "@/schema/recipes.schema";
import { MachineIdSchema } from "@/schema/machines.schema";
import styles from "../repair-workflow/repair-workflow.module.css";

const labels: Record<RecipeSyncStatus["state"], string> = {
  PENDING: "Đang chờ máy nhận lệnh", DELIVERED: "Máy đã nhận, chờ áp dụng",
  APPLIED: "Máy đã áp dụng", OFFLINE: "Máy đang ngoại tuyến", EXPIRED: "Lệnh đã hết hạn", FAILED: "Đồng bộ thất bại",
};
function stateLabel(status: RecipeSyncStatus) {
  return status.state === "APPLIED" && !isRecipeSyncApplied(status) ? "Cần kiểm tra xác nhận phiên bản từ máy" : labels[status.state];
}
function stateTone(status: RecipeSyncStatus) {
  return isRecipeSyncApplied(status) ? "success" : ["FAILED", "EXPIRED"].includes(status.state) ? "danger" : undefined;
}

function formatTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Thời gian chưa xác định" : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
const isStatus = (error: unknown, status: number) => axios.isAxiosError(error) && error.response?.status === status;

function menuError(error: unknown) {
  if (isStatus(error, 404)) return "Không tìm thấy thông tin thiết bị hoặc bạn không có quyền thao tác trên máy này.";
  if (isStatus(error, 405) || isStatus(error, 501)) return "Dịch vụ chưa hỗ trợ cấu hình menu của máy. Vui lòng liên hệ quản trị hệ thống.";
  const data = axios.isAxiosError(error) ? error.response?.data : undefined;
  const message = typeof data === "object" && data ? String(data.code ?? data.error ?? "") + " " + String(data.message ?? "") : "";
  if (/CANNOT_ASSIGN_EMPTY_MENU|Cannot assign empty menu/i.test(message)) return "Menu chưa có món. Hãy thêm món trước khi gán cho máy.";
  if (/MACHINE_NOT_ASSIGNED_TO_OWNER|Machine has no associated Owner/i.test(message)) return "Máy chưa được bàn giao cho chủ sở hữu nên chưa thể gán menu riêng.";
  if (/MENU_NOT_OWNED_BY_MACHINE_OWNER|Menu does not belong/i.test(message)) return "Menu đã chọn không thuộc chủ sở hữu của máy này.";
  return getRecipeApiErrorMessage(error, "mutation");
}

export function MachineActiveMenuPanel({ machineId, subject, onChanged, onRetrySync, syncing = false, onBusyChange }: { machineId: string; subject: string; onChanged?: () => Promise<unknown>; onRetrySync?: () => void; syncing?: boolean; onBusyChange?: (busy: boolean) => void }) {
  const client = useQueryClient();
  const [selectedMenu, setSelectedMenu] = useState("");
  const [busy, setBusy] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [needsSync, setNeedsSync] = useState(false);
  const locked = useRef(false);
  const current = useQuery({ queryKey: ["dolores", "machine-active-menu", subject, machineId], queryFn: ({ signal }) => recipesApi.getActiveMenu(machineId, signal), retry: false });
  const menus = useQuery({ queryKey: ["dolores", "machine-available-menus", subject, machineId], queryFn: ({ signal }) => recipesApi.listAvailableMenus(machineId, signal), enabled: current.isSuccess && !current.isError, retry: false });
  const selection = menus.data?.find((menu) => menu.id === selectedMenu);
  const blocked = busy || syncing || uncertain || !current.isSuccess || current.isError || !menus.isSuccess || menus.isError;
  const refresh = async () => {
    const result = await current.refetch();
    if (result.isSuccess) { setUncertain(false); await menus.refetch(); }
    return result.isSuccess;
  };
  const change = async (clear: boolean) => {
    if (locked.current || blocked || !clear && (!selection || "recipeCount" in selection && selection.recipeCount === 0)) return;
    if (clear && !window.confirm("Bỏ gán menu riêng và đưa máy về menu mặc định?")) return;
    locked.current = true; setBusy(true); onBusyChange?.(true); setError(""); setNotice(""); setNeedsSync(false);
    try {
      if (clear) {
        await recipesApi.clearActiveMenu(machineId);
        setNotice("Đã bỏ gán menu riêng. Kiểm tra trạng thái đồng bộ để biết máy đã áp dụng hay chưa.");
      } else {
        const result = await recipesApi.assignActiveMenu(machineId, selectedMenu);
        setNeedsSync(!result.syncRequested);
        setNotice(result.syncRequested ? "Đã lưu menu và tiếp nhận lệnh đồng bộ. Đang chờ máy xác nhận áp dụng." : onRetrySync ? "Đã lưu menu, nhưng chưa phát được lệnh tới máy. Hãy yêu cầu đồng bộ lại." : "Đã lưu menu, nhưng chưa phát được lệnh tới máy. Liên hệ Admin hoặc chủ máy để yêu cầu đồng bộ lại.");
      }
      setSelectedMenu("");
    } catch (cause) {
      setError(menuError(cause));
      setUncertain(true);
    } finally {
      const reconciled = await refresh();
      if (!reconciled) setUncertain(true);
      await Promise.all([
        client.invalidateQueries({ queryKey: ["dolores", "recipe-sync", subject, machineId] }),
        client.invalidateQueries({ queryKey: ["dolores", "recipe-sync-history", subject, machineId] }),
        client.invalidateQueries({ queryKey: ["dolores", "machines"] }),
        client.invalidateQueries({ queryKey: ["dolores", "recipe-sync-machines", subject] }),
        client.invalidateQueries({ queryKey: ["dolores", "recipe-sync-machine", subject, machineId] }),
        onChanged?.(),
      ]);
      locked.current = false; setBusy(false); onBusyChange?.(false);
    }
  };
  return <section className={styles.recipeMenuDetail} aria-label="Menu đang gán cho máy">
    <div className={styles.panelHeading}><h3>Menu của máy</h3><ButtonBar disabled={busy || current.isFetching} onClick={() => void refresh()}>Kiểm tra menu</ButtonBar></div>
    {current.isPending ? <p role="status">Đang tải menu của máy…</p> : null}
    {current.isError ? <p className={styles.recipeMenuError} role="alert">{menuError(current.error)}</p> : null}
    {current.isSuccess && !current.isError ? <>
      <dl className={styles.recipeMenuStatus}><div><dt>Menu đang gán</dt><dd>{current.data.activeMenuId ? current.data.menuName || "Menu riêng" : "Menu tiêu chuẩn hệ thống (Mặc định)"}</dd></div><div><dt>Phạm vi</dt><dd>{current.data.activeMenuId ? "Menu riêng của chủ máy" : "Công thức mặc định / dùng chung"}</dd></div></dl>
      {menus.isPending ? <p role="status">Đang tải menu khả dụng…</p> : null}
      {menus.isError ? <p className={styles.recipeMenuError} role="alert">{menuError(menus.error)}</p> : null}
      {menus.isSuccess && !menus.isError ? <>
        {menus.data.length ? <label className={styles.formField}><span>Chọn menu cho máy</span><select aria-label="Chọn menu cho máy" value={selectedMenu} disabled={busy || uncertain} onChange={(event) => setSelectedMenu(event.target.value)}><option value="">Chọn menu</option>{menus.data.map((menu) => <option key={menu.id} value={menu.id} disabled={"recipeCount" in menu && menu.recipeCount === 0}>{menu.name}{"recipeCount" in menu ? ` · ${menu.recipeCount} món` : ""}</option>)}</select></label> : <p>Chưa có menu riêng khả dụng cho chủ máy.</p>}
        <div className={styles.recipeMenuToolbar}><ButtonBar variant="primary" disabled={blocked || !selection || selectedMenu === current.data.activeMenuId || Boolean(selection && "recipeCount" in selection && selection.recipeCount === 0)} onClick={() => void change(false)}>{busy ? "Đang xử lý…" : "Gán menu & đồng bộ"}</ButtonBar><ButtonBar disabled={blocked || !current.data.activeMenuId} onClick={() => void change(true)}>Dùng menu mặc định</ButtonBar></div>
      </> : null}
    </> : null}
    {notice ? <p className={styles.notice} role="status">{notice}</p> : null}
    {needsSync && onRetrySync ? <ButtonBar disabled={busy || syncing || uncertain} onClick={onRetrySync}>Thử đồng bộ lại</ButtonBar> : null}
    {error ? <p className={styles.recipeMenuError} role="alert">{error}</p> : null}
    {uncertain ? <p role="status">Chưa xác minh được kết quả. Bấm Kiểm tra menu trước khi thao tác tiếp.</p> : null}
  </section>;
}

export function RecipeSyncPanel({ role }: { role: "OWNER" | "ADMIN" }) {
  const router = useRouter();
  const client = useQueryClient();
  const subject = authScopedQuerySubject(role);
  const [machinePage, setMachinePage] = useState(0);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const selectedMachine = typeof router.query.syncMachineId === "string" ? router.query.syncMachineId : "";
  const setSelectedMachine = (id: string) => { const query = { ...router.query }; if (id) query.syncMachineId = id; else delete query.syncMachineId; void router.push({ pathname: router.pathname, query }, undefined, { shallow: true }); };
  const [historyPage, setHistoryPage] = useState(0);
  const [menuBusy, setMenuBusy] = useState(false);
  const machines = useQuery({
    queryKey: ["dolores", "recipe-sync-machines", subject, machinePage, q],
    queryFn: ({ signal }) => machinesApi.listRecipeSyncMachines(machinePage, 20, q, signal), retry: false,
  });
  // /machines already enforces the caller's scope. Do not infer backend OwnerContext from an unverified JWT sub.
  const selectedDetail = useQuery({ queryKey: ["dolores", "recipe-sync-machine", subject, selectedMachine], queryFn: ({ signal }) => machinesApi.getById(selectedMachine, signal), enabled: MachineIdSchema.safeParse(selectedMachine).success && machines.isSuccess && !machines.data.items.some((item) => item.id === selectedMachine), retry: false });
  const machine = selectedMachine ? machines.data?.items.find((item) => item.id === selectedMachine) ?? (!selectedDetail.isError ? selectedDetail.data : undefined) : machines.data?.items[0];
  const machineId = machine?.id ?? "";
  const canRead = Boolean(machineId) && (role === "ADMIN" || Boolean(machine?.ownerId));
  const current = useQuery({
    queryKey: ["dolores", "recipe-sync", subject, machineId],
    queryFn: ({ signal }) => recipesApi.getSyncStatus(machineId, signal), enabled: canRead, retry: false,
    refetchInterval: (query) => ["PENDING", "DELIVERED"].includes(query.state.data?.state ?? "") && !query.state.error ? 5000 : false,
  });
  const history = useQuery({
    queryKey: ["dolores", "recipe-sync-history", subject, machineId, historyPage],
    queryFn: ({ signal }) => recipesApi.getSyncHistoryPage(machineId, historyPage, 20, signal), enabled: canRead, retry: false,
  });
  const invalidate = (targetId: string) => Promise.all([
    client.invalidateQueries({ queryKey: ["dolores", "recipe-sync", subject, targetId] }),
    client.invalidateQueries({ queryKey: ["dolores", "recipe-sync-history", subject, targetId] }),
  ]);
  const sync = useMutation({ mutationFn: (targetId: string) => recipesApi.requestSync([targetId]), onSuccess: (_result, targetId) => invalidate(targetId), retry: false });
  const replay = useMutation({ mutationFn: (input: { machineId: string; commandId: string }) => recipesApi.replaySyncCommand(input.machineId, input.commandId), onSuccess: (_result, input) => invalidate(input.machineId), retry: false });
  const busy = menuBusy || sync.isPending || replay.isPending;
  const submitSearch = (event: FormEvent) => { event.preventDefault(); if (busy) return; setQ(search); setMachinePage(0); setSelectedMachine(""); setHistoryPage(0); sync.reset(); replay.reset(); };
  const pageControls = (page: number, hasNext: boolean, change: (page: number) => void, label: string) => role === "ADMIN" && page === 0 && !hasNext ? null : <nav className={styles.recipeMenuPagination} aria-label={label}>
    <ButtonBar disabled={busy || page === 0} onClick={() => change(page - 1)}>Trang trước</ButtonBar><span>Trang {page + 1}</span><ButtonBar disabled={busy || !hasNext} onClick={() => change(page + 1)}>Trang sau</ButtonBar>
  </nav>;
  const requestSync = () => { replay.reset(); sync.mutate(machineId); };
  return <section className={styles.recipeMenuPanel} data-recipe-sync>
    <div className={styles.adminSyncToolbar}>
    <div className={styles.panelHeading}><div><h2>Đồng bộ công thức với máy</h2></div>
      <ButtonBar disabled={!canRead || current.isFetching || history.isFetching} onClick={() => { void current.refetch(); void history.refetch(); }}>Làm mới</ButtonBar>
      {role === "ADMIN" && machine && canRead && !isStatus(current.error, 403) ? <ButtonBar variant="primary" disabled={busy} onClick={requestSync}>{sync.isPending ? "Đang gửi…" : "Yêu cầu đồng bộ lại"}</ButtonBar> : null}
    </div>
    <form className={styles.recipeMenuToolbar} onSubmit={submitSearch}>
      <label className={styles.formField}><span>{role === "ADMIN" ? "Tìm theo số sê-ri" : "Tìm máy theo serial"}</span><input value={search} onChange={(event) => setSearch(event.target.value)} /></label><ButtonBar type="submit" disabled={busy}>Tìm kiếm</ButtonBar>
    </form>
    {machines.isPending ? <p role="status">Đang tải máy…</p> : null}
    {machines.isError ? <div role="alert"><p>{getRecipeApiErrorMessage(machines.error)}</p><ButtonBar onClick={() => void machines.refetch()}>Thử lại</ButtonBar></div> : null}
    {selectedMachine && selectedDetail.isError ? <p role="alert">{menuError(selectedDetail.error)}</p> : null}
    {machines.data ? <>
      {machines.data.items.length ? <label className={styles.formField}><span>Máy cần theo dõi</span><select value={machineId} disabled={busy} onChange={(event) => { setSelectedMachine(event.target.value); setHistoryPage(0); sync.reset(); replay.reset(); }}>
        {machine && !machines.data.items.some((item) => item.id === machineId) ? <option value={machineId}>{machine.serialNumber || machineId}</option> : null}
        {machines.data.items.map((item) => <option key={item.id} value={item.id}>{item.serialNumber || item.id}</option>)}
      </select></label> : <p className={styles.recipeMenuEmpty}>Chưa có máy phù hợp trong phạm vi tài khoản.</p>}
      {pageControls(machinePage, machines.data.hasNext, (page) => { setMachinePage(page); setSelectedMachine(""); setHistoryPage(0); sync.reset(); replay.reset(); }, "Danh sách máy đồng bộ")}
    </> : null}
    </div>
    {machine && !machine.ownerId && role !== "ADMIN" ? <p className={styles.notice}>Máy chưa được gắn Owner trực tiếp. Hãy liên hệ vận hành để kiểm tra quyền đồng bộ; hợp đồng đang hoạt động chưa đủ để cấp quyền API này.</p> : null}
    <PageActions actions={role !== "ADMIN" && machine && canRead && !isStatus(current.error, 403) ? [{ id: "recipe-sync", label: "Yêu cầu đồng bộ lại", variant: "primary", priority: 50, disabled: busy, disabledReason: "Đang xử lý yêu cầu.", pending: sync.isPending, pendingLabel: "Đang gửi…", onClick: requestSync }] : []} />
    {(sync.isSuccess && sync.variables === machineId) || (replay.isSuccess && replay.variables.machineId === machineId) ? <p className={styles.recipeMenuSuccess} role="status">Đã tiếp nhận yêu cầu. Máy cần kết nối và xác nhận áp dụng; chưa thể coi là đồng bộ xong.</p> : null}
    {sync.isError || replay.isError ? <p className={styles.recipeMenuError} role="alert">{getRecipeApiErrorMessage(sync.error ?? replay.error, "mutation")}</p> : null}
    <div className={styles.adminRecipeColumns}>
    {machine ? <MachineActiveMenuPanel key={`${subject}:${machineId}`} machineId={machineId} subject={subject} syncing={sync.isPending || replay.isPending} onBusyChange={setMenuBusy} onRetrySync={canRead && !isStatus(current.error, 403) && !isStatus(current.error, 404) ? () => sync.mutate(machineId) : undefined} /> : null}
    {canRead ?
      <section className={styles.recipeMenuDetail}><h3>Lần đồng bộ gần nhất</h3>
        {current.isPending ? <p role="status">Đang tải trạng thái…</p> : null}
        {current.isError ? <div role={isStatus(current.error, 404) ? "status" : "alert"}><p>{isStatus(current.error, 404) ? "Chưa có trạng thái đồng bộ hoặc máy không còn khả dụng." : getRecipeApiErrorMessage(current.error)}</p>{!isStatus(current.error, 403) ? <ButtonBar onClick={() => void current.refetch()}>Kiểm tra lại</ButtonBar> : null}</div> : null}
        {current.data ? <>
          <dl className={styles.recipeMenuStatus}>
            <div><dt>Trạng thái</dt><dd><span className={styles.requestStatus} data-tone={stateTone(current.data)}>{stateLabel(current.data)}</span></dd></div>
            <div><dt>Phiên bản yêu cầu</dt><dd>{current.data.targetVersion}</dd></div>
            <div><dt>Phiên bản máy báo</dt><dd>{current.data.appliedVersion ?? "Chưa có xác nhận"}</dd></div>
            <div><dt>Yêu cầu lúc</dt><dd>{formatTime(current.data.requestedAt)}</dd></div>
            <div><dt>Máy xác nhận lúc</dt><dd>{formatTime(current.data.appliedAt)}</dd></div>
            <div><dt>Số lần thử lại</dt><dd>{current.data.retryCount}</dd></div>
          </dl>
          {current.data.lastError ? <p className={styles.recipeMenuError}>{current.data.lastError}</p> : null}
          {role === "ADMIN" && current.data.commandId && ["FAILED", "EXPIRED"].includes(current.data.state) ? <ButtonBar disabled={busy} onClick={() => { sync.reset(); replay.mutate({ machineId: current.data.machineId, commandId: current.data.commandId! }); }}>Phát lại lệnh lỗi / hết hạn</ButtonBar> : null}
        </> : null}
      </section> : null}
    </div>
    {canRead ? <section className={styles.recipeMenuHistory}><h3>Lịch sử đồng bộ</h3>
        {history.isPending ? <p role="status">Đang tải lịch sử…</p> : null}
        {history.isError ? <div role="alert"><p>{getRecipeApiErrorMessage(history.error)}</p>{!isStatus(history.error, 403) ? <ButtonBar onClick={() => void history.refetch()}>Thử lại</ButtonBar> : null}</div> : null}
        {history.data ? <>
          {history.data.items.length ? <div className={styles.recipeMenuTableScroll}><table className={styles.recipeMenuTable}>
            <thead><tr><th scope="col">Thời gian</th><th scope="col">Phiên bản yêu cầu</th><th scope="col">Phiên bản máy báo</th><th scope="col">Trạng thái</th></tr></thead>
            <tbody>{history.data.items.map((status, index) => <tr key={status.commandId ?? index}>
              <td>{formatTime(status.requestedAt)}</td><td>{status.targetVersion}</td><td>{status.appliedVersion ?? "—"}</td>
              <td><span className={styles.requestStatus} data-tone={stateTone(status)}>{stateLabel(status)}</span>
                {status.lastError ? <p className={styles.recipeMenuMeta}>{status.lastError}</p> : null}
                {role === "ADMIN" && status.commandId && ["FAILED", "EXPIRED"].includes(status.state) ? <ButtonBar disabled={busy} onClick={() => { sync.reset(); replay.mutate({ machineId: status.machineId, commandId: status.commandId! }); }}>Phát lại lệnh</ButtonBar> : null}
              </td>
            </tr>)}</tbody>
          </table></div> : null}
          {!history.data.items.length ? <p className={styles.recipeMenuEmpty}>Chưa có lịch sử đồng bộ.</p> : null}
          {pageControls(history.data.page, history.data.hasNext, setHistoryPage, "Lịch sử đồng bộ")}
        </> : null}
      </section> : null}
  </section>;
}
