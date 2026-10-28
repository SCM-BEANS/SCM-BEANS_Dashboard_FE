import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { machineModelsApi } from "@/apis/machine-models.api";
import { ActionBar } from "@/components/action-bar/action-bar";
import { ButtonBar } from "@/components/button/button-bar";
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
    if (create.isPending || assignMachine.isPending || pendingAssignment || blockResubmit) return;
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
      <ActionBar>
        <ButtonBar type="button" disabled={create.isPending || assignMachine.isPending} onClick={onCancel}>{T.MACHINE_MODELS.CANCEL}</ButtonBar>
        {pendingAssignment ? (
          <ButtonBar type="button" disabled={assignMachine.isPending} onClick={() => assignMachine.mutate(pendingAssignment)}>
            {assignMachine.isPending ? T.MACHINE_MODELS.ASSIGNING : T.MACHINE_MODELS.RETRY_ASSIGNMENT}
          </ButtonBar>
        ) : (
          <ButtonBar
            type="submit"
            form="machine-create-form"
            disabled={create.isPending || assignMachine.isPending || blockResubmit || machineModels.isPending || machineModels.isError || !machineModels.data?.length || !form.machineModelId}
          >
            {create.isPending ? T.MACHINES.CREATING : T.MACHINES.CREATE_SUBMIT}
          </ButtonBar>
        )}
      </ActionBar>
    </>
  );
}
