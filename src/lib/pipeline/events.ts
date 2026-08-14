// src/lib/pipeline/events.ts
import { EventEmitter } from 'events';

// Central event bus for pipeline components.
export const eventEmitter = new EventEmitter();

/**
 * Publish an event to the pipeline event bus.
 */
export function publishEvent(eventName: string, payload: any) {
  eventEmitter.emit(eventName, payload);
}
