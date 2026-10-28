import { useQuery } from "@tanstack/react-query";
import { machineModelsApi } from "@/apis/machine-models.api";
import { ActionBar } from "@/components/action-bar/action-bar";
import { ButtonBar } from "@/components/button/button-bar";
import { getApiErrorMessage } from "@/lib/api-errors";
import { PATH_ADMIN } from "@/routes/path";
import { ADMIN_OPERATIONS_MESSAGES as T } from "@/text/admin/admin-operations-messages";
import { adminStyles as styles } from "../admin-shell";

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("vi-VN");
}

export function MachineModelDetail({ modelId }: { modelId: string }) {
  const machineModels = useQuery({
    queryKey: ["admin", "machine-models"],
    queryFn: ({ signal }) => machineModelsApi.list(signal),
    enabled: Boolean(modelId),
  });
  const machineModel = machineModels.data?.find((item) => item.id === modelId);

  if (!modelId || (machineModels.data && !machineModel)) {
    return <p className={styles.emptyText}>{T.COMMON.EMPTY}</p>;
  }
  if (machineModels.isPending) {
    return <section className={styles.panel} role="status">{T.COMMON.LOADING}</section>;
  }
  if (machineModels.isError) {
    return (
      <div className={`${styles.notice} ${styles.errorNotice}`} role="alert">
        <p>{getApiErrorMessage(machineModels.error)}</p>
        <button type="button" onClick={() => void machineModels.refetch()}>{T.COMMON.RETRY}</button>
      </div>
    );
  }
  if (!machineModel) return <p className={styles.emptyText}>{T.COMMON.EMPTY}</p>;

  return (
    <>
      <section className={`${styles.panel} ${styles.contractForm}`}>
        <h2>{T.MACHINE_MODELS.DETAIL}</h2>
        <div className={styles.operationsGrid}>
          <div><span>{T.MACHINE_MODELS.ID}</span><strong>{machineModel.id}</strong></div>
          <div><span>{T.MACHINE_MODELS.MODEL_CODE}</span><strong>{machineModel.modelCode}</strong></div>
          <div><span>{T.MACHINE_MODELS.MANUFACTURER}</span><strong>{machineModel.manufacturer}</strong></div>
          <div><span>{T.MACHINE_MODELS.DISPLAY_NAME}</span><strong>{machineModel.displayName}</strong></div>
          <div><span>{T.MACHINES.MACHINE_TYPE}</span><strong>{machineModel.machineType === "SMART_IOT" ? `${T.MACHINES.SMART} (SMART_IOT)` : `${T.MACHINES.CONVENTIONAL} (CONVENTIONAL)`}</strong></div>
          <div><span>{T.MACHINES.STATUS}</span><strong>{machineModel.active ? T.MACHINE_MODELS.ACTIVE : T.MACHINE_MODELS.INACTIVE}</strong></div>
          <div><span>{T.MACHINE_MODELS.CREATED_AT}</span><strong>{formatDateTime(machineModel.createdAt)}</strong></div>
          <div><span>{T.MACHINE_MODELS.UPDATED_AT}</span><strong>{formatDateTime(machineModel.updatedAt)}</strong></div>
          <div className={styles.machineModelSpecifications}>
            <span>{T.MACHINE_MODELS.SPECIFICATIONS}</span>
            <pre>{JSON.stringify(machineModel.specifications, null, 2)}</pre>
          </div>
        </div>
      </section>
      <ActionBar>
        <ButtonBar href={`${PATH_ADMIN.MACHINES}?view=types`}>{T.MACHINE_MODELS.BACK}</ButtonBar>
      </ActionBar>
    </>
  );
}
