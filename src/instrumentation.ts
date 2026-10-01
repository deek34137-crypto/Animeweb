// src/instrumentation.ts
import { getRequestContext } from './lib/requestContext';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { initTelemetry } = await import('./services/infra/telemetry');
    const { verifyConnectivity } = await import('./lib/config/env');
    const { env } = await import('./lib/config/env');
    const { OutboxPoller } = await import('./services/infra/OutboxPoller');
    const { logger } = await import('./lib/logger');
    const { registerShutdownHandlers } = await import('./services/infra/shutdown');
    const { setLifecycleState } = await import('./services/infra/lifecycle');
    const { runWithRequestContext, normalizePath } = await import('./lib/requestContext');
    const http = await import('http');

    // Monkey-patch http.Server's request event for:
    // 1. Request Context & Correlation ID propagation via AsyncLocalStorage.
    // 2. HTTP Request Metrics (Rate, Duration, Status Code) collection.
    const originalEmit = http.Server.prototype.emit;
    (http.Server.prototype as any).emit = function (event: string, ...args: any[]) {
      if (event === 'request' && args[0] && args[1]) {
        const req = args[0];
        const res = args[1];
        const start = Date.now();
        const method = req.method || 'GET';
        const url = req.url || '/';

        // Filter out static assets, internal paths, and metadata files to keep metrics/logs clean
        const isAsset =
          url.startsWith('/_next') ||
          url.startsWith('/static') ||
          url.includes('.') ||
          url.startsWith('/favicon') ||
          url === '/api/metrics';

        const requestId = req.headers['x-request-id'] || globalThis.crypto.randomUUID();
        // Propagate requestId via request header downstream
        req.headers['x-request-id'] = requestId;

        const context = {
          requestId,
          method,
          route: normalizePath(url),
          startTime: start,
        };

        if (!isAsset) {
          let recorded = false;
          const recordMetrics = () => {
            if (recorded) return;
            recorded = true;
            const duration = (Date.now() - start) / 1000;
            const statusCode = res.statusCode || 200;
            const route = normalizePath(url);

            try {
              // Dynamically import metrics to avoid circular dependency / early load issues
              const { httpRequestsTotal, httpRequestDuration } = require('./services/infra/metrics');
              httpRequestsTotal.inc({ method, route, status_code: statusCode.toString() });
              httpRequestDuration.observe({ method, route }, duration);
            } catch (e) {
              // Fail silently to prevent crashing client request on metrics collection error
            }
          };

          res.once('finish', recordMetrics);
          res.once('close', recordMetrics);
        }

        // Run Next.js request handler inside the AsyncLocalStorage request context
        return runWithRequestContext(context, () => {
          return originalEmit.apply(this, [event, ...args] as any);
        });
      }

      return originalEmit.apply(this, [event, ...args] as any);
    };

    // Start OpenTelemetry Auto-Instrumentation
    initTelemetry();

    // Register graceful shutdown handlers
    registerShutdownHandlers();

    logger.info('Server Bootstrapping: Executing Phase 0 Startup Connection Checks...');
    try {
      const status = await verifyConnectivity();

      const isProduction = process.env.NODE_ENV === 'production';

      // Database is always required — fatal in production if unreachable
      if (!status.postgres) {
        const msg = 'CRITICAL: PostgreSQL connectivity failed at startup.';
        logger.error(msg);
        if (isProduction) {
          throw new Error(msg);
        }
      }

      // Redis — fatal only if configured/enabled and unreachable
      if (!status.redis && env.REDIS_URL) {
        const msg = 'CRITICAL: Redis connectivity failed at startup while Redis is configured.';
        logger.error(msg);
        if (isProduction) {
          throw new Error(msg);
        }
      }

      // Meilisearch — fatal only if configured/enabled and unreachable
      if (!status.meilisearch && env.MEILISEARCH_HOST) {
        const msg = 'CRITICAL: Meilisearch connectivity failed at startup while Meilisearch is configured.';
        logger.error(msg);
        if (isProduction) {
          throw new Error(msg);
        }
      }

      // Start Outbox Poller loop if enabled (Phase 3)
      OutboxPoller.start();

      // All checks passed — mark application as ready
      setLifecycleState('ready');
      logger.info('Server Bootstrapping: Application is READY to serve requests.');
    } catch (err) {
      logger.error('Server Bootstrapping: Startup checks failed with fatal error:', err);
      throw err;
    }
  }
}

/**
 * Next.js-native server error tracking hook.
 * Captures unhandled errors in API routes, server components, and actions.
 */
export async function onRequestError(
  err: any,
  request: {
    path: string;
    method: string;
    headers: Record<string, string>;
  },
  context: {
    routerKind: 'pages' | 'app';
    routeType: 'render' | 'route' | 'action' | 'middleware';
  }
) {
  const reqCtx = getRequestContext();
  const requestId = reqCtx?.requestId || request.headers['x-request-id'] || 'unknown';
  const duration = reqCtx ? (Date.now() - reqCtx.startTime) / 1000 : undefined;

  let userId: string | undefined = reqCtx?.userId;
  if (!userId) {
    try {
      const { auth } = await import('@/auth');
      const session = await auth();
      userId = session?.user?.id;
    } catch {
      // Ignore authentication errors during error reporting to prevent recursive failures
    }
  }

  const { logger } = await import('./lib/logger');
  logger.error('Request Error Captured:', {
    requestId,
    durationMs: duration ? duration * 1000 : undefined,
    userId,
    route: reqCtx?.route || request.path,
    method: request.method,
    routerKind: context.routerKind,
    routeType: context.routeType,
    error: err.message || String(err),
    stack: err.stack,
    digest: err.digest,
  });
}
