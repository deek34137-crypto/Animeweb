// src/services/metadata/ProviderManager.ts
import { ProviderType } from '@prisma/client';
import { IMetadataProvider } from './providers/IMetadataProvider';
import { AniListProvider } from './providers/AniListProvider';
import { TMDBProvider } from './providers/TMDBProvider';

export class ProviderManager {
  private static providers = new Map<ProviderType, IMetadataProvider>([
    [ProviderType.ANILIST, new AniListProvider()],
    [ProviderType.TMDB, new TMDBProvider()]
  ]);

  /**
   * Retrieves the configured provider instance for the specified type.
   */
  static getProvider(providerType: ProviderType): IMetadataProvider {
    const provider = this.providers.get(providerType);
    if (!provider) {
      throw new Error(`ProviderType ${providerType} is not registered in ProviderManager.`);
    }
    return provider;
  }

  /**
   * Dynamically registers a custom metadata provider instance.
   */
  static registerProvider(providerType: ProviderType, provider: IMetadataProvider): void {
    this.providers.set(providerType, provider);
  }
}
export default ProviderManager;
