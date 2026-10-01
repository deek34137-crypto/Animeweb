import { StreamingProviderInterface } from '../types';
import { filmuProvider }        from './filmu';
import { kaaProvider }          from './kaa';
import { anibdProvider }        from './anibd';
import { allmangaProvider }     from './allmanga';
import { vidnestProvider }      from './vidnest';
import { gogocdnProvider }      from './gogocdn';
import { reanimeProvider }      from './reanime';
import { animeNexusProvider }   from './anime_nexus';
import { anizoneProvider }      from './anizone';
import { anihqProvider }        from './anihq';
import { vidsrcMeProvider }     from './vidsrcMe';
import { vidsrcToProvider }     from './vidsrcTo';
import { vidsrcSbsProvider }    from './vidsrcSbs';
import { toonplayProvider }     from './toonplay';
import { toonworldProvider }    from './toonworld';
import { animotvslashProvider } from './animotvslash';
import { kartoonsProvider }     from './kartoons';

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

  /**
   * Primary provider chain — shown in the player by default.
   * Ordered from best-quality / fastest to reliable fallback.
   * These appear as the first group in ⚙ Settings → Provider.
   */
  public getPriorityChain(): string[] {
    return [
      'kartoons',  // 1. Kartoons      — native API, ~3s, ad-free
      'filmu',     // 2. FilmU         — 4K, slug-based, native sub/dub
      'anibd',     // 3. AniBD         — BD/uncensored releases, fastest ~401ms
      'allmanga',  // 4. AllAnime      — large catalog, ~744ms
      'vidnest',   // 5. VidNest       — AniList-based, Hindi support
      'gogocdn',   // 6. GogoCDN       — reliable HLS fallback
    ];
  }

  /**
   * Drawer extras — user-selectable via ⚙ Settings → Provider → More Providers.
   * Not in the auto-fallback chain; user explicitly picks these.
   */
  public getDrawerProviders(): string[] {
    return [
      'reanime',      // ReAnime      — fast, ~574ms
      'anime_nexus',  // Anime Nexus  — popular HD, ~625ms
      'anizone',      // AniZone      — fast streaming, ~889ms
      'anihq',        // AniHQ        — HD online, ~2833ms
      'vidsrc_me',    // VidSrc.me    — TMDB-based (power users)
      'vidsrc_to',    // VidSrc.to    — TMDB-based (power users)
      'vidsrc_sbs',   // VidSrc.sbs   — CloudStream backend
      'toonplay',     // ToonPlay     — multi-audio HLS scraper
    ];
  }

  /**
   * Kids / Cartoons & Hindi Dubs Section providers.
   * Dedicated for cartoon titles (Doraemon, Shinchan, Pokémon, etc.)
   */
  public getKidsProviders(): string[] {
    return [
      'kartoons',       // Kartoons     — native API, ad-free
      'toonworld',      // ToonWorld    — primary kids source
      'animotvslash',   // AnimoTV Slash — cartoons + Hindi dubs
    ];
  }

  /**
   * All providers selectable by the user in the player UI (primary + drawer).
   * Used by PlayerSettings to render the full provider list.
   */
  public getAllSelectableProviders(): { name: string; label: string; group: 'primary' | 'drawer' }[] {
    const primary = this.getPriorityChain().map(name => {
      const p = this.get(name);
      return {
        name,
        label: p?.label || name.replace(/_/g, ' '),
        group: 'primary' as const,
      };
    });

    const drawer = this.getDrawerProviders().map(name => {
      const p = this.get(name);
      return {
        name,
        label: p?.label || name.replace(/_/g, ' '),
        group: 'drawer' as const,
      };
    });

    return [...primary, ...drawer];
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

// ─────────────────────────────────────────────────────────────
// Primary chain providers (fast, verified-live)
// ─────────────────────────────────────────────────────────────
registry.register(filmuProvider);       // 4K embed, slug-based
registry.register(kaaProvider);         // KickAssAnime — verified 200 OK
registry.register(anibdProvider);       // AniBD BD releases — verified 200 OK
registry.register(allmangaProvider);    // AllAnime catalog — verified 200 OK
registry.register(vidnestProvider);     // VidNest AniList-based
registry.register(gogocdnProvider);     // GogoCDN HLS fallback

// ─────────────────────────────────────────────────────────────
// Drawer extras (user-selectable, all verified-live)
// ─────────────────────────────────────────────────────────────
registry.register(reanimeProvider);     // ReAnime — verified 200 OK
registry.register(animeNexusProvider);  // Anime Nexus — verified 200 OK
registry.register(anizoneProvider);     // AniZone — verified 200 OK
registry.register(anihqProvider);       // AniHQ — verified 200 OK
registry.register(vidsrcMeProvider);    // VidSrc.me — TMDB-based
registry.register(vidsrcToProvider);    // VidSrc.to — TMDB-based
registry.register(vidsrcSbsProvider);   // VidSrc.sbs — CloudStream
registry.register(toonplayProvider);    // ToonPlay — multi-audio scraper

// ─────────────────────────────────────────────────────────────
// Kids / Cartoons section
// ─────────────────────────────────────────────────────────────
registry.register(toonworldProvider);      // ToonWorld — primary kids
registry.register(animotvslashProvider);   // AnimoTV Slash — cartoons + Hindi dubs
registry.register(kartoonsProvider);       // Kartoons — kartoons.me search embed

export default registry;
