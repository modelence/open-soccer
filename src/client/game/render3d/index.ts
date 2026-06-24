// Entry point for the experimental Three.js renderer. Import the factory and
// pass it to the engine via `opts.createRenderer` to render the match in 3D.

import type { RendererFactory } from '../renderer';
import { ThreeRenderer } from './ThreeRenderer';

export const createThreeRenderer: RendererFactory = (canvas) =>
  new ThreeRenderer(canvas);

export { ThreeRenderer } from './ThreeRenderer';
