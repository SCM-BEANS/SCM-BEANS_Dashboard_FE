import { AssemblyExplorer } from "@/components/3d/AssemblyExplorer";

export default function AssemblyPage() {
  return (
    <div className="h-full p-4 md:p-8">
      <div className="mb-6 border-b-2 border-outline pb-4">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-secondary">3D model validation</p>
        <h1 className="mt-2 font-mono text-3xl font-bold uppercase tracking-tight text-primary">Compressor assembly</h1>
        <p className="mt-2 max-w-3xl text-sm text-on-surface-variant">
          Native SOLIDWORKS assembly geometry: 19 parts share the exact component names used by the exported mate data.
        </p>
      </div>

      <AssemblyExplorer />
    </div>
  );
}
