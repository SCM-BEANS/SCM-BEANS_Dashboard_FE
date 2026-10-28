import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { machineModelsApi } from "@/apis/machine-models.api";
import { ActionBar } from "@/components/action-bar/action-bar";
import { ButtonBar } from "@/components/button/button-bar";
import { getApiErrorMessage, isUncertainApiMutation } from "@/lib/api-errors";
import { CreateMachineModelRequestSchema, type CreateMachineModelRequest } from "@/schema/machine-models.schema";
import { MachineTypeSchema } from "@/schema/machines.schema";
import { ADMIN_OPERATIONS_MESSAGES as T } from "@/text/admin/admin-operations-messages";
import { adminStyles as styles } from "../admin-shell";

type MachineModelForm = {
  modelCode: string;
  manufacturer: string;
  displayName: string;
  machineType: CreateMachineModelRequest["machineType"];
  specifications: string;
};

const initialForm: MachineModelForm = {
  modelCode: "",
  manufacturer: "",
  displayName: "",
  machineType: "CONVENTIONAL",
  specifications: "{}",
};

const sampleSpecifications = `{
  "power": "1450 W",
  "voltage": "220-240 V",
  "waterTankCapacity": "2 L",
  "beanHopperCapacity": "500 g",
  "dimensionsMm": {
    "width": 280,
    "depth": 430,
    "height": 360
  },
  "weightKg": 9.5
}`;

type CreateMachineModelFormProps = {
  onCancel: () => void;
  onCreated: (modelCode: string) => void;
};

export function CreateMachineModelForm({ onCancel, onCreated }: CreateMachineModelFormProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<MachineModelForm>(initialForm);
  const [requestError, setRequestError] = useState("");
  const [blockResubmit, setBlockResubmit] = useState(false);
  const create = useMutation({
    mutationFn: (request: CreateMachineModelRequest) => machineModelsApi.create(request),
    onSuccess: (_created, request) => {
      setRequestError("");
      setBlockResubmit(false);
      void queryClient.invalidateQueries({ queryKey: ["admin", "machine-models"] });
      onCreated(request.modelCode);
    },
    onError: (error: unknown) => {
      if (isUncertainApiMutation(error)) {
        setBlockResubmit(true);
        void queryClient.invalidateQueries({ queryKey: ["admin", "machine-models"] });
      }
      setRequestError(getApiErrorMessage(error, "mutation"));
    },
  });

  const setField = <K extends keyof MachineModelForm>(key: K, value: MachineModelForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (create.isPending || blockResubmit) return;
    setRequestError("");

    let specifications: unknown = {};
    const rawSpecifications = form.specifications.trim();
    if (rawSpecifications) {
      try {
        specifications = JSON.parse(rawSpecifications);
      } catch {
        setRequestError(T.MACHINE_MODELS.SPECIFICATIONS_INVALID);
        return;
      }
    }
    if (specifications === null || typeof specifications !== "object" || Array.isArray(specifications)) {
      setRequestError(T.MACHINE_MODELS.SPECIFICATIONS_INVALID);
      return;
    }

    const result = CreateMachineModelRequestSchema.safeParse({
      modelCode: form.modelCode,
      manufacturer: form.manufacturer,
      displayName: form.displayName,
      machineType: form.machineType,
      specifications: specifications as Record<string, unknown>,
    });
    if (!result.success) {
      setRequestError(T.MACHINE_MODELS.CREATE_INVALID);
      return;
    }
    create.mutate(result.data);
  };

  return (
    <>
      <form id="machine-model-create-form" className={`${styles.panel} ${styles.contractForm}`} onSubmit={submit}>
        <h2>{T.MACHINE_MODELS.CREATE_FORM_TITLE}</h2>
        <div className={styles.operationsGrid}>
          <label>{T.MACHINE_MODELS.MODEL_CODE} *<input required autoComplete="off" value={form.modelCode} onChange={(event) => setField("modelCode", event.target.value)} /></label>
          <label>{T.MACHINE_MODELS.MANUFACTURER} *<input required autoComplete="organization" value={form.manufacturer} onChange={(event) => setField("manufacturer", event.target.value)} /></label>
          <label>{T.MACHINE_MODELS.DISPLAY_NAME} *<input required value={form.displayName} onChange={(event) => setField("displayName", event.target.value)} /></label>
          <label>{T.MACHINES.MACHINE_TYPE} *
            <select value={form.machineType} onChange={(event) => setField("machineType", event.target.value as MachineModelForm["machineType"])}>
              {MachineTypeSchema.options.map((machineType) => (
                <option value={machineType} key={machineType}>
                  {machineType === "SMART_IOT"
                    ? `${T.MACHINES.SMART} (SMART_IOT)`
                    : `${T.MACHINES.CONVENTIONAL} (CONVENTIONAL)`}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.machineModelSpecifications}>{T.MACHINE_MODELS.SPECIFICATIONS} (JSON)
            <textarea rows={5} spellCheck={false} value={form.specifications} onChange={(event) => setField("specifications", event.target.value)} />
          </label>
          <div className={styles.machineModelSpecificationsSample}>
            <p>Mẫu minh họa cho máy pha cà phê; hãy thay bằng thông số thực tế của mẫu máy.</p>
            <pre>{sampleSpecifications}</pre>
            <button
              type="button"
              onClick={() => {
                setField("specifications", sampleSpecifications);
                setRequestError("");
              }}
            >
              Dùng JSON mẫu
            </button>
          </div>
        </div>
        {requestError && <p className={styles.operationsNotice} role="alert">{requestError}</p>}
      </form>
      <ActionBar>
        <ButtonBar type="button" onClick={onCancel}>{T.MACHINE_MODELS.CANCEL}</ButtonBar>
        <ButtonBar type="submit" form="machine-model-create-form" disabled={create.isPending || blockResubmit}>
          {create.isPending ? T.MACHINE_MODELS.CREATING : T.MACHINE_MODELS.CREATE_SUBMIT}
        </ButtonBar>
      </ActionBar>
    </>
  );
}
