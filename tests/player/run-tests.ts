// Mock React globally for all player tests before any ES Modules load
const Module = require('module');
const originalRequire = Module.prototype.require;

let states: any[] = [];
let stateIndex = 0;
let effects: any[] = [];
let effectIndex = 0;
let renderFn: (() => void) | null = null;

const mockReact = {
  useRef: (val: any) => {
    const idx = stateIndex++;
    if (states[idx] === undefined) {
      states[idx] = { current: val };
    }
    return states[idx];
  },
  useState: (initialVal: any) => {
    const idx = stateIndex++;
    if (states[idx] === undefined) {
      states[idx] = initialVal;
    }
    const setter = (newVal: any) => {
      const oldVal = states[idx];
      const nextVal = typeof newVal === 'function' ? newVal(oldVal) : newVal;
      if (oldVal === nextVal) return;
      states[idx] = nextVal;
      if (renderFn) {
        // Defuse synchronous infinite call-stack recursion via microtask scheduling
        Promise.resolve().then(() => {
          if (renderFn) {
            stateIndex = 0;
            effectIndex = 0;
            renderFn();
          }
        });
      }
    };
    return [states[idx], setter];
  },
  useEffect: (cb: any, deps?: any[]) => {
    const idx = effectIndex++;
    const prevEffect = effects[idx];
    let changed = true;
    if (prevEffect && deps && prevEffect.lastDeps) {
      changed = !deps.every((x, i) => x === prevEffect.lastDeps![i]);
    }
    if (changed) {
      if (prevEffect && prevEffect.cleanup) {
        try { prevEffect.cleanup(); } catch {}
      }
      const cleanup = cb();
      effects[idx] = { cb, deps, lastDeps: deps, cleanup };
    } else if (prevEffect) {
      prevEffect.lastDeps = deps;
    }
  },
  useCallback: (fn: any) => fn,
  useMemo: (fn: any) => fn(),
  createContext: () => ({}),
  useContext: () => ({}),
};

Module.prototype.require = function (this: any, name: string) {
  if (name === 'react') {
    return mockReact;
  }
  return originalRequire.apply(this, arguments);
};

// Global centralized event listener registry and dispatchers
const eventListeners: Record<string, ((e: any) => void)[]> = {};

global.window = {
  addEventListener: (event: string, cb: any) => {
    eventListeners[event] = eventListeners[event] || [];
    eventListeners[event].push(cb);
  },
  removeEventListener: (event: string, cb: any) => {
    if (eventListeners[event]) {
      eventListeners[event] = eventListeners[event].filter(x => x !== cb);
    }
  },
} as any;

global.requestAnimationFrame = (cb: any) => setTimeout(cb, 16) as any;
global.cancelAnimationFrame = (id: any) => clearTimeout(id);
global.window.requestAnimationFrame = global.requestAnimationFrame;
global.window.cancelAnimationFrame = global.cancelAnimationFrame;

global.document = {
  addEventListener: (event: string, cb: any) => {
    eventListeners[event] = eventListeners[event] || [];
    eventListeners[event].push(cb);
  },
  removeEventListener: (event: string, cb: any) => {
    if (eventListeners[event]) {
      eventListeners[event] = eventListeners[event].filter(x => x !== cb);
    }
  },
  get activeElement() {
    return {
      tagName: (global as any).currentActiveElementTag || 'DIV',
      getAttribute: () => null,
    };
  }
} as any;

export function triggerEvent(event: string, payload: any) {
  if (eventListeners[event]) {
    // Clone array to prevent modifications during iteration
    const listeners = [...eventListeners[event]];
    listeners.forEach(cb => {
      try { cb(payload); } catch {}
    });
  }
}

export function clearEventListeners() {
  for (const k in eventListeners) {
    delete eventListeners[k];
  }
  (global as any).currentActiveElementTag = 'DIV';
}

// Global isolated fetch router
let currentFetchMock: ((url: string, init?: any) => any) | null = null;
global.fetch = (async (url: string, init?: any) => {
  console.log(`[TEST FETCH] global.fetch called. url:`, url, `hasMock:`, !!currentFetchMock);
  if (currentFetchMock) {
    try {
      return await currentFetchMock(url, init);
    } catch (e) {
      throw e;
    }
  }
  return { ok: true, json: async () => [] };
}) as any;

