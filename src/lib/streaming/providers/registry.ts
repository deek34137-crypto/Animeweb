import { StreamingProviderInterface } from '../types';
import { mockProvider } from './mock';
import { gogoanimeProvider } from './gogoanime';

class ProviderRegistry {
  private providers = new Map<string, StreamingProviderInterface>();
  private defaultProviderName = 'mock';

  public register(provider: StreamingProviderInterface) {
    this.providers.set(provider.name.toLowerCase(), provider);
  }

  public get(name: string): StreamingProviderInterface | undefined {
    return this.providers.get(name.toLowerCase());
  }

  public getAll(): StreamingProviderInterface[] {
    return Array.from(this.providers.values());
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

// Statically register default providers
registry.register(mockProvider);
registry.register(gogoanimeProvider);

export default registry;

