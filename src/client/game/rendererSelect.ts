// ---- Renderer selection (easy swap + revert) ------------------------------
// Picks which rendering backend the engine uses, without code changes:
//   • Default                → original 2D canvas renderer
//   • ?renderer=3d in the URL → experimental Three.js 3D renderer (sticky:
//                               remembered in localStorage for later visits)
//   • ?renderer=2d in the URL → force back to 2D (revert)
// To revert entirely, remove the `createThreeRenderer` wiring in HomePage —
// the 2D renderer is the untouched default and nothing else depends on this.

import type { RendererFactory } from './renderer';
import { createThreeRenderer } from './render3d';

export type RendererKind = '2d' | '3d';

const STORAGE_KEY = 'wc2026.renderer';

export function getRendererKind(): RendererKind {
  if (typeof window === 'undefined') return '2d';
  try {
    const param = new URLSearchParams(window.location.search).get('renderer');
    if (param === '3d' || param === '2d') {
      localStorage.setItem(STORAGE_KEY, param);
      return param;
    }
    if (localStorage.getItem(STORAGE_KEY) === '3d') return '3d';
  } catch {
    // Ignore storage/URL access issues and fall back to the 2D default.
  }
  return '2d';
}

/** The renderer factory to hand the engine, or `undefined` to use the default
 *  2D renderer. */
export function selectRendererFactory(): RendererFactory | undefined {
  return getRendererKind() === '3d' ? createThreeRenderer : undefined;
}
