import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 relative w-full md:pl-64">
        {/* Admin badge in header area */}
        <div className="flex items-center h-8 px-4 md:px-6 bg-[#111] text-white">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em]">
            ⬡ Admin Console — Restricted Access
          </span>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span className="text-[10px] font-mono text-white/60 uppercase">Privileged Session</span>
          </div>
        </div>
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-10 dashboard-bg">
          {children}
        </main>
      </div>
    </div>
  );
}
