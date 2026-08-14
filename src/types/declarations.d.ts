// src/types/declarations.d.ts

declare module 'ioredis' {
  import { EventEmitter } from 'events';
  class Redis extends EventEmitter {
    constructor(url: string, options?: any);
    connect(): Promise<void>;
    ping(): Promise<string>;
    disconnect(): void;
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<string>;
    setex(key: string, seconds: number, value: string): Promise<string>;
    del(key: string): Promise<number>;
    publish(channel: string, message: string): Promise<number>;
    subscribe(channel: string): Promise<number>;
    eval(script: string, numKeys: number, ...args: any[]): Promise<any>;
    incr(key: string): Promise<number>;
    expire(key: string, seconds: number): Promise<number>;
    scan(cursor: string, ...args: any[]): Promise<[string, string[]]>;
    mget(keys: string[]): Promise<any[]>;
  }
  export default Redis;
}

declare module 'meilisearch' {
  export class Meilisearch {
    constructor(config: { host: string; apiKey?: string });
    index(uid: string): {
      search(query: string, options?: any): Promise<{ hits: any[] }>;
      getStats(): Promise<{ numberOfDocuments: number }>;
      addDocuments(documents: any[]): Promise<{ taskUid: number }>;
      updateSettings(settings: any): Promise<any>;
    };
    swapIndexes(params: Array<{ indexes: [string, string]; rename: boolean }>): Promise<any>;
    isHealthy(): Promise<boolean>;
    getTask(taskUid: number): Promise<any>;
    deleteIndex(uid: string): Promise<any>;
  }
}

declare module 'bullmq' {
  import { EventEmitter } from 'events';
  export class Queue extends EventEmitter {
    constructor(name: string, options?: { connection: { url: string } });
    add(name: string, data: any, options?: { priority?: number; jobId?: string }): Promise<any>;
  }
  export class Worker extends EventEmitter {
    constructor(
      name: string,
      processor: (job: Job) => Promise<void>,
      options?: { connection: { url: string }; concurrency?: number }
    );
    close(): Promise<void>;
  }
  export class Job {
    id: string;
    data: any;
  }
}

declare module 'prom-client' {
  export class Counter {
    constructor(options: any);
    inc(labels?: any, value?: number): void;
  }
  export class Histogram {
    constructor(options: any);
    observe(labels: any, value: number): void;
    startTimer(labels?: any): (labels?: any) => void;
  }
  export class Gauge {
    constructor(options: any);
    set(labels: any, value: number): void;
    inc(labels: any, value?: number): void;
    dec(labels: any, value?: number): void;
  }
  export const register: {
    metrics(): Promise<string>;
    contentType: string;
  };
  export function collectDefaultMetrics(options?: any): void;
  const client: {
    Counter: typeof Counter;
    Histogram: typeof Histogram;
    Gauge: typeof Gauge;
    register: typeof register;
    collectDefaultMetrics: typeof collectDefaultMetrics;
  };
  export default client;
}

declare module '@opentelemetry/sdk-node' {
  export class NodeSDK {
    constructor(config: any);
    start(): void;
    shutdown(): Promise<void>;
  }
}

declare module '@opentelemetry/auto-instrumentations-node' {
  export function getNodeAutoInstrumentations(config?: any): any;
}
