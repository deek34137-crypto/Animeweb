// src/services/metadata/client/ResilientClient.ts
import CircuitBreaker from 'opossum';
import { ProviderType } from '@prisma/client';
import { logger } from '@/lib/logger';

const breakerOptions = {
  timeout: 5000,                // 5s timeout budget
  errorThresholdPercentage: 50, // open circuit if 50% fails
  resetTimeout: 30000           // wait 30s before going HALF-OPEN
};

export class ResilientClient {
  private static breakers = new Map<ProviderType, CircuitBreaker<[() => Promise<any>], any>>();

  /**
   * Returns a reusable Opossum circuit breaker for a given provider.
   */
  static getBreaker(provider: ProviderType): CircuitBreaker<[() => Promise<any>], any> {
    if (!this.breakers.has(provider)) {
      // Reusable circuit breaker wrapping a generic function executor
      const breaker = new CircuitBreaker(async (fn: () => Promise<any>) => {
        return fn();
      }, breakerOptions);

      breaker.on('open', () => logger.warn(`Circuit Breaker OPEN for provider: ${provider}`));
      breaker.on('halfOpen', () => logger.info(`Circuit Breaker HALF-OPEN for provider: ${provider}`));
      breaker.on('close', () => logger.info(`Circuit Breaker CLOSED (Healthy) for provider: ${provider}`));

      breaker.fallback(async (fn: any, err: any) => {
        logger.error(`Circuit Breaker fallback active for ${provider}:`, err);
        return {
          statusCode: 503,
          data: null,
          message: `Provider ${provider} is quarantined/offline (circuit open)`
        };
      });

      this.breakers.set(provider, breaker);
    }

    return this.breakers.get(provider)!;
  }

  /**
   * Helper to check if an error is retryable.
   * Do NOT retry 400, 401, 403, 404, or validation errors.
   * Retry only 429, 503, timeouts, and network resets.
   */
  static isRetryableError(error: any): boolean {
    if (!error) return false;
    
    // Zod validation errors
    if (error.name === 'ZodError') return false;

    // HTTP status codes
    const status = error.status || error.statusCode || error.response?.status;
    if (status) {
      if (status === 429 || status === 503 || status === 502 || status === 504) {
        return true;
      }
      return false; // Don't retry 400, 401, 403, 404, etc.
    }

    // Network error codes
    const code = error.code;
    if (code) {
      const retryableCodes = ['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'EADDRINUSE', 'EPIPE', 'ENOTFOUND'];
      return retryableCodes.includes(code);
    }

    return false;
  }

  /**
   * Executes a client request with exponential backoff and random jitter.
   * Only retries on retryable errors.
   */
  static async executeWithBackoff<T>(
    provider: ProviderType,
    requestFn: () => Promise<T>,
    attempt = 1,
    maxAttempts = 3
  ): Promise<T> {
    const breaker = this.getBreaker(provider);

    try {
      // Fire through the Opossum circuit breaker
      return await breaker.fire(requestFn);
    } catch (error: any) {
      if (this.isRetryableError(error) && attempt < maxAttempts) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000; // Exponential Backoff + Jitter
        logger.warn(`ResilientClient: Retrying request for ${provider} in ${Math.round(delay)}ms (Attempt ${attempt}/${maxAttempts})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.executeWithBackoff(provider, requestFn, attempt + 1, maxAttempts);
      }
      throw error;
    }
  }
}
export default ResilientClient;
