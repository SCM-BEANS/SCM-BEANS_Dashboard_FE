import type { FormEventHandler } from "react";
import styles from "./table-filters.module.css";

export type TableFilterOption = {
  value: string;
  label: string;
};

export type TableFilterSelect = {
  id: string;
  ariaLabel: string;
  value: string;
  options: readonly TableFilterOption[];
  onChange: (value: string) => void;
};

export type TableFiltersProps = {
  search: {
    ariaLabel: string;
    placeholder: string;
    value: string;
    maxLength?: number;
    onChange: (value: string) => void;
  };
  selects?: readonly TableFilterSelect[];
  submitLabel: string;
  onSubmit: FormEventHandler<HTMLFormElement>;
  disabled?: boolean;
  reset?: {
    label: string;
    onClick: () => void;
  };
};

export function TableFilters({ search, selects = [], submitLabel, onSubmit, disabled = false, reset }: TableFiltersProps) {
  return (
    <form className={styles.filters} onSubmit={onSubmit}>
      <input
        aria-label={search.ariaLabel}
        maxLength={search.maxLength}
        placeholder={search.placeholder}
        value={search.value}
        disabled={disabled}
        onChange={(event) => search.onChange(event.target.value)}
      />
      {selects.map((select) => (
        <select
          key={select.id}
          aria-label={select.ariaLabel}
          value={select.value}
          disabled={disabled}
          onChange={(event) => select.onChange(event.target.value)}
        >
          {select.options.map((option) => (
            <option key={`${select.id}-${option.value}`} value={option.value}>{option.label}</option>
          ))}
        </select>
      ))}
      <button type="submit" disabled={disabled}>{submitLabel}</button>
      {reset && <button type="button" disabled={disabled} onClick={reset.onClick}>{reset.label}</button>}
    </form>
  );
}
