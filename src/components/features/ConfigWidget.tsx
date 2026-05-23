import { CloudCog, FileEdit, Users } from "lucide-react";

export const ConfigWidget = () => {
  return (
    <section className="flex flex-col gap-4 opacity-50 grayscale select-none pointer-events-none">
      <div className="flex justify-between items-center border-b-2 border-outline pb-2">
        <div className="text-xl font-bold uppercase text-primary">System Configuration</div>
        <span className="font-mono text-xs border border-primary px-2 py-1 bg-surface-variant text-on-surface">Coming Soon</span>
      </div>
      <div className="bento-border p-0 flex flex-col bg-surface-container-lowest">
        <div className="flex items-center p-4 border-b border-outline gap-3">
          <CloudCog className="w-5 h-5 text-primary" />
          <span className="font-mono text-sm uppercase">Digital Menu Sync</span>
        </div>
        <div className="flex items-center p-4 border-b border-outline gap-3">
          <FileEdit className="w-5 h-5 text-primary" />
          <span className="font-mono text-sm uppercase">Recipe &amp; Dosage Editor</span>
        </div>
        <div className="flex items-center p-4 gap-3">
          <Users className="w-5 h-5 text-primary" />
          <span className="font-mono text-sm uppercase">Barista Login</span>
        </div>
      </div>
    </section>
  );
};
