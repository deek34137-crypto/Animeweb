// src/services/infra/telemetry.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { logger } from '@/lib/logger';

let sdk: NodeSDK | null = null;

export function initTelemetry() {
  if (process.env.NODE_ENV !== 'production') {
    // Only trace in production to prevent local console cluttering
    return;
  }

  try {
    sdk = new NodeSDK({
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-http': {
            ignoreIncomingRequestHook: (req: any) => {
              // Ignore scraper endpoints to avoid trace noise
              return req.url === '/api/metrics';
            }
          }
        })
      ]
    });

    sdk.start();
    logger.info('OpenTelemetry: SDK auto-instrumentation started successfully.');
  } catch (err) {
    logger.error('OpenTelemetry: Failed to initialize SDK:', err);
  }
}

export function shutdownTelemetry() {
  if (sdk) {
    sdk.shutdown()
      .then(() => logger.info('OpenTelemetry: SDK shutdown complete.'))
      .catch((err) => logger.error('OpenTelemetry: Error shutting down SDK:', err));
  }
}
