
import { Coffee, Plus, Store, Activity, MoreHorizontal } from "lucide-react";

export default function UserMachinesPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-mono tracking-tighter uppercase text-primary">
            My Machines
          </h1>
          <p className="text-on-surface-variant font-mono text-sm mt-1 uppercase">
            Monitor and manage your coffee machines
          </p>
        </div>
        <button className="bg-primary text-on-primary hover:bg-primary/90 px-4 py-2 font-mono uppercase text-sm font-bold flex items-center gap-2 transition-colors border-2 border-primary">
          <Plus className="w-4 h-4" />
          Pair New Machine
        </button>
      </header>

      <div className="bg-surface border-2 border-outline overflow-hidden">
        <table className="w-full text-left font-mono text-sm">
          <thead className="bg-surface-container border-b-2 border-outline text-on-surface-variant uppercase">
            <tr>
              <th className="px-4 py-3 font-semibold">Machine</th>
              <th className="px-4 py-3 font-semibold">Location</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Today's Brews</th>
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
                <div className="flex items-center gap-2 text-on-surface">
                  <Store className="w-4 h-4 text-on-surface-variant" />
                  <span>Downtown Roasters</span>
                </div>
              </td>
              <td className="px-4 py-4">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
                  <span className="text-tertiary font-bold">Online</span>
                </span>
              </td>
              <td className="px-4 py-4">
                <div className="flex items-center gap-2 text-on-surface">
                  <Activity className="w-4 h-4 text-on-surface-variant" />
                  <span>142 cups</span>
                </div>
              </td>
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
                  <p className="font-bold text-on-surface">Zenith Brew Pro</p>
                  <p className="text-xs text-on-surface-variant">SN: ZBP-01045</p>
                </div>
              </td>
              <td className="px-4 py-4">
                <div className="flex items-center gap-2 text-on-surface">
                  <Store className="w-4 h-4 text-on-surface-variant" />
                  <span>Downtown Roasters</span>
                </div>
              </td>
              <td className="px-4 py-4">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-warning animate-pulse"></span>
                  <span className="text-warning font-bold">Maintenance Needed</span>
                </span>
              </td>
              <td className="px-4 py-4">
                <div className="flex items-center gap-2 text-on-surface">
                  <Activity className="w-4 h-4 text-on-surface-variant" />
                  <span>89 cups</span>
                </div>
              </td>
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
