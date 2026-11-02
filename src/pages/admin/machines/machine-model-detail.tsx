import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { machineModelsApi } from "@/apis/machine-models.api";
import { ActionBar } from "@/components/action-bar/action-bar";
import { ButtonBar } from "@/components/button/button-bar";
import { NotificationDialog } from "@/components/notification-dialog/notification-dialog";
import { getApiErrorMessage } from "@/lib/api-errors";
import { PATH_ADMIN, PATH_MODERATOR } from "@/routes/path";
import { ADMIN_OPERATIONS_MESSAGES as T } from "@/text/admin/admin-operations-messages";
import { CreateMachineModelRequestSchema, type CreateMachineModelRequest } from "@/schema/machine-models.schema";
import { adminStyles as styles } from "../admin-shell";

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("vi-VN");
}

export function MachineModelDetail({
  modelId,
  role = "admin",
}: {
  modelId: string;
  role?: "admin" | "moderator";
}) {
  const queryClient = useQueryClient();
  const modelDetailQueryKey = role === "admin"
    ? ["admin", "machine-models", "detail", modelId]
    : ["dolores", "machine-models", "detail", modelId];
  const modelListQueryKey = role === "admin"
    ? ["admin", "machine-models"]
    : ["dolores", "machine-models"];
  const [editing, setEditing] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [form, setForm] = useState<CreateMachineModelRequest>({
    modelCode: "", manufacturer: "", displayName: "", machineType: "CONVENTIONAL", specifications: {},
  });
  const [specificationsText, setSpecificationsText] = useState("{}");
  const [formError, setFormError] = useState("");
  const machineModels = useQuery({
    queryKey: modelDetailQueryKey,
    queryFn: ({ signal }) => machineModelsApi.getById(modelId, signal),
    enabled: Boolean(modelId),
  });
  const machineModel = machineModels.data;
  useEffect(() => {
    if (!machineModel) return;
    setForm({
      modelCode: machineModel.modelCode,
      manufacturer: machineModel.manufacturer,
      displayName: machineModel.displayName,
      machineType: machineModel.machineType,
      specifications: machineModel.specifications,
    });
    setSpecificationsText(JSON.stringify(machineModel.specifications, null, 2));
  }, [machineModel]);
  const update = useMutation({
    mutationFn: (input: CreateMachineModelRequest) => machineModelsApi.update(modelId, input),
    onSuccess: async (updated) => {
      queryClient.setQueryData(modelDetailQueryKey, updated);
      await queryClient.invalidateQueries({ queryKey: modelListQueryKey });
      setEditing(false);
      setFormError("");
    },
    onError: (error: unknown) => setFormError(getApiErrorMessage(error, "mutation")),
  });
  const deactivate = useMutation({
    mutationFn: () => machineModelsApi.deactivate(modelId),
    onSuccess: async (updated) => {
      queryClient.setQueryData(modelDetailQueryKey, updated);
      await queryClient.invalidateQueries({ queryKey: modelListQueryKey });
      setConfirmDeactivate(false);
    },
    onError: (error: unknown) => setFormError(getApiErrorMessage(error, "mutation")),
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    let specifications: unknown;
    try { specifications = JSON.parse(specificationsText); }
    catch { setFormError(T.MACHINE_MODELS.SPECIFICATIONS_INVALID); return; }
    const parsed = CreateMachineModelRequestSchema.safeParse({ ...form, specifications });
    if (!parsed.success) { setFormError(T.MACHINE_MODELS.CREATE_INVALID); return; }
    setFormError("");
    update.mutate(parsed.data);
  };

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
      {editing && <form id="machine-model-edit-form" className={`${styles.panel} ${styles.contractForm}`} onSubmit={submit}>
        <h2>Chỉnh sửa mẫu máy</h2>
        <div className={styles.operationsGrid}>
          <label>{T.MACHINE_MODELS.MODEL_CODE}<input required maxLength={100} value={form.modelCode} onChange={(event) => setForm((current) => ({ ...current, modelCode: event.target.value }))} /></label>
          <label>{T.MACHINE_MODELS.MANUFACTURER}<input required maxLength={160} value={form.manufacturer} onChange={(event) => setForm((current) => ({ ...current, manufacturer: event.target.value }))} /></label>
          <label>{T.MACHINE_MODELS.DISPLAY_NAME}<input required maxLength={160} value={form.displayName} onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))} /></label>
          <label>{T.MACHINES.MACHINE_TYPE}<select value={form.machineType} onChange={(event) => setForm((current) => ({ ...current, machineType: event.target.value as CreateMachineModelRequest["machineType"] }))}>
            <option value="CONVENTIONAL">{T.MACHINES.CONVENTIONAL}</option><option value="SMART_IOT">{T.MACHINES.SMART}</option>
          </select></label>
          <label>{T.MACHINE_MODELS.SPECIFICATIONS}<textarea rows={8} value={specificationsText} onChange={(event) => setSpecificationsText(event.target.value)} /></label>
        </div>
        {formError && <p className={styles.operationsNotice} role="alert">{formError}</p>}
      </form>}
      {formError && !editing && <p className={styles.operationsNotice} role="alert">{formError}</p>}
      <ActionBar>
        {editing ? <>
          <ButtonBar type="submit" form="machine-model-edit-form" disabled={update.isPending}>{update.isPending ? "Đang lưu…" : "Lưu thay đổi"}</ButtonBar>
          <ButtonBar type="button" disabled={update.isPending} onClick={() => { setEditing(false); setFormError(""); }}>Hủy</ButtonBar>
        </> : <>
          {machineModel.active && <ButtonBar type="button" onClick={() => setEditing(true)}>Chỉnh sửa</ButtonBar>}
          {machineModel.active && <ButtonBar type="button" onClick={() => setConfirmDeactivate(true)}>Ngừng kích hoạt</ButtonBar>}
        </>}
        <ButtonBar href={role === "admin" ? `${PATH_ADMIN.MACHINES}?view=types` : PATH_MODERATOR.MACHINE_MODELS}>{T.MACHINE_MODELS.BACK}</ButtonBar>
      </ActionBar>
      {confirmDeactivate && <NotificationDialog
        variant="confirm"
        title="Ngừng kích hoạt mẫu máy?"
        description="Mẫu máy sẽ được giữ trong lịch sử và không còn dùng để đăng ký máy mới."
        primaryAction={{ label: "Ngừng kích hoạt", pending: deactivate.isPending, pendingLabel: "Đang cập nhật…", onClick: () => deactivate.mutate() }}
        secondaryAction={{ label: "Hủy", disabled: deactivate.isPending, onClick: () => setConfirmDeactivate(false) }}
        onClose={() => { if (!deactivate.isPending) setConfirmDeactivate(false); }}
        closeOnEscape={!deactivate.isPending}
      />}
    </>
  );
}
