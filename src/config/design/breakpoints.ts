import { Primitives } from './primitives';

export const Breakpoints = Primitives.breakpoints;

export type BreakpointName = keyof typeof Breakpoints;
