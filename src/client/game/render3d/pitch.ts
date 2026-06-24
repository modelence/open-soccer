// ---- Static pitch, goals, hoarding and lighting ---------------------------
// Builds everything that doesn't change frame-to-frame: the striped grass with
// painted lines (generated into a canvas texture so the markings are crisp and
// cheap), a surrounding apron + advertising hoarding for context, both goals
// (posts, crossbar and a translucent net), and the stadium lighting rig.

import * as THREE from 'three';
import {
  FIELD_W,
  FIELD_H,
  M,
  goalTop,
  goalBottom,
} from '../constants';
import { FIELD_W_M, FIELD_H_M, worldX, worldZ, pxToM } from './coords';

export interface PitchHandles {
  sun: THREE.DirectionalLight;
  /** Animate the goal nets from the engine's per-side ripple intensity. */
  update(netRipple: { left: number; right: number }, tSec: number): void;
  dispose(): void;
}

/** A goal's back net, kept for vertex-level ripple animation. */
interface BackNet {
  side: 'left' | 'right';
  geo: THREE.PlaneGeometry;
  base: Float32Array;
  out: number;
  width: number;
  ch: number;
  dirty: boolean;
}

/** Paint pitch markings into a canvas, mapped 1:1 from field pixels so the
 *  texture aligns exactly with the 3D plane (top = far touchline, fy = 0). */
