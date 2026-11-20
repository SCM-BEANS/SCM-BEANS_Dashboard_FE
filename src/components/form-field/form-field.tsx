import { cloneElement, type ReactElement, type ReactNode } from "react";
import styles from "./form-field.module.css";

type FieldControlProps = {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
};

export function FormField({
  id,
  label,
  description,
  error,
  required = false,
  children,
}: {
  id: string;
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  children: ReactElement<FieldControlProps>;
}) {
  const controlId = children.props.id ?? id;
  const descriptionId = description ? `${controlId}-description` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [children.props["aria-describedby"], descriptionId, errorId].filter(Boolean).join(" ") || undefined;
  const control = cloneElement(children, {
    id: controlId,
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : children.props["aria-invalid"],
  });

  return (
    <div className={styles.field} data-ui-field>
      <label className={styles.label} htmlFor={controlId}>
        {label}{required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {control}
      {description ? <small className={styles.description} id={descriptionId}>{description}</small> : null}
      {error ? <small className={styles.error} id={errorId} role="alert">{error}</small> : null}
    </div>
  );
}
