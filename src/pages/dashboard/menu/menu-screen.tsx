import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { BackButtonHeading } from "@/components/navigation/back-button-heading";
import type { BackButtonDestination } from "@/components/navigation/back-button";
import { recipesApi } from "@/apis/recipes.api";
import { machinesApi } from "@/apis/machines.api";
import { GlobalRecipeIdSchema } from "@/schema/recipes.schema";
import { PATH_CUSTOMER } from "@/routes/path";
import { CUSTOMER_MESSAGES } from "@/text/customer/customer-messages";
import { QueryFeedback } from "../shared/customer-screen-common";
import styles from "../customer-shell.module.css";

const messages = CUSTOMER_MESSAGES.READ_SCREENS;

export function MenuScreen({ sectionPath, back }: { sectionPath: string; back?: BackButtonDestination | null }) {
  const candidate = sectionPath.startsWith("menu/") ? sectionPath.slice("menu/".length) : "";
  const recipeId = GlobalRecipeIdSchema.safeParse(candidate).success ? candidate : null;
  const isList = sectionPath === "menu";
  const globalList = useQuery({
    queryKey: ["owner-global-recipes"],
    queryFn: ({ signal }) => recipesApi.listGlobal(signal),
    enabled: isList,
  });
  const localList = useQuery({
    queryKey: ["owner-local-recipes"],
    queryFn: ({ signal }) => recipesApi.listLocal(signal),
    enabled: isList || Boolean(recipeId),
  });
  const globalDetail = useQuery({
    queryKey: ["owner-global-recipe", recipeId],
    queryFn: ({ signal }) => recipesApi.getGlobalById(recipeId!, signal),
    enabled: Boolean(recipeId),
  });

  return (
    <section className={styles.pageContent} aria-labelledby="customer-screen-title">
      <BackButtonHeading
        back={back ?? null}
        title={recipeId ? messages.RECIPE_DETAIL_TITLE : messages.MENU_TITLE}
        titleId="customer-screen-title"
        description={messages.MENU_DESCRIPTION}
        className={styles.pageHeading}
      />
      {recipeId ? (
        <>
          <QueryFeedback loading={globalDetail.isPending || localList.isPending} failed={globalDetail.isError || localList.isError} empty={!globalDetail.data} emptyText={messages.NO_RECIPES} />
          {globalDetail.data ? (
            <div className={styles.dataPanel}>
              <h2>{globalDetail.data.name}</h2>
              <p>{messages.RECIPE_STEPS}</p>
              <ol className={styles.recipeSteps}>
                {globalDetail.data.steps.map((step, index) => <li key={index}>{step}</li>)}
              </ol>
              <h3>{messages.RECIPE_DOSAGE}</h3>
              <ul className={styles.recipeSteps}>
                {globalDetail.data.dosageBounds.map((bound, index) => <li key={index}>{bound}</li>)}
              </ul>
              <h3>{messages.LOCAL_CONFIGURATION}</h3>
              {localList.data?.some((recipe) => recipe.globalRecipeId === recipeId)
                ? <p>{messages.LOCAL_RECIPE_CONFIGURED}</p>
                : <p>{messages.NO_LOCAL_CONFIGURATION}</p>}
            </div>
          ) : null}
        </>
      ) : (
        <>
          <Link className={styles.primaryButton} href={PATH_CUSTOMER.MENU_ADD_DISH}>
            {CUSTOMER_MESSAGES.WORKFLOWS.MENU_ADD_DISH_TITLE}
          </Link>
          <QueryFeedback loading={globalList.isPending || localList.isPending} failed={globalList.isError || localList.isError} empty={!globalList.data?.length} emptyText={messages.NO_RECIPES} />
          {globalList.data?.length ? (
            <div className={styles.recordList}>
              {globalList.data.map((recipe) => {
                const local = localList.data?.find((item) => item.globalRecipeId === recipe.id);
                return (
                  <article className={styles.recordCard} key={recipe.id}>
                    <div>
                      <h2>{recipe.name}</h2>
                      <p>{messages.RECIPE_STEPS_COUNT}: {recipe.steps.length}</p>
                    <p>{local ? messages.LOCAL_RECIPE_CONFIGURED : messages.GLOBAL_RECIPE_ONLY}</p>
                    </div>
                    <Link className={styles.secondaryLink} href={PATH_CUSTOMER.MENU_RECIPE(recipe.id)}>{messages.VIEW_DETAILS}</Link>
                  </article>
                );
              })}
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

const syncStateLabels: Record<string, string> = {
  PENDING: "Đang chờ thiết bị nhận lệnh",
  SENT: "Đã gửi lệnh",
  APPLIED: "Thiết bị đã áp dụng",
  FAILED: "Đồng bộ thất bại",
  EXPIRED: "Lệnh đã hết hạn",
};

export function OwnerMenuDeviceScreen({ sectionPath }: { sectionPath: "menu/sent" | "menu/applied" }) {
  const queryClient = useQueryClient();
  const [selectedMachineId, setSelectedMachineId] = useState("");
  const machines = useQuery({
    queryKey: ["owner-machines"],
    queryFn: ({ signal }) => machinesApi.list(signal),
  });
  const machineId = selectedMachineId || machines.data?.[0]?.id || "";
  const isSyncScreen = sectionPath === "menu/sent";
  const syncStatus = useQuery({
    queryKey: ["owner-recipe-sync-status", machineId],
    queryFn: ({ signal }) => recipesApi.getSyncStatus(machineId, signal),
    enabled: Boolean(machineId),
  });
  const syncHistory = useQuery({
    queryKey: ["owner-recipe-sync-history", machineId],
    queryFn: ({ signal }) => recipesApi.getSyncHistory(machineId, signal),
    enabled: Boolean(machineId && isSyncScreen),
  });
  const requestSync = useMutation({
    mutationFn: (targetMachineId: string) => recipesApi.requestSync([targetMachineId]),
    onSuccess: async (_result, targetMachineId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["owner-recipe-sync-status", targetMachineId] }),
        queryClient.invalidateQueries({ queryKey: ["owner-recipe-sync-history", targetMachineId] }),
      ]);
    },
  });
  const title = isSyncScreen ? "Gửi menu đến máy" : "Menu đang áp dụng trên máy";

  return (
    <section className={styles.pageContent} aria-labelledby="owner-menu-device-title">
      <BackButtonHeading
        back={{ label: "Menu của tôi", fallbackHref: PATH_CUSTOMER.MENU }}
        title={title}
        titleId="owner-menu-device-title"
        description={isSyncScreen
          ? "Chọn máy thuộc cửa hàng của bạn để yêu cầu đồng bộ menu. Trạng thái sẽ cập nhật khi thiết bị phản hồi."
          : "Xem trạng thái thiết bị đã xác nhận áp dụng phiên bản menu nào."}
        className={styles.pageHeading}
      />
      {machines.isPending ? <p className={styles.loadingNotice} role="status">Đang tải danh sách máy…</p> : null}
      {machines.isError ? <p className={styles.errorNotice} role="alert">Không tải được danh sách máy của bạn.</p> : null}
      {machines.isSuccess && machines.data.length === 0 ? <p className={styles.emptyNotice} role="status">Chưa có máy nào trong tài khoản.</p> : null}
      {machines.data?.length ? (
        <div className={styles.dataPanel}>
          <label className={styles.formField} htmlFor="owner-menu-machine">
            <span>Máy pha</span>
            <select
              id="owner-menu-machine"
              value={machineId}
              onChange={(event) => {
                requestSync.reset();
                setSelectedMachineId(event.target.value);
              }}
            >
              {machines.data.map((machine) => (
                <option key={machine.id} value={machine.id}>
                  {machine.serialNumber || machine.id} · {machine.status || "—"}
                </option>
              ))}
            </select>
          </label>

          {isSyncScreen ? (
            <>
              <section className={styles.dataPanel} aria-labelledby="owner-menu-sync-status">
                <h2 id="owner-menu-sync-status">Trạng thái đồng bộ</h2>
                {syncStatus.isPending ? <p className={styles.loadingNotice} role="status">Đang tải trạng thái…</p> : null}
                {syncStatus.isError ? <p className={styles.errorNotice} role="alert">Không tải được trạng thái đồng bộ.</p> : null}
                {syncStatus.data ? (
                  <dl className={styles.detailGrid}>
                    <DetailItem label="Trạng thái" value={syncStateLabels[syncStatus.data.state] ?? syncStatus.data.state} />
                    <DetailItem label="Phiên bản cần áp dụng" value={String(syncStatus.data.targetVersion)} />
                    <DetailItem label="Phiên bản đã áp dụng" value={syncStatus.data.appliedVersion == null ? "Chưa có phản hồi" : String(syncStatus.data.appliedVersion)} />
                    <DetailItem label="Gửi lúc" value={formatDate(syncStatus.data.requestedAt)} />
                    {syncStatus.data.lastError ? <DetailItem label="Lỗi gần nhất" value={syncStatus.data.lastError} /> : null}
                  </dl>
                ) : syncStatus.isSuccess ? <p className={styles.emptyNotice}>Chưa có lệnh đồng bộ cho máy này.</p> : null}
                {requestSync.isError ? <p className={styles.errorNotice} role="alert">Không gửi được lệnh đồng bộ. Kiểm tra kết nối máy và thử lại.</p> : null}
                {requestSync.isSuccess ? <p className={styles.successNotice} role="status">Đã gửi yêu cầu đồng bộ cho máy.</p> : null}
                <button
                  className={styles.primaryButton}
                  type="button"
                  disabled={requestSync.isPending || !machineId}
                  onClick={() => requestSync.mutate(machineId)}
                >
                  {requestSync.isPending ? "Đang gửi…" : "Yêu cầu đồng bộ menu"}
                </button>
              </section>
              <section className={styles.dataPanel} aria-labelledby="owner-menu-sync-history">
                <h2 id="owner-menu-sync-history">Lịch sử đồng bộ</h2>
                {syncHistory.isError ? <p className={styles.errorNotice} role="alert">Không tải được lịch sử đồng bộ.</p> : null}
                {syncHistory.data?.length ? (
                  <div className={styles.recordList}>
                    {syncHistory.data.map((item, index) => (
                      <article className={styles.recordCard} key={item.commandId ?? `${item.machineId}-${item.requestedAt}-${index}`}>
                        <div>
                          <h3>{syncStateLabels[item.state] ?? item.state}</h3>
                          <p>Phiên bản {item.targetVersion} · {formatDate(item.requestedAt)}</p>
                          {item.lastError ? <p>{item.lastError}</p> : null}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : syncHistory.isSuccess ? <p className={styles.emptyNotice}>Chưa có lịch sử đồng bộ.</p> : null}
              </section>
            </>
          ) : (
            <section className={styles.dataPanel} aria-labelledby="owner-effective-menu-title">
              <h2 id="owner-effective-menu-title">Trạng thái đã áp dụng</h2>
              {syncStatus.isPending ? <p className={styles.loadingNotice} role="status">Đang tải trạng thái thiết bị…</p> : null}
              {syncStatus.isError ? <p className={styles.errorNotice} role="alert">Không tải được trạng thái đồng bộ.</p> : null}
              {syncStatus.data ? (
                <dl className={styles.detailGrid}>
                  <DetailItem label="Trạng thái đồng bộ" value={syncStateLabels[syncStatus.data.state] ?? syncStatus.data.state} />
                  <DetailItem label="Phiên bản thiết bị đã xác nhận" value={syncStatus.data.appliedVersion == null ? "Chưa xác nhận" : String(syncStatus.data.appliedVersion)} />
                  <DetailItem label="Xác nhận lúc" value={formatDate(syncStatus.data.appliedAt)} />
                  <DetailItem label="Phiên bản mới nhất được gửi" value={String(syncStatus.data.targetVersion)} />
                </dl>
              ) : syncStatus.isSuccess ? <p className={styles.emptyNotice}>Máy chưa có trạng thái đồng bộ menu.</p> : null}
            </section>
          )}
        </div>
      ) : null}
    </section>
  );
}
