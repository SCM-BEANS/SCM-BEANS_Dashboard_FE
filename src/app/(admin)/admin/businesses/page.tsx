import React from "react";
import { Store, Plus, Search, MoreHorizontal } from "lucide-react";

export default function AdminBusinessesPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-mono tracking-tighter uppercase text-primary">
            Manage Businesses
          </h1>
          <p className="text-on-surface-variant font-mono text-sm mt-1 uppercase">
            System-wide business administration
          </p>
        </div>
        <button className="bg-primary text-on-primary hover:bg-primary/90 px-4 py-2 font-mono uppercase text-sm font-bold flex items-center gap-2 transition-colors border-2 border-primary">
          <Plus className="w-4 h-4" />
          Add Business
        </button>
      </header>

      <div className="bg-surface-container border-2 border-outline p-4 flex gap-4">
        <div className="flex-1 relative">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="text"
            placeholder="Search businesses..."
            className="w-full bg-surface border-2 border-outline pl-10 pr-4 py-2 font-mono text-sm focus:outline-none focus:border-primary transition-colors text-on-surface"
          />
        </div>
      </div>

      <div className="bg-surface border-2 border-outline overflow-hidden">
        <table className="w-full text-left font-mono text-sm">
          <thead className="bg-surface-container border-b-2 border-outline text-on-surface-variant uppercase">
            <tr>
              <th className="px-4 py-3 font-semibold">Business Name</th>
              <th className="px-4 py-3 font-semibold">Owner</th>
              <th className="px-4 py-3 font-semibold">Location</th>
              <th className="px-4 py-3 font-semibold">Machines</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-outline">
            {/* Mock Data */}
            <tr className="hover:bg-surface-container transition-colors">
              <td className="px-4 py-4 flex items-center gap-3">
                <div className="w-8 h-8 bg-primary/20 text-primary flex items-center justify-center border border-primary">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-on-surface">Central Cafe</p>
                  <p className="text-xs text-on-surface-variant">ID: BUS-001</p>
                </div>
              </td>
              <td className="px-4 py-4 text-on-surface">John Doe</td>
              <td className="px-4 py-4 text-on-surface">New York, NY</td>
              <td className="px-4 py-4">
                <span className="bg-tertiary/20 text-tertiary px-2 py-1 text-xs border border-tertiary">
                  3 Active
                </span>
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
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-on-surface">Roast Masters</p>
                  <p className="text-xs text-on-surface-variant">ID: BUS-002</p>
                </div>
              </td>
              <td className="px-4 py-4 text-on-surface">Jane Smith</td>
              <td className="px-4 py-4 text-on-surface">Seattle, WA</td>
              <td className="px-4 py-4">
                <span className="bg-tertiary/20 text-tertiary px-2 py-1 text-xs border border-tertiary">
                  12 Active
                </span>
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
