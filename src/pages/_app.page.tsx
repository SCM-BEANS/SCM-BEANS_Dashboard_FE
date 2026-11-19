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
        <style jsx global>{`
          :root {
            --color-text: #302927;
            --color-text-secondary: #514843;
            --color-text-muted: #706561;
            --color-page: #f8f6f3;
            --color-surface: #fff;
            --color-surface-subtle: #faf8f6;
            --color-border: #e9e2dc;
            --color-border-strong: #e2dad4;
            --color-primary: #b81724;
            --color-primary-strong: #8c1d26;
            --color-primary-soft: #f9e9ea;
            --color-primary-border: #efc3c5;
            --color-success: #23653a;
            --color-success-soft: #f1faf3;
            --color-warning: #80512b;
            --color-warning-soft: #fff2e6;
            --radius-sm: 8px;
            --radius-control: 10px;
            --radius-card: 12px;
            --radius-panel: 16px;
            --font-sans: Arial, Helvetica, sans-serif;
            --font-mono: ui-monospace, SFMono-Regular, Consolas, monospace;
            --ease-out: cubic-bezier(.2, .8, .2, 1);
            --duration-fast: 150ms;
            --duration-base: 220ms;
          }
        `}</style>
        <InAppHistoryProvider>
          <Component {...pageProps} />
          <DevQuickLoginControls floating />
        </InAppHistoryProvider>
      </>
    </QueryClientProvider>
  );
}
