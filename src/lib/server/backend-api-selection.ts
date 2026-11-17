export type BackendApiSelection = {
  mode: "remote" | "local";
  idaasBaseUrl: string;
  doloresBaseUrl: string;
  localIdaasBaseUrl: string;
  localDoloresBaseUrl: string;
};

const DEFAULT_IDAAS_LOCAL_URL = "http://localhost:4000/api/v1";
const DEFAULT_DOLORES_LOCAL_URL = "http://localhost:8082";
const HEALTH_TIMEOUT_MS = 1_500;
const HEALTH_CACHE_MS = 5_000;

type CachedSelection = BackendApiSelection & { expiresAt: number };
type SelectionState = {
  cachedSelection: CachedSelection | null;
  selectionPromise: Promise<CachedSelection> | null;
};

const globalState = globalThis as typeof globalThis & {
  __doloresBackendApiSelectionState?: SelectionState;
};
const selectionState = (globalState.__doloresBackendApiSelectionState ??= {
  cachedSelection: null,
  selectionPromise: null,
});

function normalizeApiBase(value: string, allowPath: boolean): string {
  const url = new URL(value);

  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    (!allowPath && url.pathname !== "/" && url.pathname !== "") ||
    url.search ||
    url.hash
  ) {
    throw new Error("Invalid backend API URL");
  }

  return `${url.origin}${url.pathname === "/" ? "" : url.pathname.replace(/\/+$/, "")}`;
}

function getConfiguredUrls() {
  const localIdaasBaseUrl = normalizeApiBase(
    process.env.IDAAS_API_LOCAL_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      DEFAULT_IDAAS_LOCAL_URL,
    true,
  );
  const localDoloresBaseUrl = normalizeApiBase(
    process.env.DOLORES_API_LOCAL_URL || DEFAULT_DOLORES_LOCAL_URL,
    false,
  );
  const configuredRemoteIdaas = process.env.IDAAS_API_IP_URL?.trim();
  const configuredRemoteDolores =
    process.env.DOLORES_API_IP_URL?.trim() ||
    process.env.DOLORES_API_URL?.trim();

  return {
    localIdaasBaseUrl,
    localDoloresBaseUrl,
    remoteIdaasBaseUrl: configuredRemoteIdaas
      ? normalizeApiBase(configuredRemoteIdaas, true)
      : null,
    remoteDoloresBaseUrl: configuredRemoteDolores
      ? normalizeApiBase(configuredRemoteDolores, false)
      : null,
  };
}

function createSelection(
  mode: BackendApiSelection["mode"],
  urls = getConfiguredUrls(),
): BackendApiSelection {
  return {
    mode,
    idaasBaseUrl:
      mode === "remote" && urls.remoteIdaasBaseUrl
        ? urls.remoteIdaasBaseUrl
        : urls.localIdaasBaseUrl,
    doloresBaseUrl:
      mode === "remote" && urls.remoteDoloresBaseUrl
        ? urls.remoteDoloresBaseUrl
        : urls.localDoloresBaseUrl,
    localIdaasBaseUrl: urls.localIdaasBaseUrl,
    localDoloresBaseUrl: urls.localDoloresBaseUrl,
  };
}

export function getExplicitBackendApiSelection(): BackendApiSelection {
  const mode = process.env.BACKEND_API_MODE?.trim().toLowerCase();
  const urls = getConfiguredUrls();
  if (mode === "local") return createSelection("local", urls);
  if (mode === "remote" && urls.remoteIdaasBaseUrl && urls.remoteDoloresBaseUrl) {
    return createSelection("remote", urls);
  }
  throw new Error("Certificate operations require BACKEND_API_MODE=local or remote with configured backend URLs.");
}

export async function getBackendApiSelection(): Promise<BackendApiSelection> {
  const urls = getConfiguredUrls();
  const configuredMode = process.env.BACKEND_API_MODE?.trim().toLowerCase();
  if (configuredMode === "remote") return getExplicitBackendApiSelection();

  // Local development can force both services onto the Docker pair even while
  // the remote servers are healthy. This keeps authentication and API data in
  // the same local environment for end-to-end testing.
  if (configuredMode === "local") {
    return createSelection("local", urls);
  }

  // Keep the two APIs on the same environment so their JWT keys stay paired.
  if (!urls.remoteIdaasBaseUrl || !urls.remoteDoloresBaseUrl) {
    return createSelection("local", urls);
  }

  if (
    selectionState.cachedSelection &&
    selectionState.cachedSelection.expiresAt > Date.now()
  ) {
    return selectionState.cachedSelection;
  }
  if (selectionState.selectionPromise) return selectionState.selectionPromise;

  selectionState.selectionPromise = (async () => {
    let mode: BackendApiSelection["mode"] = "local";

    try {
      const [idaasHealth, doloresHealth] = await Promise.all([
        fetch(new URL("/health", urls.remoteIdaasBaseUrl!), {
          cache: "no-store",
          signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
        }),
        fetch(new URL("/actuator/health", urls.remoteDoloresBaseUrl!), {
          cache: "no-store",
          signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
        }),
      ]);

      if (idaasHealth.status < 500 && doloresHealth.status < 500) {
        mode = "remote";
      }
    } catch {
      // If either remote service is unavailable, use the local Docker pair.
    }

    const selection = {
      ...createSelection(mode, urls),
      expiresAt: Date.now() + HEALTH_CACHE_MS,
    };
    selectionState.cachedSelection = selection;
    return selection;
  })();

  try {
    return await selectionState.selectionPromise;
  } finally {
    selectionState.selectionPromise = null;
  }
}

export function preferLocalBackendApis(): BackendApiSelection {
  const selection = {
    ...createSelection("local"),
    expiresAt: Date.now() + HEALTH_CACHE_MS,
  };
  selectionState.cachedSelection = selection;
  return selection;
}

export function isUpstreamTimeout(error: unknown) {
  return error instanceof Error && ["AbortError", "TimeoutError"].includes(error.name);
}

// Share one deadline across fetch, retry delay and response-body consumption.
export async function fetchBackendUpstream(target: URL, init: RequestInit, mode: BackendApiSelection["mode"], timeoutMs: number) {
  const startedAt = Date.now();
  const signal = AbortSignal.timeout(timeoutMs);
  for (let attempt = 0; ; attempt++) {
    let receivedResponse = false;
    try {
      const upstream = await fetch(target, { ...init, signal });
      receivedResponse = true;
      const responseBody = Buffer.from(await upstream.arrayBuffer());
      return { upstream, responseBody };
    } catch (error) {
      const failure = error as { name?: string; code?: string; cause?: { code?: string } } | null;
      const code = failure?.cause?.code ?? failure?.code;
      console.error("backend_proxy_error", {
        method: init.method ?? "GET", path: target.pathname, origin: target.origin, mode,
        elapsedMs: Date.now() - startedAt,
        error: { name: failure?.name, cause: { code: failure?.cause?.code } },
      });
      const transient = typeof code === "string" && (
        ["ECONNRESET", "ECONNREFUSED", "ENETUNREACH", "EHOSTUNREACH", "ETIMEDOUT"].includes(code) || code.startsWith("UND_ERR_")
      );
      if (receivedResponse || attempt > 0 || mode !== "remote" || !["GET", "HEAD"].includes(init.method ?? "GET") || !transient || isUpstreamTimeout(error) || signal.aborted || Date.now() - startedAt + 300 >= timeoutMs) throw error;
      await new Promise<void>(resolve => setTimeout(resolve, 300));
      signal.throwIfAborted();
    }
  }
}
