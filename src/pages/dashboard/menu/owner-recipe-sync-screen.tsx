import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/router";
import { useState } from "react";
import { machinesApi } from "@/apis/machines.api";
import { recipesApi } from "@/apis/recipes.api";
import { ButtonBar } from "@/components/button/button-bar";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import { getApiErrorMessage } from "@/lib/api-errors";
import { authScopedQuerySubject, getAuthenticatedSubjectId } from "@/lib/query-subject";
import { PATH_CUSTOMER } from "@/routes/path";
import type { RecipeSyncStatus } from "@/schema/recipe-menus.schema";
import styles from "@/components/features/repair-workflow/repair-workflow.module.css";
import pageStyles from "../customer-shell.module.css";

const syncStateLabels: Record<string, string> = {
  PENDING: "Đang chờ máy nhận lệnh",
  SENT: "Đã gửi đến máy",
  APPLIED: "Máy đã áp dụng",
  FAILED: "Đồng bộ thất bại",
  EXPIRED: "Lệnh đã hết hạn",
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function recipeApiError(error: unknown) {
  if (axios.isAxiosError(error)) {
    const body: unknown = error.response?.data;
    if (typeof body === "string" && body.trim()) return body;
    if (body && typeof body === "object") {
      const details = body as Record<string, unknown>;
      for (const key of ["message", "detail", "error"]) {
        if (typeof details[key] === "string" && details[key]) return details[key];
      }
    }
  }
  return getApiErrorMessage(error, "mutation");
}

function OwnerMenuTabs() {
  const router = useRouter();
  return (
    <nav className={styles.recipeMenuTabs} aria-label="Khu vực công thức">
      <button type="button" onClick={() => void router.push(PATH_CUSTOMER.MENU)}>Công thức dùng chung</button>
      <button type="button" onClick={() => void router.push(PATH_CUSTOMER.MENU_ADJUSTMENTS)}>Điều chỉnh của tôi</button>
      <button type="button" aria-pressed="true" className={styles.recipeMenuTabActive}>Đồng bộ với máy</button>
    </nav>
  );
}

function isNotFound(error: unknown) {
  return axios.isAxiosError(error) && error.response?.status === 404;
}

function StatusDetails({ status }: { status: RecipeSyncStatus }) {
  return (
    <dl className={styles.recipeMenuStatus}>
      <div><dt>Trạng thái</dt><dd>{syncStateLabels[status.state] ?? status.state}</dd></div>
      <div><dt>Phiên bản cần áp dụng</dt><dd>{status.targetVersion}</dd></div>
      <div><dt>Phiên bản đã áp dụng</dt><dd>{status.appliedVersion ?? "Chưa có xác nhận từ máy"}</dd></div>
      <div><dt>Yêu cầu lúc</dt><dd>{formatDate(status.requestedAt)}</dd></div>
      {status.appliedAt ? <div><dt>Máy xác nhận lúc</dt><dd>{formatDate(status.appliedAt)}</dd></div> : null}
      {status.lastError ? <div><dt>Thông tin lỗi</dt><dd>{status.lastError}</dd></div> : null}
    </dl>
  );
}

export function OwnerRecipeSyncScreen() {
  const queryClient = useQueryClient();
  const subject = authScopedQuerySubject("OWNER");
  const ownerSubjectId = getAuthenticatedSubjectId();
  const [selectedMachineId, setSelectedMachineId] = useState("");

  const machines = useQuery({
    queryKey: ["dolores", "owner", "recipe-sync-machines", subject],
    queryFn: ({ signal }) => machinesApi.list(signal),
    retry: false,
  });
  const ownerMachines = ownerSubjectId
    ? machines.data?.filter((machine) => machine.ownerId?.toLowerCase() === ownerSubjectId.toLowerCase()) ?? []
    : [];
  const machine = ownerMachines.find((item) => item.id === selectedMachineId) ?? ownerMachines[0];
  const machineId = machine?.id ?? "";

  const syncStatus = useQuery({
    queryKey: ["dolores", "recipe-sync", subject, machineId],
    queryFn: ({ signal }) => recipesApi.getSyncStatus(machineId, signal),
    enabled: Boolean(machineId),
    retry: false,
  });
  const syncHistory = useQuery({
    queryKey: ["dolores", "recipe-sync-history", subject, machineId],
    queryFn: ({ signal }) => recipesApi.getSyncHistory(machineId, 0, 50, signal),
    enabled: Boolean(machineId),
    retry: false,
  });
  const requestSync = useMutation({
    mutationFn: (targetMachineId: string) => recipesApi.requestSync([targetMachineId]),
    onSuccess: async (_result, targetMachineId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dolores", "recipe-sync", subject, targetMachineId] }),
        queryClient.invalidateQueries({ queryKey: ["dolores", "recipe-sync-history", subject, targetMachineId] }),
      ]);
    },
  });

  const refresh = () => {
    void Promise.all([syncStatus.refetch(), syncHistory.refetch()]);
  };

  return (
    <section className={pageStyles.pageContent} aria-labelledby="owner-recipe-sync-title">
      <BackButtonHeading
        back={{ label: "Công thức pha chế", fallbackHref: PATH_CUSTOMER.MENU }}
        title="Đồng bộ công thức với máy"
        titleId="owner-recipe-sync-title"
        description="Gửi công thức hiện hành và định lượng riêng đến máy, rồi theo dõi phản hồi của thiết bị."
        className={pageStyles.pageHeading}
      />
      <OwnerMenuTabs />

      <section className={styles.recipeMenuPanel} aria-labelledby="owner-recipe-sync-panel-title">
        <div className={styles.panelHeading}>
          <div>
            <h2 id="owner-recipe-sync-panel-title">Trạng thái thiết bị</h2>
            <p>Yêu cầu đồng bộ tạo một lệnh cho máy. Trạng thái chỉ chuyển sang “Máy đã áp dụng” sau khi thiết bị nhận lệnh và gửi xác nhận.</p>
          </div>
          <ButtonBar type="button" disabled={!machineId || syncStatus.isFetching || syncHistory.isFetching} onClick={refresh}>
            {syncStatus.isFetching || syncHistory.isFetching ? "Đang tải…" : "Làm mới"}
          </ButtonBar>
        </div>

        {machines.isPending ? <p className={styles.notice} role="status">Đang tải danh sách máy…</p> : null}
        {machines.isError ? (
          <div className={styles.recipeMenuError} role="alert">
            <p>{getApiErrorMessage(machines.error)}</p>
            <ButtonBar type="button" onClick={() => void machines.refetch()}>Thử lại</ButtonBar>
          </div>
        ) : null}
        {!ownerSubjectId && machines.isSuccess ? <p className={styles.recipeMenuError} role="alert">Không xác định được Owner đăng nhập để lọc đúng máy. Hãy đăng nhập lại rồi thử tiếp.</p> : null}
        {ownerSubjectId && machines.isSuccess && ownerMachines.length === 0 ? (
          <p className={styles.recipeMenuEmpty} role="status">Chưa tìm thấy máy thuộc Owner đang đăng nhập. Danh sách cần có mã Owner khớp với tài khoản hiện tại.</p>
        ) : null}

        {ownerMachines.length ? (
          <>
            <div className={styles.recipeMenuToolbar}>
              <label className={styles.formField} htmlFor="owner-recipe-sync-machine">
                <span>Máy pha</span>
                <select
                  id="owner-recipe-sync-machine"
                  value={machineId}
                  onChange={(event) => {
                    setSelectedMachineId(event.target.value);
                    requestSync.reset();
                  }}
                >
                  {ownerMachines.map((item) => (
                    <option key={item.id} value={item.id}>{item.serialNumber || item.id} · {item.status || "Trạng thái chưa rõ"}</option>
                  ))}
                </select>
              </label>
              <div className={styles.recipeMenuActions}>
                <ButtonBar
                  className={styles.recipeMenuPrimary}
                  type="button"
                  disabled={!machineId || requestSync.isPending}
                  onClick={() => requestSync.mutate(machineId)}
                >
                  {requestSync.isPending ? "Đang gửi…" : "Gửi yêu cầu đồng bộ"}
                </ButtonBar>
              </div>
            </div>

            {requestSync.isError ? <p className={styles.recipeMenuError} role="alert">Không gửi được yêu cầu: {recipeApiError(requestSync.error)}</p> : null}
            {requestSync.isSuccess ? (
              <p className={styles.recipeMenuSuccess} role="status">
                Dolores đã ghi nhận yêu cầu. Máy cần kết nối, nhận lệnh và gửi xác nhận để hoàn tất đồng bộ.
              </p>
            ) : null}

            <section className={styles.recipeMenuDetail} aria-labelledby="owner-recipe-sync-current-title">
              <div className={styles.panelHeading}>
                <div>
                  <h3 id="owner-recipe-sync-current-title">Lần đồng bộ gần nhất</h3>
                  <p>{machine.serialNumber || machine.id}</p>
                </div>
              </div>
              {syncStatus.isPending ? <p className={styles.notice} role="status">Đang tải trạng thái…</p> : null}
              {syncStatus.isError && isNotFound(syncStatus.error) ? (
                <p className={styles.recipeMenuEmpty} role="status">Máy chưa có lệnh đồng bộ trước đây.</p>
              ) : null}
              {syncStatus.isError && !isNotFound(syncStatus.error) ? (
                <div className={styles.recipeMenuError} role="alert">
                  <p>{getApiErrorMessage(syncStatus.error)}</p>
                  <ButtonBar type="button" onClick={() => void syncStatus.refetch()}>Thử lại</ButtonBar>
                </div>
              ) : null}
              {syncStatus.data ? <StatusDetails status={syncStatus.data} /> : null}
            </section>

            <section className={styles.recipeMenuHistory} aria-labelledby="owner-recipe-sync-history-title">
              <h3 id="owner-recipe-sync-history-title">Lịch sử đồng bộ</h3>
              {syncHistory.isPending ? <p className={styles.notice} role="status">Đang tải lịch sử…</p> : null}
              {syncHistory.isError ? (
                <div className={styles.recipeMenuError} role="alert">
                  <p>{getApiErrorMessage(syncHistory.error)}</p>
                  <ButtonBar type="button" onClick={() => void syncHistory.refetch()}>Thử lại</ButtonBar>
                </div>
              ) : null}
              {syncHistory.data?.length ? (
                <ul>
                  {syncHistory.data.map((item, index) => (
                    <li key={item.commandId ?? `${item.machineId}-${item.requestedAt}-${index}`}>
                      <div><strong>{syncStateLabels[item.state] ?? item.state}</strong><span>Phiên bản {item.targetVersion}</span></div>
                      <time>{formatDate(item.requestedAt)}</time>
                      {item.lastError ? <p>{item.lastError}</p> : null}
                    </li>
                  ))}
                </ul>
              ) : syncHistory.isSuccess ? <p className={styles.recipeMenuEmpty} role="status">Chưa có lịch sử đồng bộ cho máy này.</p> : null}
            </section>
          </>
        ) : null}
      </section>
    </section>
  );
}
