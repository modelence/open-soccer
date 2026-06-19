// ---- Renderer -------------------------------------------------------------
// Pure "world snapshot → pixels". No game state lives here: the engine builds a
// `Scene` each frame and hands it to `renderScene`. Rendering uses a pseudo-3D
// TV broadcast camera (perspective trapezoid pitch, upright animated sprites
// scaled by depth) — 16-bit FIFA / ISS style.

import { clamp, shade } from './math';
import {
  proj,
  setCamera,
  S_FAR,
  ZOOM,
  PITCH_TOP,
  CAM_MIN,
  CAM_MAX,
} from './projection';
import {
  M,
  FIELD_W,
  FIELD_H,
  MARGIN,
  CANVAS_W,
  CANVAS_H,
  GOAL_DEPTH,
  goalTop,
  goalBottom,
  BALL_VIS_SCALE,
  PLAYER_SCALE,
  SPRINT_SPEED,
} from './constants';
import type { PlayerEntity, Vec } from './types';
import type { Kit } from './teams/types';

/** The minimal ball shape the renderer needs. */
export interface BallView {
  x: number;
  y: number;
  z: number;
  r: number;
}

/** Everything the renderer needs for one frame. */
export interface Scene {
  camX: number;
  camY: number;
  ball: BallView;
  /** Away players first, then home — base insertion order before depth sort. */
  players: { p: PlayerEntity; kit: Kit }[];
  controlled: PlayerEntity | null;
  switchHint: PlayerEntity | null;
  /** Per-side net ripple intensity (0..1); bulges/wobbles the net when hit. */
  netRipple: { left: number; right: number };
}

export function renderScene(ctx: CanvasRenderingContext2D, scene: Scene) {
  setCamera(scene.camX, scene.camY); // sync the projection with the engine camera
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  // Stadium backdrop: dark stands above the far touchline.
  const sky = ctx.createLinearGradient(0, 0, 0, PITCH_TOP + 20);
  sky.addColorStop(0, '#05080c');
  sky.addColorStop(1, '#0d1420');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  drawCrowd(ctx, scene.camX);

  drawPitch(ctx, scene.camX);
  drawGoalBack(ctx, 'left', scene.netRipple.left);
  drawGoalBack(ctx, 'right', scene.netRipple.right);

  // Depth-sort all drawables (players + ball) so near covers far.
  type Drawable = { depth: number; draw: () => void };
  const items: Drawable[] = [];
  for (const { p, kit } of scene.players) {
    // Cull players well outside the camera view.
    const px = proj(p.x, p.y).x;
    if (px < -60 || px > CANVAS_W + 60) continue;
    items.push({
      depth: p.y,
      draw: () => drawHumanoid(ctx, p, kit, scene.controlled, scene.switchHint),
    });
  }
  items.push({ depth: scene.ball.y, draw: () => drawBall(ctx, scene.ball) });
  items.sort((a, b) => a.depth - b.depth);
  for (const it of items) it.draw();

  drawGoalFront(ctx, 'left');
  drawGoalFront(ctx, 'right');
  // The power gauge is rendered in React as a thin fill line under the
  // home player's name tag (bottom-left), fed by the HUD `charge` field.
}

/** Crowd dots + hoarding behind the far touchline, with camera parallax. */
function drawCrowd(ctx: CanvasRenderingContext2D, camX: number) {
  // The far touchline moves on screen as the camera pans in depth; anchor the
  // stands + hoarding just above it so they track the pitch.
  const farY = proj(0, 0).y;
  const hoardH = 18;
  const bottom = farY - hoardH; // base of the crowd band (top of hoarding)
  const top = Math.max(-40, bottom - 150); // tall stands above
  ctx.fillStyle = '#101a28';
  ctx.fillRect(0, top, CANVAS_W, bottom - top);
  // Stands pan with the camera at the far-line rate (parallax).
  const farScale = S_FAR * ZOOM;
  const offset = -(camX - FIELD_W / 2) * farScale;
  const span = (CAM_MAX - CAM_MIN) * farScale + CANVAS_W + 100;
  const x0 = -(CAM_MAX - FIELD_W / 2) * farScale - 50;
  // Deterministic pseudo-random dots (no per-frame flicker).
  for (let i = 0; i < 760; i++) {
    const n = Math.sin(i * 127.1) * 43758.5453;
    const fx = n - Math.floor(n);
    const n2 = Math.sin(i * 311.7) * 12543.123;
    const fy = n2 - Math.floor(n2);
    const x = x0 + fx * span + offset;
    if (x < -4 || x > CANVAS_W + 4) continue;
    const y = top + 6 + fy * (bottom - top - 12);
    const shadeAmt = 0.10 + ((i * 37) % 23) / 23 * 0.22;
    ctx.fillStyle = `rgba(180,200,230,${shadeAmt.toFixed(3)})`;
    ctx.fillRect(x, y, 2, 2);
  }
  // Hoarding strip between crowd and pitch.
  ctx.fillStyle = '#0a0f16';
  ctx.fillRect(0, bottom, CANVAS_W, farY - bottom);
  ctx.fillStyle = 'rgba(198,255,46,0.55)';
  ctx.font = '700 11px Oswald, sans-serif';
  ctx.textAlign = 'center';
  for (let x = x0; x < x0 + span; x += 220) {
    const sx = x + offset;
    if (sx < -110 || sx > CANVAS_W + 110) continue;
    ctx.fillText('W O R L D   C U P   2 0 2 6', sx, bottom + hoardH / 2 + 4);
  }
}

