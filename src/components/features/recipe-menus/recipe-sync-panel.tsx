import axios from "axios";
import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { machinesApi } from "@/apis/machines.api";
import { recipesApi } from "@/apis/recipes.api";
import { ButtonBar } from "@/components/button/button-bar";
import { getRecipeApiErrorMessage } from "@/lib/api-errors";
import { authScopedQuerySubject } from "@/lib/query-subject";
import { isRecipeSyncApplied, type RecipeSyncStatus } from "@/schema/recipes.schema";
import styles from "../repair-workflow/repair-workflow.module.css";

const labels: Record<RecipeSyncStatus["state"], string> = {
  PENDING: "Đang chờ máy nhận lệnh", DELIVERED: "Máy đã nhận, chờ áp dụng",
  APPLIED: "Máy đã áp dụng", OFFLINE: "Máy đang ngoại tuyến", EXPIRED: "Lệnh đã hết hạn", FAILED: "Đồng bộ thất bại",
};
function stateLabel(status: RecipeSyncStatus) {
  return status.state === "APPLIED" && !isRecipeSyncApplied(status) ? "Cần kiểm tra xác nhận phiên bản từ máy" : labels[status.state];
}
function formatTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Thời gian chưa xác định" : new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
const isStatus = (error: unknown, status: number) => axios.isAxiosError(error) && error.response?.status === status;

