import { StreamingProviderInterface } from '../types';
import { mockProvider } from './mock';
import { consumetProvider } from './consumet';
import { animepaheProvider } from './animepahe';
// anicli is scaffolded but unimplemented — excluded from priority chain
// import { anicliProvider } from './aniCLI';
import { raretoonsProvider } from './raretoons';
import { deadtoonsProvider } from './deadtoons';
import { puretoonsProvider } from './puretoons';
import { animetmProvider } from './animetm';
import { toonworldProvider } from './toonworld';
import { toonplayProvider } from './toonplay';

class ProviderRegistry {
  private providers = new Map<string, StreamingProviderInterface>();
  private defaultProviderName = 'toonworld'; // Prioritize toonworld as default

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
    // toonworld first, then consumet (real Consumet API / HiAnime), then animepahe,
    // then Hindi providers, then mock fallback last.
    // anicli is not implemented and has been removed from the chain.
    return ['toonplay', 'toonworld', 'consumet', 'animepahe', 'raretoons', 'deadtoons', 'puretoons', 'animetm', 'mock'];
  }

  public getDefault(): StreamingProviderInterface {
    const defaultProvider = this.get(this.defaultProviderName);
    if (!defaultProvider) {
      const mock = this.get('mock');
      if (mock) return mock;
      throw new Error(`Default provider "${this.defaultProviderName}" and fallback "mock" not registered.`);
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

// Register all providers
registry.register(toonworldProvider);
registry.register(toonplayProvider);
registry.register(consumetProvider);
registry.register(animepaheProvider);
// anicliProvider not registered — not implemented
registry.register(raretoonsProvider);
registry.register(deadtoonsProvider);
registry.register(puretoonsProvider);
registry.register(animetmProvider);
registry.register(mockProvider);

export default registry;

