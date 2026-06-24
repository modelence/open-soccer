// ---- 2D canvas renderer adapter -------------------------------------------
// Wraps the original `renderScene` (render.ts) in the `GameRenderer` interface
// so it can be selected interchangeably with the Three.js renderer. This keeps
// `render.ts` itself completely untouched — this file is the only glue.

import { renderScene } from './render';
import type { GameRenderer, Scene } from './renderer';

export class Canvas2DRenderer implements GameRenderer {
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
  }

  render(scene: Scene) {
    renderScene(this.ctx, scene);
  }

  dispose() {
    // The 2D context needs no teardown.
  }
}
