import { notFound } from "next/navigation";
import PrototypeApp from "@/components/PrototypeApp";
import { DemoStoreProvider } from "@/lib/demo-store";
import { resolvePage, type Role } from "@/lib/prototype";

const roles: Role[] = ["admin", "moderator", "technician", "customer"];

export default async function WorkspacePage({ params }: { params: Promise<{ role: string; segments?: string[] }> }) {
  const { role: roleParam, segments = [] } = await params;
  if (!roles.includes(roleParam as Role)) notFound();
  const role = roleParam as Role;
  const page = resolvePage(role, segments);
  if (!page) notFound();
  return <DemoStoreProvider><PrototypeApp role={role} segments={segments} page={page} /></DemoStoreProvider>;
}
