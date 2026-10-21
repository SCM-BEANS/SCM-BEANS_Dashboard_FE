import type { ReactNode } from "react";

export type MachineKind = "smart" | "standard";

export type MachineStatusTone = "green" | "amber" | "neutral" | "plain";

export type MachineStatusPresentation = {
  label: string;
  tone: MachineStatusTone;
};

/** Presentation data only. Keep route/API identifiers outside this model. */
export type MachineDisplayModel = {
  displayId: string;
  kind: MachineKind;
  typeLabel: string;
  serial?: string;
  status?: MachineStatusPresentation;
};

export function MachineIdentityLabel({
  machine,
  arrow = false,
  className = "",
}: {
  machine: Pick<MachineDisplayModel, "displayId" | "serial">;
  arrow?: boolean;
  className?: string;
}) {
  return (
    <span className={className}>
      {machine.displayId}{machine.serial ? ` / ${machine.serial}` : ""}{arrow ? " ›" : ""}
    </span>
  );
}

export function MachineTypeLabel({
  machine,
  className = "",
}: {
  machine: Pick<MachineDisplayModel, "kind" | "typeLabel">;
  className?: string;
}) {
  return <span className={className} data-machine-kind={machine.kind}>{machine.typeLabel}</span>;
}

const STATUS_TONE_CLASS: Record<Exclude<MachineStatusTone, "plain">, string> = {
  green: "bg-[#ECF6EF] text-[#2F7658]",
  amber: "bg-[#FFF2E6] text-[#9B672E]",
  neutral: "bg-[#F7F5F3] text-[#706561]",
};

export function MachineStatusLabel({
  status,
  className = "",
}: {
  status?: MachineStatusPresentation;
  className?: string;
}) {
  if (!status) return null;
  if (status.tone === "plain") return <span className={className}>{status.label}</span>;

  return (
    <span className={`inline-flex max-w-max items-center rounded-full px-2.5 py-1 text-xs ${STATUS_TONE_CLASS[status.tone]} ${className}`}>
      {status.label}
    </span>
  );
}

export function MachineDetailField({
  label,
  value,
  layout = "standard",
}: {
  label: string;
  value: ReactNode;
  layout?: "standard" | "compact";
}) {
  if (layout === "compact") {
    return (
      <div>
        <p className="text-[13px] text-[#706561]">{label}</p>
        <p className="mt-1 text-sm font-semibold">{value}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[46px] flex-col gap-1">
      <span className="text-[13px] leading-[19px] text-[#706561]">{label}</span>
      <strong className="text-sm font-semibold leading-[21px] text-[#302927]">{value}</strong>
    </div>
  );
}
