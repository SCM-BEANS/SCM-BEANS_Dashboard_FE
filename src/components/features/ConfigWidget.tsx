import { CloudCog, FileEdit } from "lucide-react";
import { useI18nStore } from "@/store/useI18nStore";

export const ConfigWidget = () => {
  const { t } = useI18nStore();
  return (
    <section className="flex flex-col gap-4 opacity-50 grayscale select-none pointer-events-none">
      <div className="flex justify-between items-center border-b-2 border-outline pb-2">
        <div className="text-xl font-bold uppercase text-primary">{t("system_configuration")}</div>
        <span className="font-mono text-xs border border-primary px-2 py-1 bg-surface-variant text-on-surface">{t("coming_soon")}</span>
      </div>
      <div className="bento-border p-0 flex flex-col bg-surface-container-lowest">
        <div className="flex items-center p-4 border-b border-outline gap-3">
          <CloudCog className="w-5 h-5 text-primary" />
          <span className="font-mono text-sm uppercase">{t("digital_menu_sync")}</span>
        </div>
        <div className="flex items-center p-4 border-b border-outline gap-3">
          <FileEdit className="w-5 h-5 text-primary" />
          <span className="font-mono text-sm uppercase">{t("recipe_dosage_editor")}</span>
        </div>
      </div>
    </section>
  );
};
