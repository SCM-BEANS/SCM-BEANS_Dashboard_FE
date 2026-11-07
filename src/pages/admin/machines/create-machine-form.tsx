import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { machineModelsApi } from "@/apis/machine-models.api";
import { PageActions } from "@/components/action-bar/page-actions";
import { getApiErrorMessage, isUncertainApiMutation } from "@/lib/api-errors";
import { MachineCreateUnexpectedStatusError, machinesApi } from "@/apis/machines.api";
import { CreateMachineRequestSchema, MachineTypeSchema, type CreateMachineRequest } from "@/schema/machines.schema";
import { ADMIN_OPERATIONS_MESSAGES as T } from "@/text/admin/admin-operations-messages";
import { adminStyles as styles } from "../admin-shell";
import { useState, type FormEvent } from "react";

type MachineCreateForm = { machineModelId: string; serialNumber: string; region: string; machineType: CreateMachineRequest["machineType"] };
type MachineCreateSubmission = { machineModelId: string; request: CreateMachineRequest };
type MachineAssignment = { modelId: string; machineId: string; serialNumber: string; reason: string };

const initialMachineForm: MachineCreateForm = { machineModelId: "", serialNumber: "", region: "", machineType: "CONVENTIONAL" };

export function CreateMachineForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (serialNumber: string) => void;
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<MachineCreateForm>(initialMachineForm);
  const [requestError, setRequestError] = useState("");
  const [blockResubmit, setBlockResubmit] = useState(false);
  const [pendingAssignment, setPendingAssignment] = useState<MachineAssignment | null>(null);
  const machineModels = useQuery({
    queryKey: ["admin", "machine-models"],
    queryFn: ({ signal }) => machineModelsApi.list(signal),
  });
  const assignMachine = useMutation({
    mutationFn: ({ modelId, machineId, reason }: MachineAssignment) => machineModelsApi.assignMachineToModel(modelId, machineId, { reason }),
    onSuccess: (_result, assignment) => {
      setRequestError("");
      setPendingAssignment(null);
      setBlockResubmit(false);
      void Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ["dolores", "machines", "inventory"] }),
        queryClient.invalidateQueries({ queryKey: ["dolores", "machines", "inventory-summary"] }),
      ]);
      onCreated(assignment.serialNumber);
    },
    onError: (error: unknown) => {
      setRequestError(`${T.MACHINE_MODELS.ASSIGN_FAILED} ${getApiErrorMessage(error, "mutation")}`);
    },
  });
  const create = useMutation({
    mutationFn: ({ request }: MachineCreateSubmission) => machinesApi.create(request),
    onSuccess: (machine, submission) => {
      const assignment = {
        modelId: submission.machineModelId,
        machineId: machine.id,
        serialNumber: submission.request.serialNumber,
        reason: T.MACHINE_MODELS.ASSIGN_REASON_CREATE,
      };
      setRequestError("");
      setPendingAssignment(assignment);
      void Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ["dolores", "machines", "inventory"] }),
        queryClient.invalidateQueries({ queryKey: ["dolores", "machines", "inventory-summary"] }),
      ]);
      assignMachine.mutate(assignment);
    },
    onError: (error: unknown) => {
      if (error instanceof MachineCreateUnexpectedStatusError) {
        setBlockResubmit(true);
        setRequestError(`${T.MACHINE_MODELS.CREATE_STATUS_UNEXPECTED} (HTTP ${error.status})`);
        void queryClient.invalidateQueries({ queryKey: ["dolores", "machines", "inventory"] });
        void queryClient.invalidateQueries({ queryKey: ["dolores", "machines", "inventory-summary"] });
        return;
      }
      if (isUncertainApiMutation(error)) {
        setBlockResubmit(true);
        setRequestError(getApiErrorMessage(error, "mutation"));
        void queryClient.invalidateQueries({ queryKey: ["dolores", "machines", "inventory"] });
        void queryClient.invalidateQueries({ queryKey: ["dolores", "machines", "inventory-summary"] });
        return;
      }
      setRequestError(getApiErrorMessage(error, "mutation"));
    },
  });

  const setField = <K extends keyof MachineCreateForm>(key: K, value: MachineCreateForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      create.isPending
      || assignMachine.isPending
      || pendingAssignment
      || blockResubmit
      || machineModels.isPending
      || machineModels.isError
      || !machineModels.data?.length
      || !form.machineModelId
    ) return;
    setRequestError("");
    const result = CreateMachineRequestSchema.safeParse({
      serialNumber: form.serialNumber,
      region: form.region.trim() || undefined,
      machineType: form.machineType,
      status: "IN_WAREHOUSE",
      cupsServedSinceLastDescale: 0,
    });
    if (!result.success) {
      setRequestError(T.MACHINES.CREATE_INVALID);
      return;
    }
    create.mutate({ machineModelId: form.machineModelId, request: result.data });
  };

  const parsedRequest = CreateMachineRequestSchema.safeParse({
    serialNumber: form.serialNumber,
    region: form.region.trim() || undefined,
    machineType: form.machineType,
    status: "IN_WAREHOUSE",
    cupsServedSinceLastDescale: 0,
  });
  const formDirty = JSON.stringify(form) !== JSON.stringify(initialMachineForm);
  const saveDisabledReason = create.isPending
    ? "Đang tạo máy."
    : blockResubmit
      ? "Kiểm tra danh sách máy trước khi gửi lại."
      : machineModels.isPending
        ? "Đang tải danh sách mẫu máy."
        : machineModels.isError
          ? "Không thể tải mẫu máy. Hãy xử lý lỗi trong biểu mẫu trước."
          : !machineModels.data?.length
            ? "Cần có mẫu máy trước khi tạo máy."
            : !form.machineModelId
              ? "Chọn mẫu máy trước khi tạo máy."
              : !parsedRequest.success
                ? T.MACHINES.CREATE_INVALID
                : undefined;
  const actionPending = create.isPending || assignMachine.isPending;

  return (
    <>
      <form id="machine-create-form" className={`${styles.panel} ${styles.contractForm}`} onSubmit={submit}>
        <h2>{T.MACHINES.CREATE_FORM_TITLE}</h2>
        <div className={styles.operationsGrid}>
          <label>{T.MACHINES.CREATE_SERIAL} *<input required autoComplete="off" value={form.serialNumber} onChange={(event) => setField("serialNumber", event.target.value)} /></label>
          <label>{T.MACHINES.CREATE_REGION}<input value={form.region} onChange={(event) => setField("region", event.target.value)} /></label>
          <label>Loại máy *
            <select value={form.machineType} onChange={(event) => setField("machineType", event.target.value as MachineCreateForm["machineType"])}>
              {MachineTypeSchema.options.map((machineType) => (
                <option value={machineType} key={machineType}>
                  {machineType === "SMART_IOT" ? "Smart IoT (SMART_IOT)" : "Máy thường (CONVENTIONAL)"}
                </option>
              ))}
            </select>
          </label>
          <div><span>{T.MACHINES.CREATE_INITIAL_STATUS}</span><strong>{T.MACHINES.WAREHOUSE} (IN_WAREHOUSE)</strong></div>
          <div><span>{T.MACHINES.CREATE_INITIAL_CUPS}</span><strong>0</strong></div>
          <label>Mẫu máy *
            <select
              required
              value={form.machineModelId}
              disabled={machineModels.isPending || machineModels.isError || !machineModels.data?.length || create.isPending || assignMachine.isPending || Boolean(pendingAssignment)}
              onChange={(event) => setField("machineModelId", event.target.value)}
            >
              <option value="">{machineModels.isPending ? T.COMMON.LOADING : "Chọn mẫu máy"}</option>
              {machineModels.data?.map((machineModel) => (
                <option value={machineModel.id} key={machineModel.id}>
                  {machineModel.displayName} ({machineModel.modelCode})
                </option>
              ))}
            </select>
          </label>
        </div>
        {machineModels.isError && (
          <div className={`${styles.notice} ${styles.errorNotice}`} role="alert">
            <p>{getApiErrorMessage(machineModels.error)}</p>
            <button type="button" onClick={() => void machineModels.refetch()}>{T.COMMON.RETRY}</button>
          </div>
        )}
        {machineModels.data?.length === 0 && <p className={styles.emptyText}>{T.COMMON.EMPTY}</p>}
        {requestError && <p className={styles.operationsNotice} role="alert">{requestError}</p>}
      </form>
      <PageActions actions={[
        {
          id: "machine-create-cancel",
          label: T.MACHINE_MODELS.CANCEL,
          variant: "secondary",
          priority: 100,
          disabled: actionPending,
          disabledReason: actionPending ? "Đang xử lý đăng ký máy." : undefined,
          onClick: onCancel,
          confirm: formDirty ? { title: "Hủy tạo máy?", description: "Thông tin máy chưa lưu sẽ bị mất.", confirmLabel: "Hủy" } : undefined,
        },
        pendingAssignment ? {
          id: "machine-create-retry-assignment",
          label: T.MACHINE_MODELS.RETRY_ASSIGNMENT,
          variant: "primary",
          priority: 50,
          disabled: assignMachine.isPending,
          disabledReason: assignMachine.isPending ? "Đang gán mẫu máy." : undefined,
          pending: assignMachine.isPending,
          pendingLabel: T.MACHINE_MODELS.ASSIGNING,
          onClick: () => assignMachine.mutate(pendingAssignment),
        } : {
          id: "machine-create-submit",
          label: create.isPending ? T.MACHINES.CREATING : T.MACHINES.CREATE_SUBMIT,
          variant: "primary",
          priority: 100,
          type: "submit",
          form: "machine-create-form",
          disabled: Boolean(saveDisabledReason) || actionPending,
          disabledReason: saveDisabledReason ?? (actionPending ? "Đang gán mẫu máy." : undefined),
          pending: create.isPending,
          pendingLabel: T.MACHINES.CREATING,
        },
      ]} />
    </>
  );
}
