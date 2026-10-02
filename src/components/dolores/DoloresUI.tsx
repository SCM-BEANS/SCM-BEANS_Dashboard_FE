import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export type DoloresIcon =
  | "activity"
  | "bell"
  | "chart-column"
  | "clipboard-check"
  | "coffee"
  | "file-text"
  | "layout-dashboard"
  | "package"
  | "store"
  | "users"
  | "utensils"
  | "wrench";

export function DoloresIconView({ icon, className = "h-5 w-5" }: { icon: DoloresIcon; className?: string }) {
  return <Image src={"/images/dolores-icons/" + icon + ".svg"} alt="" width={20} height={20} className={className} />;
}

export function DoloresButton({
  children,
  href,
  variant = "primary",
  onClick,
  disabled,
  type = "button",
}: {
  children: ReactNode;
  href?: string;
  variant?: "primary" | "secondary";
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const className =
    "inline-flex h-12 shrink-0 items-center justify-center rounded-[10px] px-4 py-3 text-sm font-medium transition-opacity " +
    (variant === "primary"
      ? "bg-[#B81724] text-white hover:opacity-[0.88] active:opacity-[0.72] disabled:cursor-not-allowed disabled:opacity-[0.38]"
      : "border border-[#E9E2DC] bg-white text-[#302927] hover:opacity-[0.88] active:opacity-[0.72] disabled:cursor-not-allowed disabled:opacity-[0.38]");

  if (href) {
    return (
      <Link className={className} href={href} aria-disabled={disabled}>
        {children}
      </Link>
    );
  }

  return (
    <button className={className} type={type} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function DoloresPanel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={"rounded-2xl border border-[#E9E2DC] bg-white px-6 py-[22px] " + className}>{children}</section>;
}

export function DoloresPanelTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-4 text-lg font-semibold leading-[1.45] text-[#302927]">{children}</h2>;
}

export function DoloresNotice({
  title,
  children,
  tone = "info",
}: {
  title: string;
  children: ReactNode;
  tone?: "info" | "warning" | "success";
}) {
  const toneClass =
    tone === "warning" ? "bg-[#FFF2E6]" : tone === "success" ? "bg-[#ECF6EF]" : "bg-[#F9E9EA]";
  return (
    <aside className={"flex flex-col gap-2 rounded-[10px] p-4 text-sm leading-normal text-[#302927] " + toneClass}>
      <p className="font-medium">{title}</p>
      <p>{children}</p>
    </aside>
  );
}

export function DoloresField({
  label,
  value,
  required,
  className = "",
  children,
}: {
  label: string;
  value?: string;
  required?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <label className={"flex min-h-20 flex-col justify-center gap-[5px] rounded-[10px] border border-[#E9E2DC] bg-white px-4 py-3 " + className}>
      <span className="text-xs text-[#706561]">
        {label}{required ? " *" : ""}
      </span>
      {children ?? <span className="text-sm text-[#302927]">{value}</span>}
    </label>
  );
}

export function DoloresFieldGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-4">{children}</div>;
}

export function DoloresTable({
  headers,
  rows,
  className = "",
}: {
  headers: string[];
  rows: ReactNode[][];
  className?: string;
}) {
  return (
    <div className={"w-full overflow-x-auto " + className}>
      <table className="w-full min-w-[720px] border-separate border-spacing-y-[10px] text-left text-sm text-[#302927]">
        <thead>
          <tr className="h-12 bg-[#F7F5F3] text-[13px] font-semibold text-[#706561]">
            {headers.map((header) => (
              <th className="px-2 font-medium" key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr className="h-[60px]" key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td className="border-y border-[#F0ECE8] px-2 first:border-l last:border-r first:rounded-l-sm last:rounded-r-sm" key={cellIndex}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DoloresMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-[99px] flex-col gap-1.5 px-3 py-[18px]">
      <p className="text-[13px] leading-[19px] text-[#706561]">{label}</p>
      <p className="text-[26px] font-semibold leading-[38px] text-[#302927]">{value}</p>
    </div>
  );
}

export function DoloresStatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-[99px] flex-col gap-1.5 rounded-[14px] bg-white px-5 py-[18px]">
      <p className="text-[13px] leading-[19px] text-[#706561]">{label}</p>
      <p className="text-[26px] font-semibold leading-[38px] text-[#302927]">{value}</p>
    </div>
  );
}
