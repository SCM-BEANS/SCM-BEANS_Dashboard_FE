import { ButtonBar } from "@/components/button/button-bar";

export interface ActionBarAction {
  label: string;
  href?: string;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  describedBy?: string;
}

export function ActionBarActions({ actions }: { actions: readonly ActionBarAction[] }) {
  return actions.map((action) => {
    const key = `${action.href ?? "action"}:${action.label}`;
    const commonProps = {
      "aria-describedby": action.describedBy,
      "data-variant": action.variant ?? "primary",
    };

    if (action.href && !action.disabled) {
      return <ButtonBar {...commonProps} href={action.href} key={key}>{action.label}</ButtonBar>;
    }

    return <ButtonBar {...commonProps} disabled key={key}>{action.label}</ButtonBar>;
  });
}
