import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import axiosServer from "@/lib/axios/axiosServer";

export default async function UsersPage() {
  const cookieStore = await cookies();
  const tokenCookie = cookieStore.get("access_token");

  // Redirect to login if no token is found
  if (!tokenCookie || !tokenCookie.value) {
    redirect("/login");
  }

  let users: any[] | null = null;
  
  try {
    // Call the real IDaaS backend using our new axiosServer instance.
    // The token is automatically injected by the axiosServer interceptor.
    const response: any = await axiosServer.get("/users");
    // Depending on your API structure, it might be response.data.items, response.data, or just response
    users = response.data || response; 
    
    // Fallback to empty array if data isn't an array
    if (!Array.isArray(users)) {
      users = [];
    }
  } catch (error) {
    console.error("Failed to load users:", error);
    users = null;
  }

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
                  <tr key={user.id || user.email} className="border-b border-outline hover:bg-surface-container/50 transition-colors">
                    <td className="px-6 py-4 text-on-surface-variant">{user.id || 'N/A'}</td>
                    <td className="px-6 py-4 font-bold">{user.username || user.name || 'N/A'}</td>
                    <td className="px-6 py-4 text-primary">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className="bg-primary/10 text-primary px-2 py-1 rounded-md text-xs">
                        {user.role || 'user'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant">
                      {user.createdAt ? new Date(user.createdAt).toLocaleString() : 'N/A'}
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
