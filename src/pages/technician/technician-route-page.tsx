import { TechnicianShell } from "./technician-shell";
import { TechnicianScreen, type TechnicianScreenDescriptor } from "./technician-screen";

export function TechnicianRoutePage({ screen }: { screen: TechnicianScreenDescriptor }) {
  return (
    <TechnicianShell pageTitle={screen.title}>
      <TechnicianScreen screen={screen} />
    </TechnicianShell>
  );
}
