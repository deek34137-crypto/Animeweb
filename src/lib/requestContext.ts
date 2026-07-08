// src/lib/requestContext.ts
import { AsyncLocalStorage } from 'async_hooks';

const randomUUID = () => globalThis.crypto.randomUUID();

export interface RequestContext {
  requestId: string;
  method?: string;
  route?: string;
  userId?: string;
  startTime: number;
}

const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Runs a callback within a request context.
 * The context is automatically available to all code executed within the callback,
 * including the logger, which attaches the requestId to every log entry.
 */
export function runWithRequestContext<T>(
  context: Partial<RequestContext> & { requestId?: string },
  fn: () => T
): T {
  const ctx: RequestContext = {
    requestId: context.requestId || randomUUID(),
    method: context.method,
    route: context.route,
    userId: context.userId,
    startTime: context.startTime ?? Date.now(),
  };
  return asyncLocalStorage.run(ctx, fn);
}

/**
 * Returns the current request context, or undefined if not in a request.
 */
export function getRequestContext(): RequestContext | undefined {
  return asyncLocalStorage.getStore();
}

/**
 * Normalizes request paths to their corresponding route template pattern
 * to prevent Prometheus cardinality explosion.
 */
export function normalizePath(url: string): string {
  // Parse path (ignore query string)
  let path = url.split('?')[0];

  // Remove trailing slash
  if (path.length > 1 && path.endsWith('/')) {
    path = path.slice(0, -1);
  }

  // Remove locale prefix (e.g., /en, /es, /ja)
  path = path.replace(/^\/(en|es|ja)(\/|$)/, '/');

  // Normalize comments endpoint
  if (path.includes('/comments/')) {
    path = path
      .replace(/\/api\/anime\/[^/]+\/episodes\/[^/]+\/comments\/[^/]+\/like/g, '/api/anime/[id]/episodes/[episode]/comments/[commentId]/like')
      .replace(/\/api\/anime\/[^/]+\/episodes\/[^/]+\/comments/g, '/api/anime/[id]/episodes/[episode]/comments');
  }

  // Normalize watch endpoint
  path = path.replace(/\/watch\/[^/]+\/[^/]+/g, '/watch/[animeId]/[episode]');

  // Normalize anime endpoint
  path = path.replace(/\/anime\/[^/]+/g, '/anime/[id]');

  // Normalize user endpoint
  path = path
    .replace(/\/api\/user\/[^/]+\/follow/g, '/api/user/[username]/follow')
    .replace(/\/user\/[^/]+/g, '/user/[username]');

  // Normalize collections endpoint
  path = path
    .replace(/\/api\/collections\/[^/]+\/entries/g, '/api/collections/[id]/entries')
    .replace(/\/api\/collections\/[^/]+\/reorder/g, '/api/collections/[id]/reorder')
    .replace(/\/api\/collections\/[^/]+\/share-image/g, '/api/collections/[id]/share-image')
    .replace(/\/api\/collections\/[^/]+/g, '/api/collections/[id]')
    .replace(/\/collections\/[^/]+/g, '/collections/[id]');

  // Normalize community endpoint
  path = path
    .replace(/\/api\/community\/threads\/[^/]+\/posts/g, '/api/community/threads/[slug]/posts')
    .replace(/\/api\/community\/threads\/[^/]+/g, '/api/community/threads/[slug]')
    .replace(/\/community\/thread\/[^/]+/g, '/community/thread/[slug]');

  return path;
}
