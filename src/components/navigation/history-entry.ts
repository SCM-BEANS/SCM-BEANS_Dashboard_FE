import type { NextRouter } from "next/router";

export const HISTORY_ENTRY_STATE_KEY = "__dolores_in_app_history_v1__";

export type InAppHistoryEntry = {
  id: string;
  parentId: string | null;
  path: string;
};

type HistoryLike = Pick<History, "state" | "pushState" | "replaceState">;
type LocationLike = Pick<Location, "href" | "origin">;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function readHistoryEntry(state: unknown): InAppHistoryEntry | null {
  if (!isRecord(state)) return null;
  const value = state[HISTORY_ENTRY_STATE_KEY];
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string" || value.id.length === 0) return null;
  if (value.parentId !== null && typeof value.parentId !== "string") return null;
  if (typeof value.path !== "string" || !value.path.startsWith("/")) return null;

  return { id: value.id, parentId: value.parentId, path: value.path };
}

function withHistoryEntry(state: unknown, entry: InAppHistoryEntry): unknown {
  if (state === null || state === undefined) {
    return { [HISTORY_ENTRY_STATE_KEY]: entry };
  }
  if (!isRecord(state)) return state;
  return { ...state, [HISTORY_ENTRY_STATE_KEY]: entry };
}

function createEntryId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getInAppPath(url: string | URL | null | undefined, location: LocationLike): string | null {
  try {
    const nextUrl = new URL(url == null ? location.href : String(url), location.href);
    if (nextUrl.origin !== location.origin) return null;
    return `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
  } catch {
    return null;
  }
}

export function installInAppHistoryTracking(
  history: HistoryLike,
  location: LocationLike,
  nextId: () => string = createEntryId,
): () => void {
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  const initialPath = getInAppPath(location.href, location);
  if (initialPath && !readHistoryEntry(history.state)) {
    const initialEntry = { id: nextId(), parentId: null, path: initialPath };
    originalReplaceState.call(
      history,
      withHistoryEntry(history.state, initialEntry),
      "",
      location.href,
    );
  }

  const patchedPushState: History["pushState"] = function (state, unused, url) {
    const path = getInAppPath(url, location);
    if (!path) return originalPushState.call(history, state, unused, url);

    const currentEntry = readHistoryEntry(history.state);
    const nextEntry: InAppHistoryEntry = {
      id: nextId(),
      parentId: currentEntry?.id ?? null,
      path,
    };
    return originalPushState.call(
      history,
      withHistoryEntry(state, nextEntry),
      unused,
      url,
    );
  };

  const patchedReplaceState: History["replaceState"] = function (state, unused, url) {
    const path = getInAppPath(url, location);
    if (!path) return originalReplaceState.call(history, state, unused, url);

    const currentEntry = readHistoryEntry(history.state);
    const nextEntry: InAppHistoryEntry = {
      id: currentEntry?.id ?? nextId(),
      parentId: currentEntry?.parentId ?? null,
      path,
    };
    return originalReplaceState.call(
      history,
      withHistoryEntry(state, nextEntry),
      unused,
      url,
    );
  };

  history.pushState = patchedPushState;
  history.replaceState = patchedReplaceState;

  return () => {
    if (history.pushState === patchedPushState) history.pushState = originalPushState;
    if (history.replaceState === patchedReplaceState) history.replaceState = originalReplaceState;
  };
}

export function isSafeInternalHref(href: unknown): href is string {
  if (typeof href !== "string" || !href.startsWith("/") || href.startsWith("//") || href.startsWith("/\\")) {
    return false;
  }

  try {
    return new URL(href, "https://dolores.invalid").origin === "https://dolores.invalid";
  } catch {
    return false;
  }
}

export function navigateBackOrFallback({
  historyState,
  fallbackHref,
  router,
}: {
  historyState: unknown;
  fallbackHref: string;
  router: Pick<NextRouter, "back" | "replace">;
}): "back" | "fallback" | "invalid-fallback" {
  if (readHistoryEntry(historyState)?.parentId) {
    router.back();
    return "back";
  }

  if (!isSafeInternalHref(fallbackHref)) return "invalid-fallback";
  void router.replace(fallbackHref);
  return "fallback";
}
