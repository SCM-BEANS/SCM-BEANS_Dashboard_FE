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
  return <div className={styles.recipeMenuEditor}>
    {groups.map((group) => <fieldset key={group.title} className={styles.recipeMenuEditorGroup} disabled={disabled}>
      <legend>{group.title}</legend>
      <p className={styles.recipeMenuMeta}>{group.description}</p>
      <div className={styles.recipeMenuFormGrid}>
        {group.fields.map((field) => <label key={field.key} className={styles.formField} htmlFor={prefix + "-" + field.key}>
          <span>{field.label} ({field.unit}){field.required ? " *" : ""}</span>
          <input id={prefix + "-" + field.key} type="number" inputMode={field.integer ? "numeric" : "decimal"}
            required={field.required} min={field.min} step={field.integer ? "1" : "0.1"} value={value[field.key]}
            onChange={(event) => onChange({ ...value, [field.key]: event.target.value })} />
        </label>)}
      </div>
    </fieldset>)}
    <p className={styles.recipeMenuMeta}>Mặc định mức nén 100, giữ nén 50; bước kết thúc chiết xuất cố định DRYTAMP:100. Chọn thông số phù hợp với mẫu máy trước khi lưu.</p>
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
