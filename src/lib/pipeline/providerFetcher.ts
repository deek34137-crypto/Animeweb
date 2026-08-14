// src/lib/pipeline/providerFetcher.ts
import { StreamingProviderInterface as Provider } from '../streaming/types';

/**
 * Fetch raw data from all configured providers.
 * Returns a map of provider name to its raw payload.
 */
export async function fetchAllProviders(): Promise<Record<string, any>> {
  const providers: Provider[] = getEnabledProviders();
  const results: Record<string, any> = {};
  for (const provider of providers) {
    try {
// @ts-ignore
      const data = await (provider as any).fetchAll(); // each provider implements fetchAll()
      results[provider.name] = data;
    } catch (err) {
      console.warn(`⚠️ Provider ${provider.name} fetch failed:`, err);
      // Continue with other providers; failures handled later by scoring.
    }
  }
  return results;
}

function getEnabledProviders(): Provider[] {
  // TODO: Load enabled providers from config or environment variable.
  // Placeholder implementation – import known providers.
  // Example: import { toonplay } from '../streaming/providers/toonplay';
  // return [toonplay, ...];
  return [];
}
