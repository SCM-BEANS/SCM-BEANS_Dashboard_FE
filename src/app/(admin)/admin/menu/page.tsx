import AdminMenuScreens, { type AdminMenuView } from "@/components/dolores/AdminMenuScreens";

const MENU_VIEWS: AdminMenuView[] = ["list", "items", "add", "missing", "ingredients", "edit-espresso", "edit-espresso-60", "edit-espresso-20g", "send", "sent"];

export default async function AdminMenuPage({ searchParams }: { searchParams: Promise<{ view?: string; machine?: string }> }) {
  const { view, machine } = await searchParams;
  const initialView = MENU_VIEWS.find((candidate) => candidate === view) ?? (machine === "S-018" ? "items" : "list");
  return <AdminMenuScreens initialView={initialView} />;
}