export function RecipeSyncPanel({ role }: { role: "OWNER" | "ADMIN" }) {
  const client = useQueryClient();
  const subject = authScopedQuerySubject(role);
  const [machinePage, setMachinePage] = useState(0);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [selectedMachine, setSelectedMachine] = useState("");
  const [historyPage, setHistoryPage] = useState(0);
  const machines = useQuery({
    queryKey: ["dolores", "recipe-sync-machines", subject, machinePage, q],
    queryFn: ({ signal }) => machinesApi.listRecipeSyncMachines(machinePage, 20, q, signal), retry: false,
  });
  // /machines already enforces the caller's scope. Do not infer backend OwnerContext from an unverified JWT sub.
  const machine = machines.data?.items.find((item) => item.id === selectedMachine) ?? machines.data?.items[0];
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
  const busy = sync.isPending || replay.isPending;
  const submitSearch = (event: FormEvent) => { event.preventDefault(); if (busy) return; setQ(search); setMachinePage(0); setSelectedMachine(""); setHistoryPage(0); sync.reset(); replay.reset(); };
  const pageControls = (page: number, hasNext: boolean, change: (page: number) => void, label: string) => <nav className={styles.recipeMenuPagination} aria-label={label}>
    <ButtonBar disabled={busy || page === 0} onClick={() => change(page - 1)}>Trang trước</ButtonBar><span>Trang {page + 1}</span><ButtonBar disabled={busy || !hasNext} onClick={() => change(page + 1)}>Trang sau</ButtonBar>
  </nav>;
  return <section className={styles.recipeMenuPanel}>
    <div className={styles.panelHeading}><div><h2>Đồng bộ công thức với máy</h2><p>Lưu thư viện và máy áp dụng là hai bước khác nhau. Chỉ xác nhận đã áp dụng khi phiên bản và mã nội dung máy gửi về khớp yêu cầu.</p></div>
      <ButtonBar disabled={!canRead || current.isFetching || history.isFetching} onClick={() => { void current.refetch(); void history.refetch(); }}>Làm mới</ButtonBar></div>
    <form className={styles.recipeMenuToolbar} onSubmit={submitSearch}>
      <label className={styles.formField}><span>Tìm máy theo serial</span><input value={search} onChange={(event) => setSearch(event.target.value)} /></label><ButtonBar type="submit" disabled={busy}>Tìm kiếm</ButtonBar>
    </form>
    {machines.isPending ? <p role="status">Đang tải máy…</p> : null}
    {machines.isError ? <div role="alert"><p>{getRecipeApiErrorMessage(machines.error)}</p><ButtonBar onClick={() => void machines.refetch()}>Thử lại</ButtonBar></div> : null}
    {machines.data ? <>
      {machines.data.items.length ? <label className={styles.formField}><span>Máy cần theo dõi</span><select value={machineId} disabled={busy} onChange={(event) => { setSelectedMachine(event.target.value); setHistoryPage(0); sync.reset(); replay.reset(); }}>
        {machines.data.items.map((item) => <option key={item.id} value={item.id}>{item.serialNumber || item.id}</option>)}
      </select></label> : <p className={styles.recipeMenuEmpty}>Chưa có máy phù hợp trong phạm vi tài khoản.</p>}
      {pageControls(machinePage, machines.data.hasNext, (page) => { setMachinePage(page); setSelectedMachine(""); setHistoryPage(0); sync.reset(); replay.reset(); }, "Danh sách máy đồng bộ")}
    </> : null}
    {machine && !machine.ownerId ? <p className={styles.notice}>{role === "ADMIN" ? "Máy chưa có Owner trực tiếp. Hệ thống sẽ kiểm tra Owner hiệu lực khi Admin gửi yêu cầu đồng bộ." : "Máy chưa được gắn Owner trực tiếp. Hãy liên hệ vận hành để kiểm tra quyền đồng bộ; hợp đồng đang hoạt động chưa đủ để cấp quyền API này."}</p> : null}
    {machine ? <div className={styles.recipeMenuActions}>
      <ButtonBar className={styles.recipeMenuPrimary} disabled={busy || !canRead || (role === "OWNER" && !machine.ownerId) || isStatus(current.error, 403)} onClick={() => { replay.reset(); sync.mutate(machineId); }}>{sync.isPending ? "Đang gửi…" : "Yêu cầu đồng bộ lại"}</ButtonBar>
      <span className={styles.recipeMenuMeta}>Hệ thống tự gửi khi công thức thay đổi. Bạn có thể yêu cầu gửi lại nếu cần.</span>
    </div> : null}
    {(sync.isSuccess && sync.variables === machineId) || (replay.isSuccess && replay.variables.machineId === machineId) ? <p className={styles.recipeMenuSuccess} role="status">Đã tiếp nhận yêu cầu. Máy cần kết nối và xác nhận áp dụng; chưa thể coi là đồng bộ xong.</p> : null}
    {sync.isError || replay.isError ? <p className={styles.recipeMenuError} role="alert">{getRecipeApiErrorMessage(sync.error ?? replay.error, "mutation")}</p> : null}
    {canRead ? <>
      <section className={styles.recipeMenuDetail}><h3>Lần đồng bộ gần nhất</h3>
        {current.isPending ? <p role="status">Đang tải trạng thái…</p> : null}
        {current.isError ? <div role={isStatus(current.error, 404) ? "status" : "alert"}><p>{isStatus(current.error, 404) ? "Chưa có trạng thái đồng bộ hoặc máy không còn khả dụng." : getRecipeApiErrorMessage(current.error)}</p>{!isStatus(current.error, 403) ? <ButtonBar onClick={() => void current.refetch()}>Kiểm tra lại</ButtonBar> : null}</div> : null}
        {current.data ? <>
          <dl className={styles.recipeMenuStatus}>
            <div><dt>Trạng thái</dt><dd>{stateLabel(current.data)}</dd></div>
            <div><dt>Phiên bản yêu cầu</dt><dd>{current.data.targetVersion}</dd></div>
            <div><dt>Phiên bản máy báo</dt><dd>{current.data.appliedVersion ?? "Chưa có xác nhận"}</dd></div>
            <div><dt>Yêu cầu lúc</dt><dd>{formatTime(current.data.requestedAt)}</dd></div>
            <div><dt>Máy xác nhận lúc</dt><dd>{formatTime(current.data.appliedAt)}</dd></div>
            <div><dt>Số lần thử lại</dt><dd>{current.data.retryCount}</dd></div>
          </dl>
          {current.data.lastError ? <p className={styles.recipeMenuError}>{current.data.lastError}</p> : null}
          {role === "ADMIN" && current.data.commandId && ["FAILED", "EXPIRED"].includes(current.data.state) ? <ButtonBar disabled={busy} onClick={() => { sync.reset(); replay.mutate({ machineId: current.data.machineId, commandId: current.data.commandId! }); }}>Phát lại lệnh lỗi / hết hạn</ButtonBar> : null}
        </> : null}
      </section>
      <section className={styles.recipeMenuHistory}><h3>Lịch sử đồng bộ</h3>
        {history.isPending ? <p role="status">Đang tải lịch sử…</p> : null}
        {history.isError ? <div role="alert"><p>{getRecipeApiErrorMessage(history.error)}</p>{!isStatus(history.error, 403) ? <ButtonBar onClick={() => void history.refetch()}>Thử lại</ButtonBar> : null}</div> : null}
        {history.data ? <>
          <ul>{history.data.items.map((status, index) => <li key={status.commandId ?? status.machineId + "-" + index}>
            <div><strong>{stateLabel(status)}</strong><span>Phiên bản {status.targetVersion}</span></div><time>{formatTime(status.requestedAt)}</time>
            {status.lastError ? <p>{status.lastError}</p> : null}
            {role === "ADMIN" && status.commandId && ["FAILED", "EXPIRED"].includes(status.state) ? <ButtonBar disabled={busy} onClick={() => { sync.reset(); replay.mutate({ machineId: status.machineId, commandId: status.commandId! }); }}>Phát lại lệnh</ButtonBar> : null}
          </li>)}</ul>
          {!history.data.items.length ? <p className={styles.recipeMenuEmpty}>Chưa có lịch sử đồng bộ.</p> : null}
          {pageControls(history.data.page, history.data.hasNext, setHistoryPage, "Lịch sử đồng bộ")}
        </> : null}
      </section>
    </> : null}
  </section>;
}
