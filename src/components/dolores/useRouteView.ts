"use client";

import { buildRouteUrl } from "@/routes/query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Route views change without remounting the form data owned by the caller. */
export function useRouteView<T extends string>(entryView: T): [T, (view: T, params?: Record<string, string | null>) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return [entryView, (view, params = {}) => {
    router.push(buildRouteUrl(pathname, { view, ...params }, searchParams.toString()), { scroll: false });
  }];
}
