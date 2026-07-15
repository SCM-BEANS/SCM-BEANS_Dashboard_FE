
import { Coffee, Plus, Search, MoreHorizontal } from "lucide-react";

export default function AdminMachinesPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-mono tracking-tighter uppercase text-primary">
            Manage Machines
          </h1>
          <p className="text-on-surface-variant font-mono text-sm mt-1 uppercase">
            System-wide coffee machine administration
          </p>
        </div>
        <button className="bg-primary text-on-primary hover:bg-primary/90 px-4 py-2 font-mono uppercase text-sm font-bold flex items-center gap-2 transition-colors border-2 border-primary">
          <Plus className="w-4 h-4" />
          Register Machine
        </button>
      </header>

      <div className="bg-surface-container border-2 border-outline p-4 flex gap-4">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="text"
            placeholder="Search machines by serial number..."
            className="w-full bg-surface border-2 border-outline pl-10 pr-4 py-2 font-mono text-sm focus:outline-none focus:border-primary transition-colors text-on-surface"
          />
        </div>
      </div>

      <div className="bg-surface border-2 border-outline overflow-hidden">
        <table className="w-full text-left font-mono text-sm">
          <thead className="bg-surface-container border-b-2 border-outline text-on-surface-variant uppercase">
            <tr>
              <th className="px-4 py-3 font-semibold">Machine Model</th>
              <th className="px-4 py-3 font-semibold">Owner / Business</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Last Maintenance</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-outline">
            {/* Mock Data */}
            <tr className="hover:bg-surface-container transition-colors">
              <td className="px-4 py-4 flex items-center gap-3">
                <div className="w-8 h-8 bg-primary/20 text-primary flex items-center justify-center border border-primary">
                  <Coffee className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-on-surface">Zenith Brew Pro</p>
                  <p className="text-xs text-on-surface-variant">SN: ZBP-00982</p>
                </div>
              </td>
              <td className="px-4 py-4">
                <p className="font-bold text-on-surface">John Doe</p>
                <p className="text-xs text-on-surface-variant">Central Cafe</p>
              </td>
              <td className="px-4 py-4">
                <span className="bg-tertiary/20 text-tertiary px-2 py-1 text-xs border border-tertiary">
                  Online
                </span>
              </td>
              <td className="px-4 py-4 text-on-surface">2026-05-10</td>
              <td className="px-4 py-4 text-right">
                <button className="p-2 hover:bg-outline text-on-surface-variant hover:text-primary transition-colors">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </td>
            </tr>
            <tr className="hover:bg-surface-container transition-colors">
              <td className="px-4 py-4 flex items-center gap-3">
                <div className="w-8 h-8 bg-primary/20 text-primary flex items-center justify-center border border-primary">
                  <Coffee className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-on-surface">Zenith Brew Lite</p>
                  <p className="text-xs text-on-surface-variant">SN: ZBL-00431</p>
                </div>
              </td>
              <td className="px-4 py-4">
                <p className="font-bold text-on-surface">Jane Smith</p>
                <p className="text-xs text-on-surface-variant">Roast Masters</p>
              </td>
              <td className="px-4 py-4">
                <span className="bg-error/20 text-error px-2 py-1 text-xs border border-error">
                  Offline
                </span>
              </td>
              <td className="px-4 py-4 text-on-surface">2026-04-22</td>
              <td className="px-4 py-4 text-right">
                <button className="p-2 hover:bg-outline text-on-surface-variant hover:text-primary transition-colors">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
