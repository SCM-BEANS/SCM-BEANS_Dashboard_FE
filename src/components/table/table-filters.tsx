import { ButtonBar } from "@/components/button/button-bar";
import { SectionTabList } from "@/components/tabs/section-tab-list";
import type { FormEventHandler, ReactNode } from "react";
import styles from "./table-filters.module.css";

export type TableFilterOption = {
  value: string;
  label: string;
};

export type TableFilterSelect = {
  id: string;
  ariaLabel: string;
  label?: string;
  value: string;
  options: readonly TableFilterOption[];
  onChange: (value: string) => void;
};

export type TableFilterInput = {
  id: string;
  ariaLabel: string;
  label?: string;
  type: "date" | "month" | "text";
  value: string;
  maxLength?: number;
  onChange: (value: string) => void;
};

export type TableFilterToggleGroup = {
  ariaLabel: string;
  value: string;
  options: readonly (TableFilterOption & { count?: number | string })[];
  onChange: (value: string) => void;
};

export type TableFiltersProps = {
  search: {
    ariaLabel: string;
    placeholder: string;
    label?: string;
    value: string;
    maxLength?: number;
    list?: { id: string; options: readonly TableFilterOption[] };
    onChange: (value: string) => void;
  };
  inputs?: readonly TableFilterInput[];
  selects?: readonly TableFilterSelect[];
  toggleGroup?: TableFilterToggleGroup;
  submitLabel: string;
  onSubmit: FormEventHandler<HTMLFormElement>;
  showSubmit?: boolean;
  disabled?: boolean;
  reset?: {
    label: string;
    onClick: () => void;
  };
  children?: ReactNode;
  className?: string;
  compact?: boolean;
};

type TableFiltersExtendedProps = Omit<TableFiltersProps, "search" | "submitLabel" | "onSubmit"> & Pick<Partial<TableFiltersProps>, "search" | "submitLabel" | "onSubmit">;

export type TableFiltersComponentProps = TableFiltersProps | TableFiltersExtendedProps;

export function TableFilters({ search, inputs = [], selects = [], toggleGroup, submitLabel, onSubmit, showSubmit = true, disabled = false, reset, children, className, compact = false }: TableFiltersComponentProps) {
  return (
    <form className={[styles.filters, compact && styles.compact, className].filter(Boolean).join(" ")} onSubmit={(event) => { event.preventDefault(); onSubmit?.(event); }}>
      {search?.label ? (
        <label className={styles.fieldLabel}>
          <span>{search.label}</span>
          <input aria-label={search.ariaLabel} list={search.list?.id} maxLength={search.maxLength} placeholder={search.placeholder} value={search.value} disabled={disabled} onChange={(event) => search.onChange(event.target.value)} />
        </label>
      ) : search ? (
        <input aria-label={search.ariaLabel} list={search.list?.id} maxLength={search.maxLength} placeholder={search.placeholder} value={search.value} disabled={disabled} onChange={(event) => search.onChange(event.target.value)} />
      ) : null}
      {search?.list && <datalist id={search.list.id}>{search.list.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</datalist>}
      {inputs.map((input) => input.label ? (
        <label key={input.id} className={styles.fieldLabel}>
          <span>{input.label}</span>
          <input type={input.type} aria-label={input.ariaLabel} maxLength={input.maxLength} value={input.value} disabled={disabled} onChange={(event) => input.onChange(event.target.value)} />
        </label>
      ) : (
        <input key={input.id} type={input.type} aria-label={input.ariaLabel} maxLength={input.maxLength} value={input.value} disabled={disabled} onChange={(event) => input.onChange(event.target.value)} />
      ))}
      {toggleGroup && <SectionTabList role="group" aria-label={toggleGroup.ariaLabel}>
        {toggleGroup.options.map((option) => (
          <ButtonBar key={option.value} className={styles.toggle} data-filter-value={option.value} type="button" aria-pressed={toggleGroup.value === option.value} disabled={disabled} onClick={() => toggleGroup.onChange(option.value)}>
            <span>{option.label}</span>
            {option.count !== undefined && <span className={styles.toggleCount}>{option.count}</span>}
          </ButtonBar>
        ))}
      </SectionTabList>}
      {selects.map((select) => select.label ? (
        <label key={select.id} className={styles.fieldLabel}>
          <span>{select.label}</span>
          <select aria-label={select.ariaLabel} value={select.value} disabled={disabled} onChange={(event) => select.onChange(event.target.value)}>
            {select.options.map((option) => <option key={`${select.id}-${option.value}`} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      ) : (
        <select key={select.id} aria-label={select.ariaLabel} value={select.value} disabled={disabled} onChange={(event) => select.onChange(event.target.value)}>
          {select.options.map((option) => <option key={`${select.id}-${option.value}`} value={option.value}>{option.label}</option>)}
        </select>
      ))}
      {showSubmit && submitLabel && onSubmit ? <ButtonBar type="submit" disabled={disabled}>{submitLabel}</ButtonBar> : null}
      {children}
      {reset && <ButtonBar type="button" disabled={disabled} onClick={reset.onClick}>{reset.label}</ButtonBar>}
    </form>
  );
}
