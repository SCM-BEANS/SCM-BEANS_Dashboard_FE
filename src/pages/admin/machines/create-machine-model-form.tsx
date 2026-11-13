import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { machineModelsApi } from "@/apis/machine-models.api";
import { PageActionsRenderer as PageActions } from "@/components/action-bar/page-actions-renderer";
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

const specificationLabels: Record<string, string> = { power: "Công suất", voltage: "Điện áp", waterTankCapacity: "Dung tích bình nước", beanHopperCapacity: "Sức chứa hộc hạt", dimensionsMm: "Kích thước (mm)", width: "Chiều rộng", depth: "Chiều sâu", height: "Chiều cao", weightKg: "Khối lượng (kg)" };
const specificationLabel = (key: string) => specificationLabels[key] ?? key;

export function MachineSpecificationsView({ value }: { value: Record<string, unknown> }) {
  if (!Object.keys(value).length) return <p className={styles.panelSubtitle}>Chưa có thông số kỹ thuật.</p>;
  return <dl className={styles.specificationsList}>{Object.entries(value).map(([key, item]) => <div key={key}><dt>{specificationLabel(key)}</dt><dd>{item !== null && typeof item === "object" ? <MachineSpecificationsView value={item as Record<string, unknown>} /> : String(item ?? "—")}</dd></div>)}</dl>;
}

export function MachineSpecificationsFields({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const specifications = JSON.parse(value) as Record<string, unknown>;
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const draftInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    draftInput.current?.setCustomValidity(name || amount ? "Bấm Thêm thông số để đưa dòng này vào danh sách, hoặc xóa nội dung để bỏ qua." : "");
  }, [name, amount]);
  const entries = Object.entries(specifications);
  return <section className={styles.specificationsEditor}>
    <h3>Thông số kỹ thuật</h3>
    {entries.map(([key, item]) => <div className={styles.specificationRow} key={key}>
      <span>{specificationLabel(key)}</span>
      {typeof item === "object" && item !== null ? <details><summary>Thông số chi tiết đã lưu</summary>{Array.isArray(item) ? <MachineSpecificationsView value={item as unknown as Record<string, unknown>} /> : <MachineSpecificationsFields value={JSON.stringify(item)} onChange={(next) => onChange(JSON.stringify({ ...specifications, [key]: JSON.parse(next) }))} />}</details> : <input aria-label={`Giá trị ${key}`} value={String(item ?? "")} onChange={(event) => {
        const next = event.target.value;
        onChange(JSON.stringify({ ...specifications, [key]: typeof item === "number" && next.trim() && Number.isFinite(Number(next)) ? Number(next) : typeof item === "boolean" && ["true", "false"].includes(next) ? next === "true" : next }));
      }} />}
      <button type="button" onClick={() => onChange(JSON.stringify(Object.fromEntries(entries.filter(([name]) => name !== key))))} aria-label={`Xóa thông số ${key}`}>Xóa dòng</button>
    </div>)}
    <div className={styles.specificationRow}>
      <label>Tên thông số<input ref={draftInput} value={name} onChange={(event) => setName(event.target.value)} placeholder="Ví dụ: Công suất" /></label>
      <label>Giá trị và đơn vị<input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Ví dụ: 2200 W" /></label>
      <button type="button" onClick={() => {
        if (!name.trim() || !amount.trim()) { setError("Nhập tên và giá trị trước khi thêm thông số."); return; }
        if (Object.hasOwn(specifications, name.trim())) { setError("Tên thông số đã có. Hãy sửa giá trị ở dòng tương ứng."); return; }
        onChange(JSON.stringify({ ...specifications, [name.trim()]: amount.trim() })); setName(""); setAmount(""); setError("");
      }}>Thêm thông số</button>
    </div>
    {error && <p role="alert">{error}</p>}
  </section>;
}

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

  const validation = (() => {
    let specifications: unknown = {};
    if (form.specifications.trim()) {
      try { specifications = JSON.parse(form.specifications); }
      catch { return { valid: false, reason: T.MACHINE_MODELS.SPECIFICATIONS_INVALID }; }
    }
    if (specifications === null || typeof specifications !== "object" || Array.isArray(specifications)) {
      return { valid: false, reason: T.MACHINE_MODELS.SPECIFICATIONS_INVALID };
    }
    const result = CreateMachineModelRequestSchema.safeParse({
      modelCode: form.modelCode,
      manufacturer: form.manufacturer,
      displayName: form.displayName,
      machineType: form.machineType,
      specifications: specifications as Record<string, unknown>,
    });
    return { valid: result.success, reason: result.success ? undefined : T.MACHINE_MODELS.CREATE_INVALID };
  })();
  const formDirty = JSON.stringify(form) !== JSON.stringify(initialForm);
  const saveDisabledReason = create.isPending
    ? "Đang tạo mẫu máy."
    : blockResubmit
      ? "Kiểm tra danh sách mẫu máy trước khi gửi lại."
      : validation.reason;

  return (
    <>
      <div className={styles.machineTopActions}>
      <PageActions actions={[
        {
          id: "machine-model-create-cancel",
          label: T.MACHINE_MODELS.CANCEL,
          variant: "secondary",
          priority: 100,
          disabled: create.isPending,
          disabledReason: create.isPending ? "Đang tạo mẫu máy." : undefined,
          onClick: onCancel,
          confirm: formDirty ? { title: "Hủy tạo mẫu máy?", description: "Thông tin mẫu máy chưa lưu sẽ bị mất.", confirmLabel: "Hủy" } : undefined,
        },
        {
          id: "machine-model-create-submit",
          label: create.isPending ? T.MACHINE_MODELS.CREATING : T.MACHINE_MODELS.CREATE_SUBMIT,
          variant: "primary",
          priority: 100,
          type: "submit",
          form: "machine-model-create-form",
          disabled: !validation.valid || create.isPending || blockResubmit,
          disabledReason: saveDisabledReason,
          pending: create.isPending,
          pendingLabel: T.MACHINE_MODELS.CREATING,
        },
      ]} />
      </div>
      <div className={styles.machineFormLayout}>
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
          <MachineSpecificationsFields value={form.specifications} onChange={(value) => setField("specifications", value)} />
        </div>
        {requestError && <p className={styles.operationsNotice} role="alert">{requestError}</p>}
      </form>
      <aside className={`${styles.panel} ${styles.machineFormSummary}`} aria-label="Kiểm tra thông tin mẫu máy">
        <h2>Kiểm tra thông tin</h2>
        <dl className={styles.specificationsList}>
          <div><dt>Mã mẫu</dt><dd>{form.modelCode || "—"}</dd></div>
          <div><dt>Tên mẫu</dt><dd>{form.displayName || "—"}</dd></div>
          <div><dt>Nhà sản xuất</dt><dd>{form.manufacturer || "—"}</dd></div>
          <div><dt>Loại máy</dt><dd>{form.machineType === "SMART_IOT" ? "Smart IoT" : "Máy thường"}</dd></div>
          <div><dt>Thông số đã thêm</dt><dd>{Object.keys(JSON.parse(form.specifications)).length}</dd></div>
        </dl>
      </aside>
      </div>

    </>
  );
}
