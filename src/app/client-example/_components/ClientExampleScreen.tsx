'use client';

import { useQuery } from '@tanstack/react-query';
import axiosClient from '@/lib/axios/axiosClient';
import { authService } from '@/services/auth.service';

export default function ClientExamplePage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['profile'],
    queryFn: () => authService.getProfile(axiosClient),
  });

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Client Component Example</h1>
      <p className="text-on-surface/80">
        This component uses React Query and <code>axiosClient</code> to fetch data on the client side.
      </p>

      <div className="p-6 bento-border bg-surface-container rounded-xl">
        <h2 className="text-xl font-semibold mb-4">Profile Data</h2>
        
        {isLoading && (
          <div className="flex items-center space-x-2 text-blue-500">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span>Loading profile...</span>
          </div>
        )}

        {isError && (
          <div className="text-red-500 bg-red-500/10 p-4 rounded-lg">
            <p className="font-semibold">Error fetching data:</p>
            <p>{error instanceof Error ? error.message : String(error)}</p>
          </div>
        )}

        {data?.success && (
          <div className="space-y-2">
            <p><span className="font-medium text-on-surface/60">ID:</span> {data.data.id}</p>
            <p><span className="font-medium text-on-surface/60">Name:</span> {data.data.name}</p>
            <p><span className="font-medium text-on-surface/60">Email:</span> {data.data.email}</p>
            <p><span className="font-medium text-on-surface/60">Role:</span> {data.data.role}</p>
            <span className="inline-block mt-2 px-2 py-1 bg-green-500/20 text-green-500 text-xs rounded">
              Fetched Successfully
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
