import { ADMIN_USERS_MESSAGES as T } from "@/text/admin/admin-users-messages";
import type { AdminUserRole } from "@/schema/admin-users.schema";
import type { FormEvent, ReactNode } from "react";
import styles from "./account-create-form.module.css";

export type AccountCreateField = "name" | "email" | "role";

export type AccountCreateValue = {
  name: string;
  email: string;
  role: AdminUserRole | "";
};

export type AccountRoleOption = {
  value: AdminUserRole;
  label: string;
};

export function AccountCreateForm({
  id,
  title,
  value,
  roleOptions,
  fixedRole,
  onChange,
  onSubmit,
  error,
  disabled = false,
  children,
}: {
  id: string;
  title: string;
  value: AccountCreateValue;
  roleOptions?: readonly AccountRoleOption[];
  fixedRole?: AccountRoleOption;
  onChange: (field: AccountCreateField, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  error?: string;
  disabled?: boolean;
  children?: ReactNode;
}) {
  return (
    <form id={id} className={styles.formPanel} onSubmit={onSubmit}>
      <h2>{title}</h2>
      <div className={styles.formGrid}>
        <label>
          {T.FORM.NAME}
          <input
            name="name"
            autoComplete="name"
            value={value.name}
            maxLength={50}
            disabled={disabled}
            onChange={(event) => onChange("name", event.target.value)}
          />
        </label>
        <label>
          {T.FORM.EMAIL}
          <input
            name="email"
            type="email"
            autoComplete="email"
            value={value.email}
            maxLength={255}
            disabled={disabled}
            onChange={(event) => onChange("email", event.target.value)}
          />
        </label>
        {fixedRole ? (
          <div className={styles.fixedRole}>
            <span>{T.FORM.ROLE}</span>
            <strong>{fixedRole.label}</strong>
          </div>
        ) : (
          <label>
            {T.FORM.ROLE}
            <select
              name="role"
              value={value.role}
              disabled={disabled}
              onChange={(event) => onChange("role", event.target.value)}
            >
              <option value="">{T.FORM.SELECT_ROLE}</option>
              {(roleOptions ?? []).map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        )}
      </div>
      {error && <p className={styles.error} role="alert">{error}</p>}
      {children}
    </form>
  );
}
