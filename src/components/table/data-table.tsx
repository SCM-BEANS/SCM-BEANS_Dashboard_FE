import { Children, type CSSProperties, type Key, type ReactNode, type TdHTMLAttributes } from "react";
import styles from "./data-table.module.css";

export type DataTableColumn<Row> = {
  key: string;
  header: ReactNode;
  align?: "left" | "center" | "right";
  render: (row: Row, index: number) => ReactNode;
  cellProps?: (row: Row, index: number) => TdHTMLAttributes<HTMLTableCellElement>;
};

type DataTableBaseProps = {
  variant?: "operations" | "accounts" | "standard" | "moderator" | "customer";
  headerVariant?: "admin";
  className?: string;
  style?: CSSProperties;
};

type DataTableRowsProps<Row> = DataTableBaseProps & {
  columns: readonly DataTableColumn<Row>[];
  rows: readonly Row[];
  rowKey: (row: Row, index: number) => Key;
  emptyMessage?: ReactNode;
  headers?: never;
  children?: never;
  minWidth?: never;
};

type DataTableChildrenProps = DataTableBaseProps & {
  headers: readonly ReactNode[];
  children?: ReactNode;
  emptyMessage?: ReactNode;
  minWidth?: number;
  columns?: never;
  rows?: never;
  rowKey?: never;
};

type DataTableProps<Row> = DataTableRowsProps<Row> | DataTableChildrenProps;

export function DataTable<Row>(props: DataTableProps<Row>) {
  const variant = props.variant ?? "operations";
  const containerClassName = [
    styles.container,
    variant === "moderator" ? styles.moderatorContainer : undefined,
    props.className,
  ].filter(Boolean).join(" ");
  const variantClassName = {
    operations: styles.operations,
    accounts: styles.accounts,
    standard: styles.standard,
    moderator: styles.moderator,
    customer: styles.customer,
  }[variant];
  const tableClassName = [
    styles.table,
    variantClassName,
    props.headerVariant === "admin" ? styles.adminHeader : undefined,
  ].filter(Boolean).join(" ");
  const tableStyle = {
    ...props.style,
    ...(props.minWidth ? { minWidth: props.minWidth } : {}),
  };
  const isRowsTable = "rows" in props && props.rows !== undefined;
  const headers: Array<{ key: string; content: ReactNode; align?: "left" | "center" | "right" }> = isRowsTable
    ? props.columns.map((column) => ({ key: column.key, content: column.header, align: column.align }))
    : props.headers.map((header, index) => ({ key: `column-${index}`, content: header }));
  const body = isRowsTable
    ? props.rows.length > 0
      ? props.rows.map((row, index) => (
        <tr key={props.rowKey(row, index)}>
          {props.columns.map((column) => {
            const cellProps = column.cellProps?.(row, index);
            const cellStyle = column.align
              ? { ...cellProps?.style, textAlign: column.align }
              : cellProps?.style;
            return (
              <td key={column.key} {...cellProps} style={cellStyle}>
                {column.render(row, index)}
              </td>
            );
          })}
        </tr>
      ))
      : props.emptyMessage
        ? <tr><td colSpan={props.columns.length}>{props.emptyMessage}</td></tr>
        : null
    : Children.count(props.children) > 0
      ? props.children
      : props.emptyMessage
        ? <tr><td colSpan={props.headers.length}>{props.emptyMessage}</td></tr>
        : null;

  return (
    <div className={containerClassName}>
      <table className={tableClassName} style={tableStyle}>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header.key} scope="col" style={header.align ? { textAlign: header.align } : undefined}>{header.content}</th>
            ))}
          </tr>
        </thead>
        <tbody>{body}</tbody>
      </table>
    </div>
  );
}
