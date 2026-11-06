import type { RecipeProcedureDraft } from "@/schema/recipes.schema";
import styles from "../repair-workflow/repair-workflow.module.css";

const groups: { title: string; description: string; fields: { key: keyof RecipeProcedureDraft; label: string; unit: string; required?: boolean; min: number; integer?: boolean }[] }[] = [
  { title: "Chiết xuất chính", description: "Lượng cà phê và lượng nước là hai thông số bắt buộc.", fields: [
    { key: "DOSE", label: "Lượng cà phê", unit: "g", required: true, min: 0.1 },
    { key: "EXTRACT", label: "Nước chiết xuất", unit: "ml", required: true, min: 0.1 },
    { key: "TAMP", label: "Mức nén", unit: "mức", min: 0.1 },
    { key: "HOLDTAMP", label: "Mức giữ nén", unit: "mức", min: 0 },
  ] },
  { title: "Nước bổ sung và ủ cà phê", description: "Để trống để dùng mặc định 0; các giá trị nước tính bằng ml.", fields: [
    { key: "PREWATER", label: "Nước trước khi pha", unit: "ml", min: 0 },
    { key: "POSTWATER", label: "Nước sau khi pha", unit: "ml", min: 0 },
    { key: "PREINFUSE", label: "Nước ủ ban đầu", unit: "ml", min: 0 },
    { key: "BLOOM", label: "Thời gian ủ", unit: "giây", min: 0 },
  ] },
  { title: "Công thức sữa", description: "Nhập mã số công thức sữa, không phải lượng sữa. Để trống nếu không sử dụng.", fields: [
    { key: "PREMILK", label: "Mã công thức sữa trước", unit: "ID", integer: true, min: -1 },
    { key: "POSTMILK", label: "Mã công thức sữa sau", unit: "ID", integer: true, min: -1 },
  ] },
];

export function RecipeProcedureFields({ value, onChange, prefix, disabled = false }: {
  value: RecipeProcedureDraft; onChange: (value: RecipeProcedureDraft) => void; prefix: string; disabled?: boolean;
}) {
  const renderFields = (keys: (keyof RecipeProcedureDraft)[]) => <div className={styles.recipeMenuFormGrid}>
    {groups.flatMap((group) => group.fields).filter((field) => keys.includes(field.key)).map((field) => <label key={field.key} className={styles.formField} htmlFor={prefix + "-" + field.key}>
      <span>{field.label} ({field.unit}){field.required ? " *" : ""}</span>
      <input id={prefix + "-" + field.key} type="number" inputMode={field.integer ? "numeric" : "decimal"}
        required={field.required} min={field.min} step={field.integer ? "1" : "0.1"} value={value[field.key]}
        placeholder={field.key === "DOSE" ? "Ví dụ: 18" : field.key === "EXTRACT" ? "Ví dụ: 36" : "Không sử dụng"}
        onChange={(event) => onChange({ ...value, [field.key]: event.target.value })} />
    </label>)}
  </div>;
  return <div className={styles.recipeMenuProcedure}>
    <fieldset className={styles.recipeMenuEditorGroup} disabled={disabled}>
      <legend>Thông số pha bắt buộc</legend>
      {renderFields(["DOSE", "EXTRACT"])}
    </fieldset>
    <details className={styles.recipeMenuDisclosure}>
      <summary>Thông số nâng cao · nén, ủ, nước bổ sung và sữa</summary>
      <p className={styles.recipeMenuMeta}>Chỉ thay đổi khi cần. Mức nén mặc định 100, giữ nén 50; các ô nước và sữa có thể để trống.</p>
      {groups.map((group) => {
        const keys = group.fields.filter((field) => !field.required).map((field) => field.key);
        return <fieldset key={group.title} className={styles.recipeMenuEditorGroup} disabled={disabled}>
          <legend>{group.title === "Chiết xuất chính" ? "Nén cà phê" : group.title}</legend>
          <p className={styles.recipeMenuMeta}>{group.title === "Chiết xuất chính" ? "Giữ thông số mặc định nếu chưa cần điều chỉnh mức nén." : group.description}</p>
          {renderFields(keys)}
        </fieldset>;
      })}
    </details>
    <p className={styles.recipeMenuPreview} aria-live="polite">Một lần pha: <strong>{value.DOSE || "—"} g cà phê</strong> · <strong>{value.EXTRACT || "—"} ml nước chiết xuất</strong></p>
  </div>;
}

export function RecipeSteps({ steps }: { steps: string[] }) {
  const fields = Object.fromEntries(groups.flatMap((group) => group.fields.map((field) => [field.key, field])));
  return steps.length ? <ol>{steps.map((step, index) => {
    const match = /^([A-Z]+):(-?\d+(?:\.\d+)?)$/.exec(step);
    const field = match ? fields[match[1]] : undefined;
    const label = field && match ? field.label + ": " + match[2] + " " + field.unit : match?.[1] === "DRYTAMP" ? "Kết thúc chiết xuất" : step;
    return <li key={index}>{label}</li>;
  })}</ol> : <p>Chưa có các bước trong dữ liệu thư viện.</p>;
}