/** Trace a polygon of projected field points. */
function projPath(ctx: CanvasRenderingContext2D, pts: Vec[], close = true) {
  ctx.beginPath();
  pts.forEach((pt, i) => {
    const q = proj(pt.x, pt.y);
    if (i === 0) ctx.moveTo(q.x, q.y);
    else ctx.lineTo(q.x, q.y);
  });
  if (close) ctx.closePath();
}

/**
 * Like `projPath`, but subdivides each segment so depth-running edges follow
 * the projection's vertical bow instead of cutting a straight screen chord.
 * The projection maps a constant-x field line (goal line, halfway line, box
 * edge) to a CURVE — drawing it as a 2-point chord makes posts/boxes that are
 * placed at their true projected positions appear to float off the line.
 */
function projPathSmooth(
  ctx: CanvasRenderingContext2D,
  pts: Vec[],
  close = true,
  steps = 12,
) {
  const segCount = close ? pts.length : pts.length - 1;
  const dense: Vec[] = [];
  for (let i = 0; i < segCount; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      dense.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  if (!close) dense.push(pts[pts.length - 1]);
  projPath(ctx, dense, close);
}

function drawPitch(ctx: CanvasRenderingContext2D, camX: number) {
  // Grass apron slightly beyond the lines, with a depth gradient (darker
  // toward the far line for an under-lights TV look).
  const apronTop = proj(0, -26).y;
  const apronBot = proj(0, FIELD_H + 34).y;
  const apronGrad = ctx.createLinearGradient(0, apronTop, 0, apronBot);
  apronGrad.addColorStop(0, '#16562c');
  apronGrad.addColorStop(1, '#1f7a3f');
  projPath(ctx, [
    { x: -MARGIN, y: -26 },
    { x: FIELD_W + MARGIN, y: -26 },
    { x: FIELD_W + MARGIN, y: FIELD_H + 34 },
    { x: -MARGIN, y: FIELD_H + 34 },
  ]);
  ctx.fillStyle = apronGrad;
  ctx.fill();

  // Mow stripes (vertical bands). Each band gets its own vertical depth
  // gradient so the turf reads as lit from the near side.
  const stripes = 20;
  const sw = FIELD_W / stripes;
  const pitchTopY = proj(0, 0).y;
  const pitchBotY = proj(0, FIELD_H).y;
  for (let i = 0; i < stripes; i++) {
    projPath(ctx, [
      { x: i * sw, y: 0 },
      { x: (i + 1) * sw, y: 0 },
      { x: (i + 1) * sw, y: FIELD_H },
      { x: i * sw, y: FIELD_H },
    ]);
    const g = ctx.createLinearGradient(0, pitchTopY, 0, pitchBotY);
    if (i % 2 === 0) {
      g.addColorStop(0, '#1e7038');
      g.addColorStop(1, '#2f9351');
    } else {
      g.addColorStop(0, '#1a6733');
      g.addColorStop(1, '#298a49');
    }
    ctx.fillStyle = g;
    ctx.fill();
  }

  // Real-grass speckle: many tiny deterministic flecks (lighter + darker
  // than the turf) scattered across the visible pitch, denser/larger near
  // the camera and sparser/smaller toward the far line — emulating blades
  // of grass rather than a smooth fill. Only flecks inside the camera view
  // are drawn (cheap), and the pattern is stable frame-to-frame.
  drawGrassSpeckle(ctx, camX);

  ctx.strokeStyle = 'rgba(255,255,255,0.82)';
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';

  // Touchlines + goal lines. The goal lines run in depth (constant x) so they
  // must be sampled to follow the projection's bow — otherwise the posts and
  // boxes (drawn at true projected positions) float off a straight chord.
  projPathSmooth(ctx, [
    { x: 0, y: 0 },
    { x: FIELD_W, y: 0 },
    { x: FIELD_W, y: FIELD_H },
    { x: 0, y: FIELD_H },
  ]);
  ctx.stroke();

  // Halfway line (constant x → sampled).
  projPathSmooth(ctx, [
    { x: FIELD_W / 2, y: 0 },
    { x: FIELD_W / 2, y: FIELD_H },
  ], false);
  ctx.stroke();

  // Centre circle: radius 9.15 m (projected → ellipse-ish, sampled).
  const circleR = M(9.15);
  strokeArc(ctx, FIELD_W / 2, FIELD_H / 2, circleR, 0, Math.PI * 2);
  spot(ctx, FIELD_W / 2, FIELD_H / 2);

  // Penalty area: 40.32 m × 16.5 m. Goal area (six-yard): 18.32 m × 5.5 m.
  const boxH = M(40.32); // penalty-area width (along the goal line)
  const boxW = M(16.5); // penalty-area depth (into the pitch)
  const sixH = M(18.32); // goal-area width
  const sixW = M(5.5); // goal-area depth
  const pkX = M(11); // penalty spot: 11 m from the goal line
  const by = (FIELD_H - boxH) / 2;
  const sy = (FIELD_H - sixH) / 2;
  for (const left of [true, false]) {
    const gx = left ? 0 : FIELD_W;
    const dir = left ? 1 : -1;
    projPathSmooth(ctx, [
      { x: gx, y: by },
      { x: gx + dir * boxW, y: by },
      { x: gx + dir * boxW, y: by + boxH },
      { x: gx, y: by + boxH },
    ], false);
    ctx.stroke();
    projPathSmooth(ctx, [
      { x: gx, y: sy },
      { x: gx + dir * sixW, y: sy },
      { x: gx + dir * sixW, y: sy + sixH },
      { x: gx, y: sy + sixH },
    ], false);
    ctx.stroke();
    // Penalty spot + the "D" arc (radius 9.15 m from the spot) poking out
    // of the box past its edge.
    const px = gx + dir * pkX;
    spot(ctx, px, FIELD_H / 2);
    const cos = (boxW - pkX) / circleR; // where the arc crosses the box edge
    const a = Math.acos(clamp(cos, -1, 1));
    if (left) strokeArc(ctx, px, FIELD_H / 2, circleR, -a, a);
    else strokeArc(ctx, px, FIELD_H / 2, circleR, Math.PI - a, Math.PI + a);
  }

  // Corner arcs: 1 m radius.
  const cornerR = M(1);
  for (const cx of [0, FIELD_W]) {
    for (const cy of [0, FIELD_H]) {
      const a0 = cx === 0 ? 0 : Math.PI;
      const sign = cy === 0 ? 1 : -1;
      strokeArc(ctx, cx, cy, cornerR, a0, a0 + sign * (Math.PI / 2));
    }
  }
  ctx.lineJoin = 'miter';

  // Soft vignette so the framed view feels like a broadcast camera.
  const vg = ctx.createRadialGradient(
    CANVAS_W / 2, CANVAS_H * 0.46, CANVAS_H * 0.3,
    CANVAS_W / 2, CANVAS_H * 0.5, CANVAS_H * 0.95,
  );
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.34)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, PITCH_TOP - 20, CANVAS_W, CANVAS_H - PITCH_TOP + 20);
}

