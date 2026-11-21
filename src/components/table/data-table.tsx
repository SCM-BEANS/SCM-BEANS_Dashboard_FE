import { Children, cloneElement, isValidElement, type CSSProperties, type Key, type ReactNode, type TdHTMLAttributes } from "react";
import styles from "./data-table.module.css";

export type DataTableColumnKind = "code" | "name" | "date" | "amount" | "status" | "actions";

export type DataTableColumn<Row> = {
  key: string;
  header: ReactNode;
  align?: "left" | "center" | "right";
  kind?: DataTableColumnKind;
  width?: CSSProperties["width"];
  minWidth?: CSSProperties["minWidth"];
  noWrap?: boolean;
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
  minWidth?: CSSProperties["minWidth"];
  headers?: never;
  children?: never;
};

type DataTableChildrenProps = {
  headers: readonly ReactNode[];
  children?: ReactNode;
  emptyMessage?: ReactNode;
  minWidth?: CSSProperties["minWidth"];
  columns?: never;
  rows?: never;
  rowKey?: never;
};

type DataTableProps<Row> = DataTableRowsProps<Row> | DataTableChildrenProps;

function inferColumnKind(key: string, header: ReactNode): DataTableColumnKind | undefined {
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").toLowerCase();
  const label = normalize(typeof header === "string" ? header : "");
  const keyWords = normalize(key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[-_]/g, " "));
  const has = (value: string, pattern: RegExp) => pattern.test(value);
  const semanticName = (value: string) => (
    has(value, /\b(name|owner|customer|store|location|model|ten|khach hang|cua hang|dia diem)\b/)
    || (has(value, /\b(machine|may)\b/) && !has(value, /\b(type|loai)\s+(machine|may)\b|\b(machine|may)\s+(type|loai)\b/))
  );
  for (const [kind, pattern] of [
    ["actions", /\b(action|actions|thao tac|hanh dong)\b/],
    ["amount", /\b(amount|money|price|fee|total|refund|cups?|count|quantity|so ly|so luong|tien|gia|phi|doanh thu)\b/],
    ["date", /\b(date|time|deadline|created|updated|ngay|han|thoi gian|lich)\b/],
    ["status", /\b(status|state|trang thai|tinh trang)\b/],
    ["code", /\b(code|serial|reference|id|ma)\b/],
  ] as const) {
    if (has(label, pattern)) return kind;
  }
  if (semanticName(label)) return "name";
  for (const [kind, pattern] of [
    ["actions", /\b(action|actions|thao tac|hanh dong)\b/],
    ["amount", /\b(amount|money|price|fee|total|refund|cups?|count|quantity|so ly|so luong|tien|gia|phi|doanh thu)\b/],
    ["date", /\b(date|time|deadline|created|updated|ngay|han|thoi gian|lich)\b/],
    ["status", /\b(status|state|trang thai|tinh trang)\b/],
    ["code", /\b(code|serial|reference|id|ma)\b/],
  ] as const) {
    if (has(keyWords, pattern)) return kind;
  }
  if (semanticName(keyWords)) return "name";
  return undefined;
}

function inferredAlignment(kind: DataTableColumnKind | undefined) {
  return kind === "amount" || kind === "actions" ? "right" as const : undefined;
}

function columnAlignment(kind: DataTableColumnKind | undefined, explicit?: "left" | "center" | "right") {
  return inferredAlignment(kind) ?? explicit;
}

export function DataTable<Row>(props: DataTableProps<Row>) {
  const isRowsTable = "rows" in props && props.rows !== undefined;
  const headers: Array<{ key: string; content: ReactNode; kind?: DataTableColumnKind; align?: "left" | "center" | "right"; width?: CSSProperties["width"]; minWidth?: CSSProperties["minWidth"] }> = isRowsTable
    ? props.columns.map((column) => {
      const kind = column.kind ?? inferColumnKind(column.key, column.header);
      return { key: column.key, content: column.header, kind, align: columnAlignment(kind, column.align), width: column.width, minWidth: column.minWidth };
    })
    : props.headers.map((header, index) => {
      const kind = inferColumnKind(`column-${index}`, header);
      return { key: `column-${index}`, content: header, kind, align: inferredAlignment(kind) };
    });
  const body = isRowsTable
    ? props.rows.length > 0
      ? props.rows.map((row, index) => (
        <tr key={props.rowKey(row, index)} {...props.rowProps?.(row, index)}>
          {props.columns.map((column) => {
            const kind = column.kind ?? inferColumnKind(column.key, column.header);
            const style: CSSProperties = {
              ...(columnAlignment(kind, column.align) ? { textAlign: columnAlignment(kind, column.align) } : {}),
              ...(column.width ? { width: column.width } : {}),
              ...(column.minWidth ? { minWidth: column.minWidth } : {}),
              ...(column.noWrap ? { whiteSpace: "nowrap" as const } : {}),
            };
            return (
              <td key={column.key} data-column-kind={kind} {...column.cellProps?.(row, index)} style={style}>
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
      ? Children.map(props.children, (row) => {
        if (!isValidElement<{ children?: ReactNode }>(row) || row.type !== "tr") return row;
        let columnIndex = 0;
        return cloneElement(row, {
          children: Children.map(row.props.children, (cell) => {
            if (!isValidElement<Record<string, unknown>>(cell) || cell.type !== "td") return cell;
            const header = headers[columnIndex++];
            if (!header) return cell;
            return cloneElement(cell, {
              "data-column-kind": header.kind,
              style: { ...cell.props.style as CSSProperties, ...(header.align ? { textAlign: header.align } : {}) },
            } as Record<string, unknown>);
          }),
        });
      })
      : props.emptyMessage
        ? <tr><td colSpan={props.headers.length}>{props.emptyMessage}</td></tr>
        : null;

  return (
    <div className={styles.container}>
      <table className={styles.table} style={props.minWidth ? { minWidth: props.minWidth } : undefined}>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header.key} scope="col" data-column-kind={header.kind} style={{ ...(header.align ? { textAlign: header.align } : {}), ...(header.width ? { width: header.width } : {}), ...(header.minWidth ? { minWidth: header.minWidth } : {}) }}>{header.content}</th>
            ))}
          </tr>
        </thead>
        <tbody>{body}</tbody>
      </table>
    </div>
  );
}
