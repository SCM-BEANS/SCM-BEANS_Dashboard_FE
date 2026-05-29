"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Coffee,
  Activity,
  ShieldAlert,
  Trash2,
  Pencil,
  Plus,
  Search,
  ChevronDown,
  X,
  Check,
  AlertTriangle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface User {
  id: string;
  username: string;
  email: string;
  role: "admin" | "operator" | "viewer";
  status: "active" | "inactive";
  createdAt: string;
}

interface Device {
  id: string;
  name: string;
  model: string;
  location: string;
  status: "online" | "offline" | "maintenance";
  firmware: string;
  lastSync: string;
}

// ─── Mock helpers (replace with real API calls) ──────────────────────────────
const MOCK_USERS: User[] = [
  { id: "u1", username: "admin",   email: "admin@deercoffee.io",    role: "admin",    status: "active",   createdAt: "2025-01-10" },
  { id: "u2", username: "op_hanoi",email: "op1@deercoffee.io",      role: "operator", status: "active",   createdAt: "2025-02-14" },
  { id: "u3", username: "viewer_01",email:"view@deercoffee.io",     role: "viewer",   status: "active",   createdAt: "2025-03-01" },
  { id: "u4", username: "op_hcm",  email: "op2@deercoffee.io",      role: "operator", status: "inactive", createdAt: "2025-03-20" },
  { id: "u5", username: "tech_01", email: "tech@deercoffee.io",     role: "operator", status: "active",   createdAt: "2025-04-05" },
];

const MOCK_DEVICES: Device[] = [
  { id: "d1", name: "DEER_01", model: "La Marzocca GS3", location: "Hà Nội — Branch 1", status: "online",      firmware: "v2.1.4", lastSync: "12s ago" },
  { id: "d2", name: "DEER_02", model: "Nuova Simonelli",  location: "Hà Nội — Branch 2", status: "online",      firmware: "v2.1.4", lastSync: "28s ago" },
  { id: "d3", name: "DEER_03", model: "ECM Synchronika",  location: "HCM — Branch 1",    status: "maintenance", firmware: "v2.0.9", lastSync: "5m ago" },
  { id: "d4", name: "DEER_04", model: "Jura E8",          location: "HCM — Branch 2",    status: "offline",     firmware: "v1.8.2", lastSync: "2h ago" },
  { id: "d5", name: "DEER_05", model: "La Marzocca GS3", location: "Đà Nẵng — Branch 1",status: "online",      firmware: "v2.1.4", lastSync: "8s ago" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <div className="border border-outline p-5 bg-surface flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-on-surface-variant uppercase tracking-[0.15em]">{label}</span>
        <div className="text-primary">{icon}</div>
      </div>
      <div className="text-3xl font-bold text-on-surface tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-on-surface-variant font-mono">{sub}</div>}
    </div>
  );
}

function RoleBadge({ role }: { role: User["role"] }) {
  const styles: Record<User["role"], string> = {
    admin:    "bg-primary text-on-primary",
    operator: "bg-secondary-container text-secondary",
    viewer:   "border border-outline text-on-surface-variant",
  };
  return (
    <span className={`text-[10px] font-mono uppercase px-2 py-0.5 tracking-wider ${styles[role]}`}>
      {role}
    </span>
  );
}

