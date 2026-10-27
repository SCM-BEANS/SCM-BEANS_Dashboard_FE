export type NavigationRouteItem = {
  href: string;
  enabled?: boolean;
};

export function normalizeNavigationPath(pathname: string): string {
  const rawPath = pathname.trim().split(/[?#]/, 1)[0] || "/";
  const withLeadingSlash = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
  const normalized = withLeadingSlash.replace(/\/+$/, "");
  return normalized || "/";
}

export function getActiveNavigationItem<T extends NavigationRouteItem>(
  items: readonly T[],
  pathname: string,
  rootHref: string,
): T | undefined {
  const currentPath = normalizeNavigationPath(pathname);
  const rootPath = normalizeNavigationPath(rootHref);
  let activeItem: T | undefined;
  let activePathLength = -1;

  for (const item of items) {
    if (item.enabled === false) continue;

    const itemPath = normalizeNavigationPath(item.href);
    const isExactMatch = currentPath === itemPath;
    const isNestedMatch = itemPath !== rootPath && currentPath.startsWith(`${itemPath}/`);

    if ((isExactMatch || isNestedMatch) && itemPath.length > activePathLength) {
      activeItem = item;
      activePathLength = itemPath.length;
    }
  }

  return activeItem;
}
