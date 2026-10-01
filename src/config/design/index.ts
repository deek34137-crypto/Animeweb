import { Primitives } from './primitives';
import { Semantic } from './semantic';
import { Surface } from './surfaces';
import { Elevation } from './elevation';
import { Interaction } from './interaction';
import { Motion, MotionIntent, MotionConfigs } from './motion';
import { Typography } from './typography';
import { Breakpoints } from './breakpoints';
import { Animation } from './animation';
import { Layout } from './layout';

export const DesignSystem = {
  Primitives,
  Semantic,
  Surface,
  Elevation,
  Interaction,
  Motion,
  MotionIntent,
  MotionConfigs,
  Typography,
  Breakpoints,
  Animation,
  Layout,
} as const;

export type { SurfaceName } from './surfaces';
export type { ElevationName } from './elevation';
export type { MotionIntentType } from './motion';
export type { BreakpointName } from './breakpoints';
export type { DensityName } from './layout';

export { Primitives, Semantic, Surface, Elevation, Interaction, Motion, MotionIntent, MotionConfigs, Typography, Breakpoints, Animation, Layout };
