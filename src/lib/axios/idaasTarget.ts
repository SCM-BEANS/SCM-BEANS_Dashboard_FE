const DEFAULT_LOCAL_API_URL = 'http://localhost:4000/api/v1';

function normalizeApiUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('IDaaS API URL must use HTTP or HTTPS.');
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error('IDaaS API URL must not contain credentials, a query, or a fragment.');
  }
  return url.toString().replace(/\/+$/, '');
}

/** Select the IP endpoint before sending a request, so POSTs are never replayed. */
export async function getIdaasApiBaseUrl(): Promise<string> {
  const local = normalizeApiUrl(
    process.env.IDAAS_API_LOCAL_URL ||
      process.env.NEXT_PUBLIC_API_URL || // Backward compatibility with older local config.
      DEFAULT_LOCAL_API_URL
  );
  const configuredIp = process.env.IDAAS_API_IP_URL?.trim();
  if (!configuredIp) return local;

  const ip = normalizeApiUrl(configuredIp);
  if (ip === local) return ip;

  try {
    const health = await fetch(new URL('/health', ip), {
      cache: 'no-store',
      signal: AbortSignal.timeout(1500),
    });
    // A 404 can mean this deployment has no health route, but the host is up.
    if (health.status < 500) return ip;
  } catch {
    // The IP is unreachable; use the local backend below.
  }

  return local;
}