/** Stroke a field-space circle/arc sampled through the projection. */
function strokeArc(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  a0: number,
  a1: number,
) {
  const pts: Vec[] = [];
  const steps = 36;
  for (let i = 0; i <= steps; i++) {
    const a = a0 + (a1 - a0) * (i / steps);
    pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  projPath(ctx, pts, false);
  ctx.stroke();
}

/** A small filled pitch marking (centre/penalty spot). */
function spot(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const q = proj(x, y);
  ctx.fillStyle = 'rgba(255,255,255,0.88)';
  ctx.beginPath();
  ctx.arc(q.x, q.y, M(0.12) * q.s, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Procedural grass blades: a stable grid of short tufts, each jittered by
 * a deterministic hash so the turf looks speckled/bladed rather than flat.
 * Field-space cells (~26px) keep density uniform on the ground; projection
 * naturally makes near tufts bigger and far tufts smaller. Only cells
 * inside the horizontal camera view are visited.
 */
function drawGrassSpeckle(ctx: CanvasRenderingContext2D, camX: number) {
  const cell = 26;
  // Visible field-x span for the current camera (+ a small margin).
  const halfView = CANVAS_W / 2 / S_FAR + cell;
  const x0 = Math.max(0, Math.floor((camX - halfView) / cell) * cell);
  const x1 = Math.min(FIELD_W, camX + halfView);

  ctx.lineCap = 'round';
  for (let gx = x0; gx < x1; gx += cell) {
    for (let gy = 0; gy < FIELD_H; gy += cell) {
      // Deterministic per-cell pseudo-random values.
      const h = Math.sin(gx * 12.9898 + gy * 78.233) * 43758.5453;
      const r1 = h - Math.floor(h);
      const h2 = Math.sin(gx * 39.346 + gy * 11.135) * 24634.633;
      const r2 = h2 - Math.floor(h2);
      const h3 = Math.sin(gx * 73.156 + gy * 52.235) * 9871.123;
      const r3 = h3 - Math.floor(h3);

      const fxp = gx + r1 * cell;
      const fyp = gy + r2 * cell;
      const q = proj(fxp, fyp);
      if (q.x < -6 || q.x > CANVAS_W + 6) continue;

      // A short blade leaning slightly, lighter or darker than the turf.
      const len2 = (1.4 + r3 * 1.8) * q.s;
      const leanX = (r1 - 0.5) * 1.6 * q.s;
      ctx.strokeStyle =
        r3 > 0.5
          ? `rgba(190,230,150,${0.05 + r2 * 0.05})`
          : `rgba(8,40,18,${0.06 + r1 * 0.06})`;
      ctx.lineWidth = 0.8 * q.s;
      ctx.beginPath();
      ctx.moveTo(q.x, q.y);
      ctx.lineTo(q.x + leanX, q.y - len2);
      ctx.stroke();
    }
  }
  ctx.lineCap = 'butt';
}

// Goal frame: posts stand upright on screen; the mouth spans depth
// (goalTop..goalBottom). Net + back structure drawn behind players,
// front posts + crossbar drawn in front.
function goalGeom(side: 'left' | 'right') {
  const gx = side === 'left' ? 0 : FIELD_W;
  const backX = side === 'left' ? -GOAL_DEPTH : FIELD_W + GOAL_DEPTH;
  const far = proj(gx, goalTop);
  const near = proj(gx, goalBottom);
  const backFar = proj(backX, goalTop + 10);
  const backNear = proj(backX, goalBottom - 10);
  const postH = (s: number) => M(2.44) * s; // crossbar height = 2.44 m
  return { far, near, backFar, backNear, postH };
}

type Pt = { x: number; y: number };

/** Bilinear blend of four screen corners (u: far→near, v: bottom→top). */
function bilerp(
  c00: Pt, c10: Pt, c01: Pt, c11: Pt, u: number, v: number,
): Pt {
  const bx =
    c00.x * (1 - u) * (1 - v) + c10.x * u * (1 - v) +
    c01.x * (1 - u) * v + c11.x * u * v;
  const by =
    c00.y * (1 - u) * (1 - v) + c10.y * u * (1 - v) +
    c01.y * (1 - u) * v + c11.y * u * v;
  return { x: bx, y: by };
}

/** Draw a quad as a wire mesh, optionally displacing each vertex (for ripple).
 *  Corners: bottom-far, bottom-near, top-far, top-near. */
function netMesh(
  ctx: CanvasRenderingContext2D,
  bf: Pt, bn: Pt, tf: Pt, tn: Pt,
  nu: number, nv: number,
  disp?: (u: number, v: number) => Pt,
) {
  const at = (u: number, v: number) => {
    const p = bilerp(bf, bn, tf, tn, u, v);
    if (disp) {
      const d = disp(u, v);
      p.x += d.x;
      p.y += d.y;
    }
    return p;
  };
  for (let i = 0; i <= nu; i++) {
    const u = i / nu;
    ctx.beginPath();
    for (let j = 0; j <= nv; j++) {
      const p = at(u, j / nv);
      j === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
  for (let j = 0; j <= nv; j++) {
    const v = j / nv;
    ctx.beginPath();
    for (let i = 0; i <= nu; i++) {
      const p = at(i / nu, v);
      i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
  }
}

function drawGoalBack(
  ctx: CanvasRenderingContext2D,
  side: 'left' | 'right',
  ripple: number,
) {
  const { far, near, backFar, backNear, postH } = goalGeom(side);

  // Front frame corners (on the goal line) and back frame corners. The net
  // slopes DOWN at the back (0.82 of the front height) like a real goal.
  const fBot = { x: far.x, y: far.y };
  const fTop = { x: far.x, y: far.y - postH(far.s) };
  const nBot = { x: near.x, y: near.y };
  const nTop = { x: near.x, y: near.y - postH(near.s) };
  const bfBot = { x: backFar.x, y: backFar.y };
  const bfTop = { x: backFar.x, y: backFar.y - postH(backFar.s) * 0.82 };
  const bnBot = { x: backNear.x, y: backNear.y };
  const bnTop = { x: backNear.x, y: backNear.y - postH(backNear.s) * 0.82 };

  // Ripple: when the ball hits, the WHOLE net shudders for a moment — back,
  // roof and both sides. Each panel is pinned to the rigid frame (posts,
  // crossbar, front mouth) and billows most toward the back where the ball
  // struck. `out` = away from the pitch; `wobAt` is the travelling shimmer.
  const out = side === 'left' ? -1 : 1;
  const tnow = performance.now() / 1000;
  const active = ripple > 0.001;
  const wobAt = (phase: number) => Math.cos(tnow * 26 - phase) * 0.5 + 0.6;

  // Back panel: bulges outward + sags down, bell-shaped (pinned all 4 edges).
  const backDisp = active
    ? (u: number, v: number) => {
        const shape =
          Math.sin(Math.PI * u) * Math.sin(Math.PI * Math.min(1, v + 0.15));
        const k = ripple * 16 * shape * wobAt(u * 4);
        return { x: out * k, y: k * 0.35 };
      }
    : undefined;

  // Roof: u = far→near, v = front(crossbar)→back. Sags down, pinned at the
  // crossbar (v=0) and the far/near edges, deepest toward the back.
  const roofDisp = active
    ? (u: number, v: number) => {
        const shape = Math.sin(Math.PI * u) * v;
        const k = ripple * 13 * shape * wobAt(u * 4 + 1);
        return { x: out * k * 0.4, y: k * 0.8 };
      }
    : undefined;

  // Sides: u = front(post)→back, v = bottom→top. Billow outward + flutter,
  // pinned at the front post (u=0) and top/bottom rails, strongest at the back.
  const sideDisp = active
    ? (u: number, v: number) => {
        const shape = u * Math.sin(Math.PI * v);
        const k = ripple * 12 * shape * wobAt(u * 4 + 2);
        return { x: out * k * 0.7, y: k * 0.4 };
      }
    : undefined;

  ctx.strokeStyle = 'rgba(255,255,255,0.30)';
  ctx.lineWidth = 1;
  ctx.lineJoin = 'round';

  // Back panel.
  netMesh(ctx, bfBot, bnBot, bfTop, bnTop, 6, 4, backDisp);
  // Roof panel (crossbar → back-top).
  netMesh(ctx, fTop, nTop, bfTop, bnTop, 5, 3, roofDisp);
  // Far side panel (far post → back-far).
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  netMesh(ctx, fBot, bfBot, fTop, bfTop, 3, 4, sideDisp);
  // Near side panel (near post → back-near) — closest to camera, brighter.
  ctx.strokeStyle = 'rgba(255,255,255,0.34)';
  netMesh(ctx, nBot, bnBot, nTop, bnTop, 3, 4, sideDisp);
}

function drawGoalFront(ctx: CanvasRenderingContext2D, side: 'left' | 'right') {
  const { far, near, postH } = goalGeom(side);
  ctx.strokeStyle = '#f2f5f8';
  ctx.lineCap = 'round';

  // Far post (thinner), near post (thicker), crossbar.
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(far.x, far.y);
  ctx.lineTo(far.x, far.y - postH(far.s));
  ctx.stroke();

  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(near.x, near.y);
  ctx.lineTo(near.x, near.y - postH(near.s));
  ctx.stroke();

  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(far.x, far.y - postH(far.s));
  ctx.lineTo(near.x, near.y - postH(near.s));
  ctx.stroke();
  ctx.lineCap = 'butt';
}

function drawBall(ctx: CanvasRenderingContext2D, ball: BallView) {
  const q = proj(ball.x, ball.y);
  const z = ball.z;
  // Height in screen pixels (same projection scale as horizontal distance).
  const lift = z * q.s;
  // BALL_VIS_SCALE oversizes the *drawn* ball ~30% over its true 0.22 m radius
  // (collision/physics still use the real radius) — football games do this so
  // the ball reads clearly and "feels" right, instead of being a tiny dot.
  const baseR = ball.r * BALL_VIS_SCALE * q.s;
  // The ball appears a touch bigger the higher (closer to camera) it flies —
  // but only subtly (≈+18% at the apex), not ballooning to several times its
  // size like the old 0.012/m factor did.
  const r = baseR * (1 + Math.min(z, M(8)) * 0.0022);

  // Shadow on the grass at the ground point. It shrinks + fades a little as
  // the ball climbs so height still reads, but it stays generously sized and
  // visible so you can always track where an airborne ball will land.
  const hf = 1 / (1 + z * 0.012);
  ctx.fillStyle = `rgba(0,0,0,${0.18 + 0.24 * hf})`;
  ctx.beginPath();
  ctx.ellipse(q.x + 2 + lift * 0.12, q.y + 1.5, baseR * 1.5 * hf, baseR * 0.6 * hf, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ball sits slightly above its ground point, plus its airborne height.
  const by = q.y - r * 0.7 - lift;
  const grad = ctx.createRadialGradient(q.x - r * 0.35, by - r * 0.35, r * 0.2, q.x, by, r);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(1, '#c9ced6');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(q.x, by, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Rolling panel hint.
  const roll = (ball.x + ball.y) * 0.12;
  ctx.strokeStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.arc(q.x, by, r * 0.55, roll, roll + Math.PI * 1.2);
  ctx.stroke();
}

// ---- upright humanoid sprite ---------------------------------------------

/**
 * Procedural upright footballer for the broadcast view. Drawn at the
 * player's foot position, scaled by depth. Legs scissor with the run
 * cycle, arms counter-swing, a kick pose extends the striking leg, and
 * facing is conveyed by mirroring + head orientation.
 */
function drawHumanoid(
  ctx: CanvasRenderingContext2D,
  p: PlayerEntity,
  kit: Kit,
  controlled: PlayerEntity | null,
  switchHint: PlayerEntity | null,
) {
  const q = proj(p.x, p.y);
  const s = q.s;
  const speed = Math.hypot(p.vx, p.vy);
  const moving = speed > 30;
  const swing = moving ? Math.sin(p.animPhase) : 0;
  const kicking = p.kickTimer > 0;
  // Keeper dive: a full-body lay-out toward diveDir. Progress ramps the body
  // from upright to horizontal and lifts it off the turf (an airborne arc that
  // rises then lands over the ~0.6s pose).
  const diving = (p.diveTimer ?? 0) > 0;
  const diveDir = p.diveDir ?? 1;
  const diveT = diving ? clamp(1 - (p.diveTimer ?? 0) / 0.6, 0, 1) : 0;
  const diveLayout = diving ? Math.sin(Math.min(diveT * 1.3, 1) * (Math.PI / 2)) : 0;
  const diveAirborne = diving ? Math.sin(Math.min(diveT, 1) * Math.PI) : 0;
  // The keeper dives ALONG THE GOAL MOUTH (world-y), which is perpendicular to
  // the shot (world-x). The TV camera renders world-y as (mostly) the vertical
  // screen axis, so we must lay the body out along the *projected* goal-mouth
  // direction — NOT along screen-x, which would be diving back along the shot.
  let diveSx = 0;
  let diveSy = 0;
  if (diving) {
    const qd = proj(p.x, p.y + diveDir * 40);
    diveSx = qd.x - q.x;
    diveSy = qd.y - q.y;
    const dl = Math.hypot(diveSx, diveSy) || 1;
    diveSx /= dl;
    diveSy /= dl;
  }

  const fx = p.facing.x;
  const fy = p.facing.y;
  // Horizontal mirror: face left or right on screen.
  const side = fx >= 0 ? 1 : -1;
  // How much the player faces toward/away from the camera.
  const toward = clamp(fy, -1, 1);

  // Ground decorations (not scaled by ctx transform — drawn in screen px).
  const gs = s * PLAYER_SCALE;

  // Shadow (fades and spreads as a diving keeper leaves the ground).
  ctx.fillStyle = `rgba(0,0,0,${0.28 - diveAirborne * 0.18})`;
  ctx.beginPath();
  ctx.ellipse(
    q.x + 2 * gs + diveSx * diveLayout * 13 * gs,
    q.y + 1.5 * gs + diveSy * diveLayout * 13 * gs,
    (11 + Math.abs(diveSx) * diveLayout * 6) * gs,
    (4 + Math.abs(diveSy) * diveLayout * 3) * gs,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();

  ctx.save();
  ctx.translate(q.x, q.y);
  ctx.scale(gs, gs);
  if (diving) {
    // Leap along the projected goal-mouth direction (perpendicular to the shot)
    // and lift the body off the turf. The body tilts toward the dive side; the
    // sideways component drives a full lay-out, while a dive up/down the mouth
    // (small screen-x component) reads as a leap with a gentle lean.
    ctx.translate(diveSx * diveLayout * 13, diveSy * diveLayout * 13 - diveAirborne * 9);
    ctx.rotate(diveSx * diveLayout * 1.5);
  } else {
    // Lean into the run direction for a sense of momentum.
    const lean = moving ? clamp(p.vx / SPRINT_SPEED, -1, 1) * 0.13 : 0;
    ctx.rotate(lean);
  }

  // Anatomy anchors in REAL human proportion (figure ≈ 7.5 heads tall).
  // Crotch sits near mid-height (legs ≈ 0.47H ≈ 0.87m), shoulders at 0.82H
  // (≈1.52m), head centre at 0.92H. Was hip 0.42 / shoulder 0.78 — that
  // made the legs ~12% short and the torso long.
  const H = 44; // body height at scale 1 (≈1.85m via PLAYER_SCALE)
  const hipY = -H * 0.47;
  const shoulderY = -H * 0.82;
  const headY = -H * 0.92;
  const bob = moving ? -Math.abs(Math.sin(p.animPhase)) * 1.6 : 0;

  // Leg stride vector on screen: mostly horizontal when running across,
  // shorter when running into/out of the screen.
  const strideX = fx * 6.5;
  const strideY = fy * 2.6;

  let f1x = swing * strideX;
  let f1y = swing * strideY;
  let f2x = -swing * strideX;
  let f2y = -swing * strideY;
  let f1Lift = moving ? Math.max(0, Math.sin(p.animPhase)) * 3 : 0;
  let f2Lift = moving ? Math.max(0, -Math.sin(p.animPhase)) * 3 : 0;
  if (kicking) {
    f1x = fx * 9;
    f1y = fy * 3.5;
    f1Lift = 4.5;
    f2x = -fx * 3;
    f2y = -fy * 1.2;
    f2Lift = 0;
  }

  const sockColor = '#e8ecf2';
  // Two-bone leg: thigh (hip→knee) + shin (knee→foot) solved so the knee
  // bends forward like a real leg. Equal segment lengths; the knee is
  // placed off the hip→foot line by the amount needed to keep both bones
  // rigid, so a lifted/planted foot flexes the knee naturally.
  // Thigh ≈ shin; total leg reach ≈ 21.6u (0.9m) so the foot reaches the
  // ground from the raised hip (0.47H ≈ 20.7u) with a slight standing bend.
  const SEG = 10.8;
  const drawLeg = (
    footX: number,
    footY: number,
    lift: number,
    hipX: number,
    far: boolean,
  ) => {
    const hx = hipX;
    const hy = hipY + bob;
    let fX = footX;
    const fY = footY - lift;

    // Hip→foot, clamped to the leg's reach so the solve is always valid.
    let dx = fX - hx;
    let dy = fY - hy;
    let d = Math.hypot(dx, dy) || 0.001;
    const reach = SEG * 2 - 0.5;
    if (d > reach) {
      fX = hx + (dx / d) * reach;
      dx = fX - hx;
      d = reach;
    }
    const ux = dx / d;
    const uy = dy / d;

    // Knee = along the bone by half, offset perpendicular by the rigid
    // height. Bend forward: the perpendicular's x must match facing.
    const a = d / 2;
    const hgt = Math.sqrt(Math.max(0, SEG * SEG - a * a));
    let px = -uy;
    let py = ux;
    const forward = fx !== 0 ? Math.sign(fx) : side;
    if (px * forward < 0) {
      px = -px;
      py = -py;
    }
    const kneeX = hx + ux * a + px * hgt;
    const kneeY = hy + uy * a + py * hgt;

    const skinC = far ? shade(p.skin, 0.82) : p.skin;
    const sockC = far ? shade(sockColor, 0.86) : sockColor;
    ctx.lineCap = 'round';

    // Thigh (~0.14m).
    ctx.strokeStyle = skinC;
    ctx.lineWidth = 3.3;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(kneeX, kneeY);
    ctx.stroke();

    // Shin (skin upper ~0.11m calf, sock lower tapering to ~0.07m ankle).
    const calfX = kneeX + (fX - kneeX) * 0.4;
    const calfY = kneeY + (fY - kneeY) * 0.4;
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(kneeX, kneeY);
    ctx.lineTo(calfX, calfY);
    ctx.stroke();
    // Sock tapers toward the ankle: draw two segments, thinner near the foot.
    const ankX = calfX + (fX - calfX) * 0.55;
    const ankY = calfY + (fY - calfY) * 0.55;
    ctx.strokeStyle = sockC;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(calfX, calfY);
    ctx.lineTo(ankX, ankY);
    ctx.stroke();
    ctx.lineWidth = 1.9;
    ctx.beginPath();
    ctx.moveTo(ankX, ankY);
    ctx.lineTo(fX, fY);
    ctx.stroke();

    // Knee joint highlight.
    ctx.fillStyle = skinC;
    ctx.beginPath();
    ctx.arc(kneeX, kneeY, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Boot: dark sole with a bright kit-accent flash, angled along the
    // shin so the foot points where the leg is going.
    const bootAng = Math.atan2(fY - calfY, fX - calfX) + Math.PI / 2;
    ctx.save();
    ctx.translate(fX + forward * 1.2, fY - 0.6);
    ctx.rotate(bootAng * 0.25);
    ctx.fillStyle = far ? '#0a0c0f' : '#121419';
    ctx.beginPath();
    ctx.ellipse(forward * 1.4, 0, 3.5, 1.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = far ? shade(kit.sleeve, 0.8) : kit.sleeve;
    ctx.beginPath();
    ctx.ellipse(forward * 2, -0.5, 1.3, 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // Far leg first (slightly darker), near leg after.
  drawLeg(f2x, f2y, f2Lift, -side * 2.2, true);
  drawLeg(f1x, f1y, f1Lift, side * 2.2, false);

  // Shorts (team kit shorts colour).
  const shortsCol = kit.shorts ?? '#ffffff';
  const shortsGrad = ctx.createLinearGradient(
    0, hipY + bob - 5, 0, hipY + bob + 3,
  );
  shortsGrad.addColorStop(0, shade(shortsCol, 1.12));
  shortsGrad.addColorStop(1, shade(shortsCol, 0.88));
  ctx.fillStyle = shortsGrad;
  ctx.beginPath();
  ctx.roundRect(-5, hipY + bob - 5, 10, 8, 3);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.18)';
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Arms (counter-swing). Far arm behind torso, near arm in front.
  // A diving keeper reaches both arms out overhead toward the ball, like a
  // celebration pose but rotated with the laid-out body. A throw-in taker also
  // raises both arms overhead, gripping the ball for a two-handed throw.
  const celebrating = (!!p.celebrating || !!p.throwing || diving) && !kicking;
  const armSwing = kicking ? 6 : -swing * 5;
  const drawArm = (dir: number, swingAmt: number) => {
    ctx.strokeStyle = kit.sleeve;
    ctx.lineWidth = 2.5; // ≈0.10m — a real arm, not a tube
    ctx.lineCap = 'round';
    if (celebrating) {
      // Both arms thrown up above the head, with a little jubilant sway.
      const sway = Math.sin(p.animPhase * 2) * 1.2;
      const handX = dir * 5 + sway;
      const handY = headY + bob - 7;
      ctx.beginPath();
      ctx.moveTo(dir * 4.8, shoulderY + bob + 2);
      ctx.quadraticCurveTo(dir * 6.5, shoulderY + bob - 6, handX, handY);
      ctx.stroke();
      ctx.fillStyle = p.skin;
      ctx.beginPath();
      ctx.arc(handX, handY, 1.5, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.beginPath();
    ctx.moveTo(dir * 4.8, shoulderY + bob + 2);
    ctx.quadraticCurveTo(
      dir * 6 + swingAmt * 0.4,
      shoulderY + bob + 9,
      dir * 4.4 + swingAmt,
      hipY + bob + 1,
    );
    ctx.stroke();
    // Hand.
    ctx.fillStyle = p.skin;
    ctx.beginPath();
    ctx.arc(dir * 4.4 + swingAmt, hipY + bob + 1.5, 1.4, 0, Math.PI * 2);
    ctx.fill();
  };
  drawArm(-side, -armSwing * side);

  // Torso (shirt) with a soft top-lit gradient.
  const torsoGrad = ctx.createLinearGradient(
    0, shoulderY + bob, 0, hipY + bob,
  );
  torsoGrad.addColorStop(0, shade(kit.shirt, 1.18));
  torsoGrad.addColorStop(1, shade(kit.shirt, 0.86));
  ctx.fillStyle = torsoGrad;
  ctx.beginPath();
  ctx.moveTo(-5.5, shoulderY + bob + 1);
  ctx.quadraticCurveTo(0, shoulderY + bob - 2.5, 5.5, shoulderY + bob + 1);
  ctx.lineTo(4.4, hipY + bob - 3);
  ctx.quadraticCurveTo(0, hipY + bob - 1, -4.4, hipY + bob - 3);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = kit.outline;
  ctx.lineWidth = 1;
  ctx.stroke();
  // Side seam stripe.
  ctx.strokeStyle = kit.sleeve;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(side * 2.9, shoulderY + bob + 0.5);
  ctx.lineTo(side * 2.4, hipY + bob - 3);
  ctx.stroke();
  // Collar.
  ctx.strokeStyle = shade(kit.shirt, 0.7);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, shoulderY + bob + 1, 2.2, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  // Shirt number (only legible when we see the player's back).
  if (toward < 0.1) {
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = 'bold 6px Oswald, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(p.num), 0, (shoulderY + hipY) / 2 + bob);
  }

  // Near arm (in front of torso).
  drawArm(side, armSwing * side);

  // Real human proportions: a figure is ≈7.5 heads tall, so for a 44-unit
  // (1.85 m) body the head radius is ≈2.9 units (a ~0.24 m head — almost
  // exactly the size of a 0.22 m ball, as in real life). Was 4.4 (cartoon
  // big-head) which made the true-scale ball look wrong beside it.
  const HR = 2.9;

  // Neck.
  ctx.strokeStyle = shade(p.skin, 0.92);
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, shoulderY + bob - 1);
  ctx.lineTo(fx * 1.2, headY + bob + HR * 0.7);
  ctx.stroke();

  // Head + hair, orientation hints from facing.
  const headX = fx * 1.4;
  const headGrad = ctx.createRadialGradient(
    headX - HR * 0.32, headY + bob - HR * 0.32, HR * 0.18,
    headX, headY + bob, HR,
  );
  headGrad.addColorStop(0, shade(p.skin, 1.12));
  headGrad.addColorStop(1, shade(p.skin, 0.9));
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.arc(headX, headY + bob, HR, 0, Math.PI * 2);
  ctx.fill();
  // Hair: cap on top; covers more of the face when running away from
  // camera (toward < 0 = facing up/away → we see the back of the head).
  ctx.fillStyle = p.hair;
  const hairBias = toward < -0.3 ? 1 : 0.45; // away → full back of head
  ctx.beginPath();
  ctx.arc(headX, headY + bob, HR, Math.PI + 0.2, -0.2);
  ctx.fill();
  if (toward < -0.3) {
    ctx.beginPath();
    ctx.arc(headX, headY + bob + HR * 0.22, HR * 0.88 * hairBias, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Profile/front: small sideburn toward the back of the head.
    ctx.beginPath();
    ctx.arc(headX - side * HR * 0.5, headY + bob + 0.5, HR * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  // Selection chevron above the head (screen space; tracks scaled height).
  // The player NAME is NOT drawn here — it shows as a broadcast lower-third
  // in the bottom corners (pushed to the HUD; rendered by React).
  // NOTE: the CPU (away active) player gets NO above-head marker — only the
  // human-controlled player (green chevron) and the Q switch-hint (hollow
  // chevron) are marked on the pitch.
  const topY = q.y - 50 * gs;
  if (p === controlled) {
    ctx.fillStyle = '#c6ff2e';
    ctx.beginPath();
    ctx.moveTo(q.x, topY);
    ctx.lineTo(q.x - 6.5, topY - 10);
    ctx.lineTo(q.x + 6.5, topY - 10);
    ctx.closePath();
    ctx.fill();
  } else if (p === switchHint) {
    ctx.strokeStyle = 'rgba(198,255,46,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(q.x, topY);
    ctx.lineTo(q.x - 6.5, topY - 10);
    ctx.lineTo(q.x + 6.5, topY - 10);
    ctx.closePath();
    ctx.stroke();
  }
}
