import { cookies } from "next/headers";
import { redirect } from "next/navigation";


async function getUsers(token: string) {
  try {
    const res = await fetch("https://supremacy-revision-hypertext.ngrok-free.dev/api/User", {
      headers: {
        "Authorization": `Bearer ${token}`,
        "ngrok-skip-browser-warning": "true"
      },
      cache: 'no-store'
    });
    if (!res.ok) return null;
    return res.json();
  } catch (error) {
    return null;
  }
}

export default async function UsersPage() {
  const cookieStore = cookies();
  const tokenCookie = cookieStore.get("token");

  // Demo data for when not logged in
  if (!tokenCookie || !tokenCookie.value) {
    const demoUsers = [
      { id: "demo-01", username: "demo_admin", email: "admin@demo.deercoffee.io", role: "admin", createdAt: new Date().toISOString() },
      { id: "demo-02", username: "demo_operator", email: "operator@demo.deercoffee.io", role: "operator", createdAt: new Date().toISOString() },
      { id: "demo-03", username: "demo_viewer", email: "viewer@demo.deercoffee.io", role: "viewer", createdAt: new Date().toISOString() },
    ];
    return (
      <div className="flex flex-col max-w-7xl mx-auto gap-8 pb-16">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-2 border-outline pb-4">
          <div>
            <h2 className="text-4xl font-bold uppercase mb-2 tracking-tighter text-primary">USER LIST</h2>
            <div className="flex items-center gap-3 font-mono text-sm uppercase">
              <span className="text-on-surface-variant">System Accounts (Demo Data)</span>
            </div>
          </div>
        </div>
        <div className="bg-surface border-2 border-outline rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-sm">
              <thead className="bg-surface-container border-b-2 border-outline uppercase text-on-surface-variant">
                <tr>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Username</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Created At</th>
                </tr>
              </thead>
              <tbody>
                {demoUsers.map((user) => (
                  <tr key={user.id} className="border-b border-outline hover:bg-surface-container/50 transition-colors">
                    <td className="px-6 py-4 text-on-surface-variant">{user.id}</td>
                    <td className="px-6 py-4 font-bold">{user.username}</td>
                    <td className="px-6 py-4 text-primary">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className="bg-primary/10 text-primary px-2 py-1 rounded-md text-xs">{user.role}</span>
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant">
                      {new Date(user.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  const users = await getUsers(tokenCookie.value);

  return (
    <div className="flex flex-col max-w-7xl mx-auto gap-8 pb-16">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b-2 border-outline pb-4">
        <div>
          <h2 className="text-4xl font-bold uppercase mb-2 tracking-tighter text-primary">USER LIST</h2>
          <div className="flex items-center gap-3 font-mono text-sm uppercase">
            <span className="text-on-surface-variant">System Accounts</span>
          </div>
        </div>
      </div>

      <div className="bg-surface border-2 border-outline rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-sm">
            <thead className="bg-surface-container border-b-2 border-outline uppercase text-on-surface-variant">
              <tr>
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Username</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Created At</th>
              </tr>
            </thead>
            <tbody>
              {users && users.length > 0 ? (
                users.map((user: any) => (
                  <tr key={user.id} className="border-b border-outline hover:bg-surface-container/50 transition-colors">
                    <td className="px-6 py-4 text-on-surface-variant">{user.id}</td>
                    <td className="px-6 py-4 font-bold">{user.username}</td>
                    <td className="px-6 py-4 text-primary">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className="bg-primary/10 text-primary px-2 py-1 rounded-md text-xs">{user.role}</span>
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant">
                      {new Date(user.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-on-surface-variant">
                    {users === null ? "Failed to load users or unauthorized." : "No users found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
