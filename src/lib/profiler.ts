// src/lib/profiler.ts
// Simple profiling utility that logs timing information as JSON lines.
// Use startTimer(name) to begin, timer.mark(label) to add intermediate markers,
// and timer.finish() to output total duration.

export type Timer = {
  mark: (label: string) => void;
  finish: () => void;
};

export function startTimer(name: string): Timer {
  const start = Date.now();
  const marks: { label: string; time: number }[] = [];
  return {
    mark(label: string) {
      marks.push({ label, time: Date.now() - start });
    },
    finish() {
      const total = Date.now() - start;
      const payload = {
        event: "profile",
        name,
        totalMs: total,
        marks,
        timestamp: new Date().toISOString(),
      };
      console.log(JSON.stringify(payload));
    },
  };
}
