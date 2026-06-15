import { StreamingProviderInterface } from '../types';
import { consumetProvider } from './consumet';
import { animepaheProvider } from './animepahe';
import { toonworldProvider } from './toonworld';
import { toonplayProvider } from './toonplay';
import { desidubanimeProvider } from './desidubanime';
import { piratexplayProvider } from './piratexplay';

class ProviderRegistry {
  private providers = new Map<string, StreamingProviderInterface>();
  private defaultProviderName = 'toonplay';

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
    return ['toonplay', 'toonworld', 'desidubanime', 'piratexplay'];
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

// Register working providers
registry.register(toonworldProvider);
registry.register(toonplayProvider);
registry.register(desidubanimeProvider);
registry.register(piratexplayProvider);
registry.register(consumetProvider);
registry.register(animepaheProvider);

export default registry;


