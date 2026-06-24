// ---- Renderer abstraction -------------------------------------------------
// The engine builds a `Scene` snapshot each frame (see `render.ts`) and hands
// it to a renderer. This tiny interface lets us swap the rendering backend
// (the original 2D canvas renderer vs. the experimental Three.js 3D renderer)
// WITHOUT touching any gameplay/simulation code. A renderer owns its own
// drawing context on the supplied canvas and cleans up after itself.

import type { Scene } from './render';

export type { Scene } from './render';

export interface GameRenderer {
  /** Draw one frame from the engine's world snapshot. */
  render(scene: Scene): void;
  /** Release any GPU/context resources. Called when the game is torn down. */
  dispose(): void;
}

/** Builds a renderer bound to a specific canvas. */
export type RendererFactory = (canvas: HTMLCanvasElement) => GameRenderer;
