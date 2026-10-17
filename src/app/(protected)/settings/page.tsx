import { redirect } from 'next/navigation';
import { PATH_SETTINGS } from "@/routes/path";

export default function SettingsPage() {
  redirect(PATH_SETTINGS.security);
}