export function mockFetch(fn: (url: string, init?: any) => any) {
  currentFetchMock = fn;
}

// Centralized helper to create mock video elements whose listeners route to triggerEvent
export function createMockVideo(currentTime = 0, duration = 100) {
  return {
    currentTime,
    duration,
    paused: false,
    volume: 1.0,
    playbackRate: 1.0,
    addEventListener: (event: string, cb: any) => {
      eventListeners[event] = eventListeners[event] || [];
      eventListeners[event].push(cb);
    },
    removeEventListener: (event: string, cb: any) => {
      if (eventListeners[event]) {
        eventListeners[event] = eventListeners[event].filter(x => x !== cb);
      }
    },
  };
}

export function setupHookTest(render: () => void) {
  states = [];
  effects = [];
  stateIndex = 0;
  effectIndex = 0;
  renderFn = render;
  render();
}

let passed = 0;
let failed = 0;

interface Test {
  name: string;
  fn: () => void | Promise<void>;
}

interface Suite {
  name: string;
  tests: Test[];
}

const suites: Suite[] = [];
let currentSuite: Suite | null = null;

export function describe(name: string, fn: () => void) {
  const suite: Suite = { name, tests: [] };
  suites.push(suite);
  currentSuite = suite;
  fn();
  currentSuite = null;
}

export function it(name: string, fn: () => void | Promise<void>) {
  if (currentSuite) {
    currentSuite.tests.push({ name, fn });
  }
}

export function expect(actual: any) {
  return {
    toBe(expected: any) {
      if (actual !== expected) {
        throw new Error(`Expected ${actual} to be ${expected}`);
      }
    },
    toBeLessThan(expected: number) {
      if (actual >= expected) {
        throw new Error(`Expected ${actual} to be less than ${expected}`);
      }
    },
    toBeGreaterThan(expected: number) {
      if (actual <= expected) {
        throw new Error(`Expected ${actual} to be greater than ${expected}`);
      }
    },
    toBeDefined() {
      if (actual === undefined || actual === null) {
        throw new Error(`Expected value to be defined, but got ${actual}`);
      }
    },
    toBeTruthy() {
      if (!actual) {
        throw new Error(`Expected value to be truthy, but got ${actual}`);
      }
    },
    toBeFalsy() {
      if (actual) {
        throw new Error(`Expected value to be falsy, but got ${actual}`);
      }
    }
  };
}

async function runAll() {
  console.info('=== STARTING PLAYER UNIT TEST SUITE ===');

  // Load and collect tests
  await import('./playback-controls.test');
  await import('./skip-markers.test');
  await import('./resume-progress.test');
  await import('./next-episode.test');
  await import('./subtitles.test');
  await import('./premium-ux.test');

  // Execute collected suites and tests sequentially
  for (const suite of suites) {
    console.log(`\n📦 Suite: ${suite.name}`);
    for (const test of suite.tests) {
      // Reset DOM event listeners and fetch mocks before each test run
      clearEventListeners();
      currentFetchMock = null;

      // Run cleanup on any existing effects from previous test before resetting state
      for (const effect of effects) {
        if (effect && effect.cleanup) {
          try { effect.cleanup(); } catch {}
        }
      }
      states = [];
      effects = [];
      stateIndex = 0;
      effectIndex = 0;
      renderFn = null;

      try {
        await test.fn();
        console.log(`  ✅ PASS: ${test.name}`);
        passed++;
      } catch (error: any) {
        console.error(`  ❌ FAIL: ${test.name}`);
        console.error(`     Reason: ${error.stack || error.message || error}`);
        failed++;
      }
    }
  }

  console.info('\n=== PLAYER TESTS COMPLETED ===');
  console.info(`Passed: ${passed}`);
  console.info(`Failed: ${failed}`);

  if (failed > 0) {
    console.error('Status: FAILURE');
    process.exit(1);
  } else {
    console.info('Status: SUCCESS (All unit tests passed)');
    process.exit(0);
  }
}

// Check if run directly
if (require.main === module) {
  runAll().catch(err => {
    console.error('Runner failed:', err);
    process.exit(1);
  });
}
