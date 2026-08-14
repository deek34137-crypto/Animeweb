// src/types/opossum.d.ts
declare module 'opossum' {
  class CircuitBreaker<TI extends any[] = any[], TR = any> {
    constructor(action: (...args: TI) => Promise<TR>, options?: any);
    fire(...args: TI): Promise<TR>;
    fallback(fallbackFn: (...args: any[]) => any): void;
    on(event: 'open' | 'halfOpen' | 'close' | 'fallback', callback: (...args: any[]) => void): this;
  }
  export default CircuitBreaker;
}
