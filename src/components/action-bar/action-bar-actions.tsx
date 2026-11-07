export interface ActionBarAction {
  label: string;
  href?: string;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  describedBy?: string;
}
