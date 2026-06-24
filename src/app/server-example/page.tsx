import axiosServer from '@/lib/axios/axiosServer';
import { authService } from '@/services/auth.service';

export default async function ServerExamplePage() {
  let profileData = null;
  let errorMessage = '';

  try {
    // Direct server-side fetch without React Query
    const response = await authService.getProfile(axiosServer);
    profileData = response.data;
  } catch (error: any) {
    errorMessage = error.message || String(error);
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Server Component Example</h1>
      <p className="text-on-surface/80">
        This component uses <code>axiosServer</code> to fetch data directly during Server-Side Rendering (SSR).
      </p>

      <div className="p-6 bento-border bg-surface-container rounded-xl">
        <h2 className="text-xl font-semibold mb-4">Profile Data (SSR)</h2>

        {errorMessage ? (
          <div className="text-red-500 bg-red-500/10 p-4 rounded-lg">
            <p className="font-semibold">Error fetching data on server:</p>
            <p>{errorMessage}</p>
          </div>
        ) : profileData ? (
          <div className="space-y-2">
            <p><span className="font-medium text-on-surface/60">ID:</span> {profileData.id}</p>
            <p><span className="font-medium text-on-surface/60">Name:</span> {profileData.name}</p>
            <p><span className="font-medium text-on-surface/60">Email:</span> {profileData.email}</p>
            <p><span className="font-medium text-on-surface/60">Role:</span> {profileData.role}</p>
            <span className="inline-block mt-2 px-2 py-1 bg-blue-500/20 text-blue-500 text-xs rounded">
              Rendered on Server
            </span>
          </div>
        ) : (
          <div className="text-on-surface/60">
            No data available.
          </div>
        )}
      </div>
    </div>
  );
}
