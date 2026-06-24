// ---- Field ↔ Three.js world mapping ---------------------------------------
// The simulation lives on a 2D field plane measured in PIXELS:
//   x ∈ [0, FIELD_W]  (goal-to-goal, attacking right)
//   y ∈ [0, FIELD_H]  (touchline-to-touchline; larger y = nearer the camera)
//   ball.z            = height ABOVE the grass, in the same pixel scale
//
// The 3D world is measured in METRES, centred on the centre spot, with the
// standard Three.js axes: +X to the right (along the pitch length), +Y up,
// +Z toward the near touchline (= increasing field-y). So a player's field
// position maps to (worldX, 0, worldZ) and height maps to +Y.

import { PX_PER_M, FIELD_W, FIELD_H } from '../constants';

/** Pitch dimensions in metres. */
export const FIELD_W_M = FIELD_W / PX_PER_M; // ≈ 105
export const FIELD_H_M = FIELD_H / PX_PER_M; // ≈ 68

export function pxToM(px: number): number {
  return px / PX_PER_M;
}

/** Field-x (px) → world-X (m), centred. */
export function worldX(fx: number): number {
  return (fx - FIELD_W / 2) / PX_PER_M;
}

/** Field-y (px) → world-Z (m), centred. */
export function worldZ(fy: number): number {
  return (fy - FIELD_H / 2) / PX_PER_M;
}
