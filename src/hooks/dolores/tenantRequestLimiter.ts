type WaitingRequest = { start: () => void };

const MAX_CONCURRENT_TENANT_REQUESTS = 5;
const waiting: WaitingRequest[] = [];
let active = 0;

function releaseSlot() {
  active -= 1;
  while (active < MAX_CONCURRENT_TENANT_REQUESTS && waiting.length > 0) waiting.shift()?.start();
}

export function withTenantRequestSlot<T>(signal: AbortSignal, request: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let queued = false;
    const onAbort = () => {
      if (queued) {
        const index = waiting.indexOf(item);
        if (index >= 0) waiting.splice(index, 1);
        reject(new DOMException('Tenant request cancelled', 'AbortError'));
      }
    };
    const item: WaitingRequest = {
      start: () => {
        queued = false;
        signal.removeEventListener('abort', onAbort);
        if (signal.aborted) {
          reject(new DOMException('Tenant request cancelled', 'AbortError'));
          return;
        }
        active += 1;
        let pending: Promise<T>;
        try {
          pending = request();
        } catch (error) {
          releaseSlot();
          reject(error);
          return;
        }
        void Promise.resolve(pending).then(resolve, reject).finally(releaseSlot);
      },
    };

    if (signal.aborted) {
      reject(new DOMException('Tenant request cancelled', 'AbortError'));
    } else if (active < MAX_CONCURRENT_TENANT_REQUESTS) {
      item.start();
    } else {
      queued = true;
      waiting.push(item);
      signal.addEventListener('abort', onAbort, { once: true });
    }
  });
}
