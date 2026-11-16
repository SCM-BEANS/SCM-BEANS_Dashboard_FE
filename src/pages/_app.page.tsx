import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { AppProps } from "next/app";
import { useState } from "react";
import { InAppHistoryProvider } from "@/components/navigation/in-app-history-provider";
import { DevQuickLoginControls } from "@/components/dev-quick-login-controls";

export default function App({ Component, pageProps }: AppProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { refetchOnWindowFocus: false, retry: false, staleTime: 30_000 },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <>
        <style jsx global>{`:root { --color-primary: #b81724; }`}</style>
        <InAppHistoryProvider>
          <Component {...pageProps} />
          <DevQuickLoginControls floating />
        </InAppHistoryProvider>
      </>
    </QueryClientProvider>
  );
}
