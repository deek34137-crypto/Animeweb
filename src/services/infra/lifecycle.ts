// src/services/infra/lifecycle.ts

/**
 * Application lifecycle state management.
 *
 * States:
 *   Starting     → /ready returns 503
 *   Ready        → /ready returns 200
 *   ShuttingDown → /ready returns 503
 */

export type LifecycleState = 'starting' | 'ready' | 'shutting_down';

let currentState: LifecycleState = 'starting';

export function getLifecycleState(): LifecycleState {
  return currentState;
}

export function setLifecycleState(state: LifecycleState): void {
  currentState = state;
}
