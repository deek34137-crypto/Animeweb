import { StreamingProviderInterface } from '../types';
import { filmuProvider } from './filmu';
import { vidsrcMeProvider } from './vidsrcMe';
import { vidsrcToProvider } from './vidsrcTo';
import { vidsrcSbsProvider } from './vidsrcSbs';
import { gogocdnProvider } from './gogocdn';
import { vidnestProvider } from './vidnest';
import { toonworldProvider } from './toonworld';
import { toonplayProvider } from './toonplay';

class ProviderRegistry {
  private providers = new Map<string, StreamingProviderInterface>();
  private defaultProviderName = 'filmu';

  public register(provider: StreamingProviderInterface) {
    this.providers.set(provider.name.toLowerCase(), provider);
  }

  public get(name: string): StreamingProviderInterface | undefined {
    return this.providers.get(name.toLowerCase());
  }

  public getAll(): StreamingProviderInterface[] {
    return Array.from(this.providers.values());
  }

  public getPriorityChain(): string[] {
    return [
      'filmu',       // 1. FilmU — Native anime (4K, sub/dub options, slug-based)
      'vidsrc_me',   // 2. VidSrc.me — TMDB-based (1080p)
      'vidsrc_to',   // 3. VidSrc.to — TMDB-based (1080p)
      'vidsrc_sbs',  // 4. VidSrc.sbs — CloudStream backend (1080p)
      'vidnest',     // 5. VidNest — HLS streams
      'gogocdn',     // 6. GogoCDN — Gogoanime backend (720p)
      'toonplay',    // 7. ToonPlay — Web app fallback
    ];
  }

  /**
   * Kids / Cartoons & Hindi Dubs Section Providers.
   * Dedicated for cartoon titles (Doraemon, Shinchan, Pokemon, etc.)
   */
  public getKidsProviders(): string[] {
    return ['toonworld'];
  }

  public getDefault(): StreamingProviderInterface {
    const defaultProvider = this.get(this.defaultProviderName);
    if (!defaultProvider) {
      throw new Error(`Default provider "${this.defaultProviderName}" not registered.`);
    }
    return defaultProvider;
  }

  public setDefault(name: string) {
    if (!this.providers.has(name.toLowerCase())) {
      throw new Error(`Cannot set default provider to "${name}". It is not registered.`);
    }
    this.defaultProviderName = name.toLowerCase();
  }
}

export const registry = new ProviderRegistry();

// Register verified working anime & kids providers
registry.register(filmuProvider);
registry.register(vidsrcMeProvider);
registry.register(vidsrcToProvider);
registry.register(vidsrcSbsProvider);
registry.register(gogocdnProvider);
registry.register(vidnestProvider);
registry.register(toonworldProvider);
registry.register(toonplayProvider);

export default registry;