function StatusDot({ status }: { status: Device["status"] | User["status"] }) {
  const map = {
    online:      "bg-primary",
    active:      "bg-primary",
    offline:     "border border-outline-variant",
    inactive:    "border border-outline-variant",
    maintenance: "bg-secondary",
  } as Record<string, string>;
  return <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${map[status] ?? ""}`} />;
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface border border-outline w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline">
          <span className="font-semibold text-on-surface text-sm uppercase tracking-widest font-mono">{title}</span>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ─── User Table ───────────────────────────────────────────────────────────────
function UserManagement() {
  const [users, setUsers]         = useState<User[]>(MOCK_USERS);
  const [search, setSearch]       = useState("");
  const [editUser, setEditUser]   = useState<User | null>(null);
  const [showAdd, setShowAdd]     = useState(false);
  const [newUser, setNewUser]     = useState({ username: "", email: "", role: "operator" as User["role"] });
  const [deleteId, setDeleteId]   = useState<string | null>(null);

  const filtered = users.filter(
    (u) =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = (id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
    setDeleteId(null);
  };

  const handleAdd = () => {
    if (!newUser.username || !newUser.email) return;
    setUsers((prev) => [
      ...prev,
      { id: `u${Date.now()}`, ...newUser, status: "active", createdAt: new Date().toISOString().slice(0, 10) },
    ]);
    setNewUser({ username: "", email: "", role: "operator" });
    setShowAdd(false);
  };

  const handleEditSave = () => {
    if (!editUser) return;
    setUsers((prev) => prev.map((u) => (u.id === editUser.id ? editUser : u)));
    setEditUser(null);
  };

  return (
    <div className="border border-outline bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-outline">
        <div className="flex items-center gap-3">
          <Users className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-on-surface uppercase tracking-widest font-mono">User Management</span>
          <span className="text-[10px] font-mono bg-primary text-on-primary px-1.5 py-0.5">{users.length}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative hidden sm:block">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-on-surface-variant" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="pl-6 pr-3 py-1.5 text-xs border border-outline bg-surface text-on-surface focus:outline-none focus:border-primary font-mono w-40"
            />
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 bg-primary text-on-primary px-3 py-1.5 text-xs font-mono uppercase hover:bg-primary-container transition-colors"
          >
            <Plus className="w-3 h-3" /> Add User
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-outline bg-surface-container">
              {["Username", "Email", "Role", "Status", "Created", "Actions"].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-mono uppercase tracking-[0.15em] text-on-surface-variant text-[10px]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-b border-outline/50 hover:bg-surface-container/50 transition-colors">
                <td className="px-4 py-3 font-mono text-on-surface font-medium">{u.username}</td>
                <td className="px-4 py-3 text-on-surface-variant">{u.email}</td>
                <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <StatusDot status={u.status} />
                    <span className="text-on-surface-variant capitalize">{u.status}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-on-surface-variant font-mono">{u.createdAt}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditUser({ ...u })}
                      className="p-1 text-on-surface-variant hover:text-primary transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteId(u.id)}
                      disabled={u.role === "admin"}
                      className="p-1 text-on-surface-variant hover:text-error transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title={u.role === "admin" ? "Cannot delete admin" : "Delete"}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-on-surface-variant text-sm font-mono">No users found.</div>
        )}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <Modal title="Add New User" onClose={() => setShowAdd(false)}>
          <div className="space-y-4">
            {([["username", "Username"], ["email", "Email"]] as const).map(([field, label]) => (
              <div key={field}>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-on-surface-variant mb-1">{label}</label>
                <input
                  type={field === "email" ? "email" : "text"}
                  value={newUser[field]}
                  onChange={(e) => setNewUser((p) => ({ ...p, [field]: e.target.value }))}
                  className="w-full px-3 py-2 border border-outline bg-surface text-on-surface text-sm focus:outline-none focus:border-primary font-mono"
                />
              </div>
            ))}
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-on-surface-variant mb-1">Role</label>
              <div className="relative">
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value as User["role"] }))}
                  className="w-full appearance-none px-3 py-2 border border-outline bg-surface text-on-surface text-sm focus:outline-none focus:border-primary font-mono pr-8"
                >
                  <option value="admin">Admin</option>
                  <option value="operator">Operator</option>
                  <option value="viewer">Viewer</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={handleAdd} className="flex-1 flex items-center justify-center gap-2 bg-primary text-on-primary py-2 text-sm font-mono uppercase hover:bg-primary-container transition-colors">
                <Check className="w-4 h-4" /> Create
              </button>
              <button onClick={() => setShowAdd(false)} className="flex-1 border border-outline py-2 text-sm font-mono uppercase text-on-surface hover:bg-surface-container transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Modal */}
      {editUser && (
        <Modal title="Edit User" onClose={() => setEditUser(null)}>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-on-surface-variant mb-1">Username</label>
              <input
                value={editUser.username}
                onChange={(e) => setEditUser((p) => p && ({ ...p, username: e.target.value }))}
                className="w-full px-3 py-2 border border-outline bg-surface text-on-surface text-sm focus:outline-none focus:border-primary font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-on-surface-variant mb-1">Role</label>
              <div className="relative">
                <select
                  value={editUser.role}
                  onChange={(e) => setEditUser((p) => p && ({ ...p, role: e.target.value as User["role"] }))}
                  className="w-full appearance-none px-3 py-2 border border-outline bg-surface text-on-surface text-sm focus:outline-none focus:border-primary font-mono pr-8"
                >
                  <option value="admin">Admin</option>
                  <option value="operator">Operator</option>
                  <option value="viewer">Viewer</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-on-surface-variant mb-1">Status</label>
              <div className="relative">
                <select
                  value={editUser.status}
                  onChange={(e) => setEditUser((p) => p && ({ ...p, status: e.target.value as User["status"] }))}
                  className="w-full appearance-none px-3 py-2 border border-outline bg-surface text-on-surface text-sm focus:outline-none focus:border-primary font-mono pr-8"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={handleEditSave} className="flex-1 flex items-center justify-center gap-2 bg-primary text-on-primary py-2 text-sm font-mono uppercase hover:bg-primary-container transition-colors">
                <Check className="w-4 h-4" /> Save
              </button>
              <button onClick={() => setEditUser(null)} className="flex-1 border border-outline py-2 text-sm font-mono uppercase text-on-surface hover:bg-surface-container transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirm Modal */}
      {deleteId && (
        <Modal title="Confirm Delete" onClose={() => setDeleteId(null)}>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 border border-error/30 bg-error/5">
              <AlertTriangle className="w-4 h-4 text-error flex-shrink-0 mt-0.5" />
              <p className="text-sm text-on-surface">
                This action cannot be undone. The user will permanently lose access.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleDelete(deleteId)} className="flex-1 bg-error text-on-error py-2 text-sm font-mono uppercase hover:opacity-90 transition-opacity">
                Delete
              </button>
              <button onClick={() => setDeleteId(null)} className="flex-1 border border-outline py-2 text-sm font-mono uppercase text-on-surface hover:bg-surface-container transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Device Table ─────────────────────────────────────────────────────────────
function DeviceManagement() {
  const [devices, setDevices]     = useState<Device[]>(MOCK_DEVICES);
  const [search, setSearch]       = useState("");
  const [editDevice, setEditDevice] = useState<Device | null>(null);
  const [deleteId, setDeleteId]   = useState<string | null>(null);

  const filtered = devices.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.location.toLowerCase().includes(search.toLowerCase()) ||
      d.model.toLowerCase().includes(search.toLowerCase())
  );

  const statusCls: Record<Device["status"], string> = {
    online:      "bg-primary text-on-primary",
    offline:     "border border-outline text-on-surface-variant",
    maintenance: "bg-secondary-container text-secondary",
  };

  return (
    <div className="border border-outline bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-outline">
        <div className="flex items-center gap-3">
          <Coffee className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-on-surface uppercase tracking-widest font-mono">IoT Device Registry</span>
          <span className="text-[10px] font-mono bg-primary text-on-primary px-1.5 py-0.5">{devices.length}</span>
        </div>
        <div className="relative hidden sm:block">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-on-surface-variant" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search devices..."
            className="pl-6 pr-3 py-1.5 text-xs border border-outline bg-surface text-on-surface focus:outline-none focus:border-primary font-mono w-48"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-outline bg-surface-container">
              {["Device ID", "Model", "Location", "Status", "Firmware", "Last Sync", "Actions"].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-mono uppercase tracking-[0.15em] text-on-surface-variant text-[10px]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <tr key={d.id} className="border-b border-outline/50 hover:bg-surface-container/50 transition-colors">
                <td className="px-4 py-3 font-mono font-bold text-on-surface">{d.name}</td>
                <td className="px-4 py-3 text-on-surface-variant">{d.model}</td>
                <td className="px-4 py-3 text-on-surface-variant">{d.location}</td>
                <td className="px-4 py-3">
                  <span className={`text-[9px] font-mono uppercase px-2 py-0.5 tracking-wider ${statusCls[d.status]}`}>
                    {d.status}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-on-surface-variant">{d.firmware}</td>
                <td className="px-4 py-3 text-on-surface-variant font-mono">{d.lastSync}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditDevice({ ...d })}
                      className="p-1 text-on-surface-variant hover:text-primary transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteId(d.id)}
                      className="p-1 text-on-surface-variant hover:text-error transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-on-surface-variant text-sm font-mono">No devices found.</div>
        )}
      </div>

      {/* Edit Device Modal */}
      {editDevice && (
        <Modal title="Edit Device" onClose={() => setEditDevice(null)}>
          <div className="space-y-4">
            {(["name", "model", "location", "firmware"] as const).map((field) => (
              <div key={field}>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-on-surface-variant mb-1">{field}</label>
                <input
                  value={editDevice[field]}
                  onChange={(e) => setEditDevice((p) => p && ({ ...p, [field]: e.target.value }))}
                  className="w-full px-3 py-2 border border-outline bg-surface text-on-surface text-sm focus:outline-none focus:border-primary font-mono"
                />
              </div>
            ))}
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-on-surface-variant mb-1">Status</label>
              <div className="relative">
                <select
                  value={editDevice.status}
                  onChange={(e) => setEditDevice((p) => p && ({ ...p, status: e.target.value as Device["status"] }))}
                  className="w-full appearance-none px-3 py-2 border border-outline bg-surface text-on-surface text-sm focus:outline-none focus:border-primary font-mono pr-8"
                >
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                  <option value="maintenance">Maintenance</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setDevices((prev) => prev.map((d) => d.id === editDevice.id ? editDevice : d));
                  setEditDevice(null);
                }}
                className="flex-1 flex items-center justify-center gap-2 bg-primary text-on-primary py-2 text-sm font-mono uppercase hover:bg-primary-container transition-colors"
              >
                <Check className="w-4 h-4" /> Save
              </button>
              <button onClick={() => setEditDevice(null)} className="flex-1 border border-outline py-2 text-sm font-mono uppercase text-on-surface hover:bg-surface-container transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <Modal title="Remove Device" onClose={() => setDeleteId(null)}>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 border border-error/30 bg-error/5">
              <AlertTriangle className="w-4 h-4 text-error flex-shrink-0 mt-0.5" />
              <p className="text-sm text-on-surface">
                This will remove the device from the registry. The physical device will not be affected.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setDevices((p) => p.filter((d) => d.id !== deleteId)); setDeleteId(null); }}
                className="flex-1 bg-error text-on-error py-2 text-sm font-mono uppercase hover:opacity-90 transition-opacity"
              >
                Remove
              </button>
              <button onClick={() => setDeleteId(null)} className="flex-1 border border-outline py-2 text-sm font-mono uppercase text-on-surface hover:bg-surface-container transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"users" | "devices">("users");
  const [currentUser, setCurrentUser] = useState<string>("admin");

  useEffect(() => {
    const stored = localStorage.getItem("username");
    if (stored) setCurrentUser(stored);
  }, []);

  const onlineDevices = MOCK_DEVICES.filter((d) => d.status === "online").length;
  const activeUsers   = MOCK_USERS.filter((u) => u.status === "active").length;

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-16">

      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-2 border-outline pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="w-5 h-5 text-primary" />
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-on-surface-variant">Admin Console</span>
          </div>
          <h1 className="text-4xl font-bold uppercase tracking-tighter text-primary">Administration</h1>
          <p className="text-sm text-on-surface-variant mt-1 font-mono">
            Logged in as <strong>{currentUser}</strong> · Full system access
          </p>
        </div>
        <div className="mt-4 md:mt-0 text-xs font-mono text-on-surface-variant uppercase text-right">
          <div>Deer Coffee IoT Platform</div>
          <div className="text-primary font-semibold">SCM-BEANS v2.1</div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Users className="w-4 h-4" />}    label="Total Users"      value={MOCK_USERS.length}   sub={`${activeUsers} active`} />
        <StatCard icon={<Coffee className="w-4 h-4" />}   label="Registered Devices" value={MOCK_DEVICES.length} sub={`${onlineDevices} online`} />
        <StatCard icon={<Activity className="w-4 h-4" />} label="Uptime"            value="99.7%"               sub="30-day average" />
        <StatCard icon={<ShieldAlert className="w-4 h-4" />} label="Active Alerts"  value={3}                   sub="Pending review" />
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b-2 border-outline">
        {([
          { key: "users",   label: "User Management",   icon: Users  },
          { key: "devices", label: "IoT Device Registry", icon: Coffee },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-mono uppercase tracking-wider border-b-2 -mb-0.5 transition-colors ${
              activeTab === key
                ? "border-primary text-primary font-bold"
                : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "users"   && <UserManagement />}
      {activeTab === "devices" && <DeviceManagement />}
    </div>
  );
}
