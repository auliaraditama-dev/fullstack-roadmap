/** Serialize cache mutations across tabs; older browsers use a per-tab queue. */
let pending: Promise<unknown> = Promise.resolve();
export function withOfflineLock<T>(operation: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks.request('fullstack-offline-storage', operation);
  }
  const result = pending.then(operation, operation);
  pending = result.catch(() => {});
  return result;
}