function makePitchTexture(): THREE.CanvasTexture {
  const scale = 0.9; // texture px per field px (keeps the canvas reasonable)
  const w = Math.round(FIELD_W * scale);
  const h = Math.round(FIELD_H * scale);
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d')!;
  const sx = w / FIELD_W;
  const sy = h / FIELD_H;
  const X = (fx: number) => fx * sx;
  const Y = (fy: number) => fy * sy;

  // Mown stripes (vertical bands along the pitch length).
  const stripes = 20;
  const sw = FIELD_W / stripes;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#2f9a52' : '#28924a';
    ctx.fillRect(X(i * sw), 0, Math.ceil(sw * sx) + 1, h);
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = Math.max(2, M(0.12) * sx);
  ctx.lineJoin = 'round';

  const line = (pts: [number, number][], close = false) => {
    ctx.beginPath();
    pts.forEach(([fx, fy], i) =>
      i === 0 ? ctx.moveTo(X(fx), Y(fy)) : ctx.lineTo(X(fx), Y(fy)),
    );
    if (close) ctx.closePath();
    ctx.stroke();
  };
  const arc = (
    fx: number,
    fy: number,
    r: number,
    a0: number,
    a1: number,
  ) => {
    ctx.beginPath();
    ctx.ellipse(X(fx), Y(fy), r * sx, r * sy, 0, a0, a1);
    ctx.stroke();
  };
  const dot = (fx: number, fy: number) => {
    ctx.beginPath();
    ctx.ellipse(X(fx), Y(fy), M(0.2) * sx, M(0.2) * sy, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fill();
  };

  // Touchlines + goal lines (inset slightly so the stroke sits on the pitch).
  const m = M(0.4);
  line(
    [
      [m, m],
      [FIELD_W - m, m],
      [FIELD_W - m, FIELD_H - m],
      [m, FIELD_H - m],
    ],
    true,
  );
  // Halfway line + centre circle + spot.
  line([
    [FIELD_W / 2, 0],
    [FIELD_W / 2, FIELD_H],
  ]);
  arc(FIELD_W / 2, FIELD_H / 2, M(9.15), 0, Math.PI * 2);
  dot(FIELD_W / 2, FIELD_H / 2);

  // Penalty + goal areas, penalty spots + the "D".
  const boxH = M(40.32);
  const boxW = M(16.5);
  const sixH = M(18.32);
  const sixW = M(5.5);
  const pk = M(11);
  const by = (FIELD_H - boxH) / 2;
  const syy = (FIELD_H - sixH) / 2;
  for (const left of [true, false]) {
    const gx = left ? 0 : FIELD_W;
    const dir = left ? 1 : -1;
    line([
      [gx, by],
      [gx + dir * boxW, by],
      [gx + dir * boxW, by + boxH],
      [gx, by + boxH],
    ]);
    line([
      [gx, syy],
      [gx + dir * sixW, syy],
      [gx + dir * sixW, syy + sixH],
      [gx, syy + sixH],
    ]);
    const px = gx + dir * pk;
    dot(px, FIELD_H / 2);
    const a = Math.acos(Math.min(1, Math.max(-1, (boxW - pk) / M(9.15))));
    if (left) arc(px, FIELD_H / 2, M(9.15), -a, a);
    else arc(px, FIELD_H / 2, M(9.15), Math.PI - a, Math.PI + a);
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeNetTexture(): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = 64;
  cv.height = 64;
  const ctx = cv.getContext('2d')!;
  ctx.clearRect(0, 0, 64, 64);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 1.2;
  for (let i = 0; i <= 64; i += 6) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 64);
    ctx.moveTo(0, i);
    ctx.lineTo(64, i);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createPitch(scene: THREE.Scene): PitchHandles {
  const disposables: { dispose(): void }[] = [];
  const track = <T extends { dispose(): void }>(o: T): T => {
    disposables.push(o);
    return o;
  };

  // ---- Grass (pitch + surrounding apron) ----
  const pitchTex = track(makePitchTexture());
  const pitchMat = track(
    new THREE.MeshStandardMaterial({ map: pitchTex, roughness: 0.95 }),
  );
  const pitchGeo = track(new THREE.PlaneGeometry(FIELD_W_M, FIELD_H_M));
  const pitch = new THREE.Mesh(pitchGeo, pitchMat);
  pitch.rotation.x = -Math.PI / 2;
  pitch.receiveShadow = true;
  scene.add(pitch);

  const apronGeo = track(
    new THREE.PlaneGeometry(FIELD_W_M + 26, FIELD_H_M + 26),
  );
  const apronMat = track(
    new THREE.MeshStandardMaterial({ color: 0x14622f, roughness: 1 }),
  );
  const apron = new THREE.Mesh(apronGeo, apronMat);
  apron.rotation.x = -Math.PI / 2;
  apron.position.y = -0.02;
  apron.receiveShadow = true;
  scene.add(apron);

  // ---- Advertising hoarding ring (low boards just off the touchlines) ----
  const boardMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x0c1118,
      emissive: 0x223a06,
      emissiveIntensity: 0.4,
      roughness: 0.6,
    }),
  );
  const boardH = 1.1;
  const bx = FIELD_W_M / 2 + 3;
  const bz = FIELD_H_M / 2 + 3;
  const boardSpecs: [number, number, number, number, number][] = [
    [0, bz, FIELD_W_M + 6, boardH, 0.3], // near
    [0, -bz, FIELD_W_M + 6, boardH, 0.3], // far
    [bx, 0, 0.3, boardH, FIELD_H_M + 6], // right
    [-bx, 0, 0.3, boardH, FIELD_H_M + 6], // left
  ];
  for (const [x, z, sw2, sh, sd] of boardSpecs) {
    const g = track(new THREE.BoxGeometry(sw2, sh, sd));
    const board = new THREE.Mesh(g, boardMat);
    board.position.set(x, boardH / 2, z);
    scene.add(board);
  }

  // ---- Goals ----
  const netTex = track(makeNetTexture());
  const postMat = track(
    new THREE.MeshStandardMaterial({ color: 0xf3f6fa, roughness: 0.4 }),
  );
  const crossbarY = M(2.44);
  const postR = 0.06;
  const depth = M(2.0); // net depth behind the goal line, in field px
  const backNets: BackNet[] = [];

  const netMaterial = (rep: THREE.Vector2) => {
    const tex = track(netTex.clone());
    tex.needsUpdate = true;
    tex.repeat.copy(rep);
    return track(
      new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
  };

  for (const left of [true, false]) {
    const side: 'left' | 'right' = left ? 'left' : 'right';
    const gx = worldX(left ? 0 : FIELD_W);
    const out = left ? -1 : 1; // outward (away from pitch) world-X direction
    const zTop = worldZ(goalTop);
    const zBot = worldZ(goalBottom);
    const ch = pxToM(crossbarY);
    const dep = pxToM(depth);
    const back = gx + out * dep;
    const width = Math.abs(zBot - zTop); // goal mouth width along Z
    const zMid = (zTop + zBot) / 2;

    // Posts (upright) + crossbar (spans the mouth along Z).
    const post = (z: number) => {
      const g = track(new THREE.CylinderGeometry(postR, postR, ch, 10));
      const mesh = new THREE.Mesh(g, postMat);
      mesh.position.set(gx, ch / 2, z);
      mesh.castShadow = true;
      scene.add(mesh);
    };
    post(zTop);
    post(zBot);
    const barG = track(new THREE.CylinderGeometry(postR, postR, width, 10));
    const bar = new THREE.Mesh(barG, postMat);
    bar.rotation.x = Math.PI / 2;
    bar.position.set(gx, ch, zMid);
    bar.castShadow = true;
    scene.add(bar);

    // Back net (segmented for ripple). Plane lies in local XY (width→X, ch→Y);
    // rotating +90° about Y puts width along Z and the surface normal along ±X.
    const backG = track(new THREE.PlaneGeometry(width, ch, 14, 7));
    const backNet = new THREE.Mesh(
      backG,
      netMaterial(new THREE.Vector2(width / 0.9, ch / 0.9)),
    );
    backNet.rotation.y = Math.PI / 2;
    backNet.position.set(back, ch / 2, zMid);
    scene.add(backNet);
    backNets.push({
      side,
      geo: backG,
      base: Float32Array.from(backG.attributes.position.array as Float32Array),
      out,
      width,
      ch,
      dirty: false,
    });

    // Roof (horizontal, crossbar → back): local XY (dep→X, width→Y), tilt flat.
    const roofG = track(new THREE.PlaneGeometry(dep, width));
    const roof = new THREE.Mesh(roofG, netMaterial(new THREE.Vector2(dep / 0.9, width / 0.9)));
    roof.rotation.x = -Math.PI / 2;
    roof.position.set(gx + out * dep / 2, ch, zMid);
    scene.add(roof);

    // Two side panels (vertical, goal line → back) at each post.
    for (const z of [zTop, zBot]) {
      const sideG = track(new THREE.PlaneGeometry(dep, ch));
      const sideNet = new THREE.Mesh(
        sideG,
        netMaterial(new THREE.Vector2(dep / 0.9, ch / 0.9)),
      );
      sideNet.position.set(gx + out * dep / 2, ch / 2, z);
      scene.add(sideNet);
    }
  }

  // ---- Lighting ----
  const hemi = new THREE.HemisphereLight(0xbfd6ff, 0x24502c, 0.7);
  scene.add(hemi);
  const ambient = new THREE.AmbientLight(0xffffff, 0.25);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff4e2, 1.25);
  sun.position.set(38, 64, 26);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 10;
  sun.shadow.camera.far = 220;
  const sc = sun.shadow.camera as THREE.OrthographicCamera;
  sc.left = -70;
  sc.right = 70;
  sc.top = 50;
  sc.bottom = -50;
  sc.updateProjectionMatrix();
  sun.shadow.bias = -0.0003;
  scene.add(sun);
  scene.add(sun.target);

  return {
    sun,
    update(netRipple, tSec) {
      // Bulge each back net outward + sag it down when the ball strikes, with a
      // travelling shimmer — mirrors the 2D renderer's net wobble.
      for (const n of backNets) {
        const ripple = n.side === 'left' ? netRipple.left : netRipple.right;
        const pos = n.geo.attributes.position as THREE.BufferAttribute;
        const arr = pos.array as Float32Array;
        if (ripple > 0.001) {
          for (let i = 0; i < arr.length; i += 3) {
            const x = n.base[i];
            const y = n.base[i + 1];
            const u = x / n.width + 0.5;
            const v = y / n.ch + 0.5;
            const shape =
              Math.sin(Math.PI * u) * Math.sin(Math.PI * Math.min(1, v + 0.15));
            const wob = Math.cos(tSec * 26 - u * 4) * 0.5 + 0.6;
            const k = ripple * 0.55 * shape * wob; // metres of bulge
            arr[i] = x;
            arr[i + 1] = y - k * 0.25; // sag down
            arr[i + 2] = n.out * k; // bulge outward (local z → world ±X)
          }
          pos.needsUpdate = true;
          n.dirty = true;
        } else if (n.dirty) {
          arr.set(n.base);
          pos.needsUpdate = true;
          n.dirty = false;
        }
      }
    },
    dispose() {
      for (const d of disposables) d.dispose();
    },
  };
}
