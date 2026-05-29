import React from "react";
import { Store, Plus, MapPin, MoreHorizontal } from "lucide-react";

export default function UserBusinessesPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-mono tracking-tighter uppercase text-primary">
            My Businesses
          </h1>
          <p className="text-on-surface-variant font-mono text-sm mt-1 uppercase">
            Manage your coffee shops and locations
          </p>
        </div>
        <button className="bg-primary text-on-primary hover:bg-primary/90 px-4 py-2 font-mono uppercase text-sm font-bold flex items-center gap-2 transition-colors border-2 border-primary">
          <Plus className="w-4 h-4" />
          Add Location
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Mock Business Card 1 */}
        <div className="bg-surface border-2 border-outline p-6 hover:border-primary transition-colors group">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-primary/20 text-primary flex items-center justify-center border border-primary">
              <Store className="w-6 h-6" />
            </div>
            <button className="text-on-surface-variant hover:text-primary transition-colors">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
          <h3 className="font-bold text-xl font-mono uppercase text-on-surface mb-2">Downtown Roasters</h3>
          <div className="flex items-center gap-2 text-sm text-on-surface-variant font-mono mb-4">
            <MapPin className="w-4 h-4" />
            <span>123 Main St, NY</span>
          </div>
          <div className="pt-4 border-t-2 border-outline flex justify-between items-center">
            <span className="text-xs uppercase font-mono text-on-surface-variant">Active Machines</span>
            <span className="font-bold font-mono text-primary text-lg">2</span>
          </div>
        </div>

        {/* Mock Business Card 2 */}
        <div className="bg-surface border-2 border-outline p-6 hover:border-primary transition-colors group">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-primary/20 text-primary flex items-center justify-center border border-primary">
              <Store className="w-6 h-6" />
            </div>
            <button className="text-on-surface-variant hover:text-primary transition-colors">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
          <h3 className="font-bold text-xl font-mono uppercase text-on-surface mb-2">Westside Cafe</h3>
          <div className="flex items-center gap-2 text-sm text-on-surface-variant font-mono mb-4">
            <MapPin className="w-4 h-4" />
            <span>456 West Ave, NY</span>
          </div>
          <div className="pt-4 border-t-2 border-outline flex justify-between items-center">
            <span className="text-xs uppercase font-mono text-on-surface-variant">Active Machines</span>
            <span className="font-bold font-mono text-primary text-lg">1</span>
          </div>
        </div>
      </div>
    </div>
  );
}
