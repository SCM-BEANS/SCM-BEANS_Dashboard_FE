"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Route views change without remounting the form data owned by the caller. */
export function useRouteView<T extends string>(entryView: T): [T, (view: T, params?: Record<string, string | null>) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return [entryView, (view, params = {}) => {
    const query = new URLSearchParams(searchParams.toString());
    query.set("view", view);
    Object.entries(params).forEach(([key, value]) => { if (value === null) query.delete(key); else query.set(key, value); });
    router.push(`${pathname}?${query.toString()}`, { scroll: false });
  }];
}
