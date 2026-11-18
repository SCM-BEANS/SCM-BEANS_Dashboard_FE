import { Children, type Key, type ReactNode, type TdHTMLAttributes } from "react";
import styles from "./data-table.module.css";

export type DataTableColumn<Row> = {
  key: string;
  header: ReactNode;
  align?: "left" | "center" | "right";
  render: (row: Row, index: number) => ReactNode;
  cellProps?: (row: Row, index: number) => Pick<TdHTMLAttributes<HTMLTableCellElement>, "title">;
};

type DataTableRowProps = {
  [attribute: `data-${string}`]: string | undefined;
};

type DataTableRowsProps<Row> = {
  columns: readonly DataTableColumn<Row>[];
  rows: readonly Row[];
  rowKey: (row: Row, index: number) => Key;
  rowProps?: (row: Row, index: number) => DataTableRowProps;
  emptyMessage?: ReactNode;
  headers?: never;
  children?: never;
};

type DataTableChildrenProps = {
  headers: readonly ReactNode[];
  children?: ReactNode;
  emptyMessage?: ReactNode;
  columns?: never;
  rows?: never;
  rowKey?: never;
};

type DataTableProps<Row> = (DataTableRowsProps<Row> | DataTableChildrenProps) & {
  equalColumns?: boolean;
};

export function DataTable<Row>(props: DataTableProps<Row>) {
  const isRowsTable = "rows" in props && props.rows !== undefined;
  const headers: Array<{ key: string; content: ReactNode; align?: "left" | "center" | "right" }> = isRowsTable
    ? props.columns.map((column) => ({ key: column.key, content: column.header, align: column.align }))
    : props.headers.map((header, index) => ({ key: `column-${index}`, content: header }));
  const body = isRowsTable
    ? props.rows.length > 0
      ? props.rows.map((row, index) => (
        <tr key={props.rowKey(row, index)} {...props.rowProps?.(row, index)}>
          {props.columns.map((column) => (
            <td key={column.key} {...column.cellProps?.(row, index)} style={column.align ? { textAlign: column.align } : undefined}>
              {column.render(row, index)}
            </td>
          ))}
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
    <div className={styles.container}>
      <table className={props.equalColumns ? `${styles.table} ${styles.equalColumns}` : styles.table}>
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
