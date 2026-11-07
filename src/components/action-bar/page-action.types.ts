export interface PageAction {
  id: string;
  label: string;
  variant?: "primary" | "secondary" | "danger";
  priority?: number;
  onClick?: () => void;
  href?: string;
  type?: "button" | "submit";
  form?: string;
  disabled?: boolean;
  disabledReason?: string;
  describedBy?: string;
  pending?: boolean;
  pendingLabel?: string;
  confirm?: { title: string; description: string; confirmLabel: string };
}
