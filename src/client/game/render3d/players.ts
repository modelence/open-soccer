// ---- Procedural 3D footballers --------------------------------------------
// A lightweight articulated humanoid built from primitives (no external rigged
// assets, so nothing binary is committed). One `PlayerModel` per `PlayerEntity`
// is created lazily and reused every frame; `update()` drives position, facing
// and a run / kick / dive / slide / celebrate animation from the same engine
// state the 2D renderer reads. This is the seam where Mixamo/glTF skinned
// characters with an AnimationMixer would later drop in.

import * as THREE from 'three';
import { SPRINT_SPEED } from '../constants';
import type { PlayerEntity } from '../types';
import type { Kit } from '../teams/types';
import { worldX, worldZ } from './coords';

const HIP_Y = 0.92;
const SHOULDER_Y = 1.46;
const HEAD_Y = 1.66;
const HEAD_R = 0.12;
const LEG_LEN = 0.92;
const ARM_LEN = 0.58;

// Selection chevron, matching the 2D renderer: a downward-pointing triangle
// floating above the head — SOLID green for the controlled player, HOLLOW
// (outline) for the Q switch-hint. Drawn as a camera-facing sprite so it reads
// like the old on-screen pointer regardless of the broadcast angle. The two
// textures are shared across all players (created once).
let solidChevronTex: THREE.Texture | null = null;
let hollowChevronTex: THREE.Texture | null = null;

function chevronTexture(filled: boolean): THREE.Texture {
  const cv = document.createElement('canvas');
  cv.width = 64;
  cv.height = 64;
  const ctx = cv.getContext('2d')!;
  ctx.beginPath();
  ctx.moveTo(8, 14);
  ctx.lineTo(56, 14);
  ctx.lineTo(32, 54);
  ctx.closePath();
  if (filled) {
    ctx.fillStyle = '#c6ff2e';
    ctx.fill();
  } else {
    ctx.lineWidth = 7;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(198,255,46,0.85)';
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function getChevronTexture(filled: boolean): THREE.Texture {
  if (filled) return (solidChevronTex ??= chevronTexture(true));
  return (hollowChevronTex ??= chevronTexture(false));
}

function limb(
  len: number,
  rTop: number,
  rBot: number,
  color: THREE.ColorRepresentation,
  disposables: { dispose(): void }[],
): THREE.Group {
  // A limb that pivots at its TOP: geometry hangs down from the origin.
  const pivot = new THREE.Group();
  const geo = new THREE.CylinderGeometry(rTop, rBot, len, 8);
  geo.translate(0, -len / 2, 0);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  pivot.add(mesh);
  disposables.push(geo, mat);
  return pivot;
}

export class PlayerModel {
  readonly group = new THREE.Group();
  private legL: THREE.Group;
  private legR: THREE.Group;
  private armL: THREE.Group;
  private armR: THREE.Group;
  private markerSolid: THREE.Sprite;
  private markerHollow: THREE.Sprite;
  private disposables: { dispose(): void }[] = [];

  constructor(p: PlayerEntity, kit: Kit) {
    const d = this.disposables;
    const shirt = new THREE.Color(kit.shirt);
    const sleeve = new THREE.Color(kit.sleeve);
    const shorts = new THREE.Color(kit.shorts ?? kit.sleeve);
    const skin = new THREE.Color(p.skin);
    const hair = new THREE.Color(p.hair);

    // Legs (pivot at the hip).
    this.legL = limb(LEG_LEN, 0.075, 0.05, skin, d);
    this.legR = limb(LEG_LEN, 0.075, 0.05, skin, d);
    this.legL.position.set(-0.11, HIP_Y, 0);
    this.legR.position.set(0.11, HIP_Y, 0);
    // Boots.
    for (const leg of [this.legL, this.legR]) {
      const bg = new THREE.BoxGeometry(0.11, 0.07, 0.24);
      const bm = new THREE.MeshStandardMaterial({ color: 0x121419, roughness: 0.5 });
      const boot = new THREE.Mesh(bg, bm);
      boot.position.set(0, -LEG_LEN + 0.03, 0.05);
      boot.castShadow = true;
      leg.add(boot);
      d.push(bg, bm);
    }
    this.group.add(this.legL, this.legR);

    // Shorts.
    const shortsGeo = new THREE.BoxGeometry(0.34, 0.26, 0.3);
    const shortsMat = new THREE.MeshStandardMaterial({ color: shorts, roughness: 0.8 });
    const shortsMesh = new THREE.Mesh(shortsGeo, shortsMat);
    shortsMesh.position.set(0, HIP_Y + 0.05, 0);
    shortsMesh.castShadow = true;
    this.group.add(shortsMesh);
    d.push(shortsGeo, shortsMat);

    // Torso (shirt).
    const torsoGeo = new THREE.CapsuleGeometry(0.2, SHOULDER_Y - HIP_Y - 0.04, 4, 10);
    const torsoMat = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.75 });
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.set(0, (HIP_Y + SHOULDER_Y) / 2 + 0.05, 0);
    torso.scale.set(1, 1, 0.62);
    torso.castShadow = true;
    this.group.add(torso);
    d.push(torsoGeo, torsoMat);

    // Arms (pivot at the shoulder), sleeve-coloured.
    this.armL = limb(ARM_LEN, 0.05, 0.038, sleeve, d);
    this.armR = limb(ARM_LEN, 0.05, 0.038, sleeve, d);
    this.armL.position.set(-0.26, SHOULDER_Y, 0);
    this.armR.position.set(0.26, SHOULDER_Y, 0);
    this.group.add(this.armL, this.armR);

    // Neck + head.
    const headGeo = new THREE.SphereGeometry(HEAD_R, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.6 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, HEAD_Y, 0);
    head.castShadow = true;
    this.group.add(head);
    d.push(headGeo, headMat);

    const hairGeo = new THREE.SphereGeometry(HEAD_R * 1.04, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.62);
    const hairMat = new THREE.MeshStandardMaterial({ color: hair, roughness: 0.85 });
    const hairMesh = new THREE.Mesh(hairGeo, hairMat);
    hairMesh.position.set(0, HEAD_Y + 0.01, -0.01);
    this.group.add(hairMesh);
    d.push(hairGeo, hairMat);

    // Selection chevron above the head (solid = controlled, hollow = switch
    // hint). Sprites always face the camera, like the old 2D pointer.
    const makeMarker = (filled: boolean) => {
      const mat = new THREE.SpriteMaterial({
        map: getChevronTexture(filled),
        transparent: true,
        depthTest: false,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(0.5, 0.5, 1);
      sprite.position.set(0, HEAD_Y + 0.42, 0);
      sprite.visible = false;
      sprite.renderOrder = 999;
      this.group.add(sprite);
      d.push(mat);
      return sprite;
    };
    this.markerSolid = makeMarker(true);
    this.markerHollow = makeMarker(false);
  }

  update(p: PlayerEntity, controlled: boolean, switchHint: boolean) {
    const g = this.group;
    g.position.set(worldX(p.x), 0, worldZ(p.y));

    // Face the movement/heading direction. Model forward is +Z; field facing
    // (fx, fy) maps directly onto world (X, Z).
    g.rotation.set(0, Math.atan2(p.facing.x, p.facing.y), 0);

    const speed = Math.hypot(p.vx, p.vy);
    const moving = speed > 30;
    const amp = Math.min(speed / SPRINT_SPEED, 1) * 0.7;
    const swing = moving ? Math.sin(p.animPhase) * amp : 0;
    const bob = moving ? Math.abs(Math.sin(p.animPhase)) * 0.035 : 0;

    const kicking = (p.kickTimer ?? 0) > 0;
    const diving = (p.diveTimer ?? 0) > 0;
    const sliding = (p.slideTimer ?? 0) > 0;
    const celebrating = (!!p.celebrating || !!p.throwing) && !kicking;

    // Defaults: reset transforms each frame.
    g.position.y = bob;
    g.rotation.x = 0;
    g.rotation.z = 0;

    // Legs.
    if (kicking) {
      this.legR.rotation.x = -1.15; // striking leg swung through
      this.legL.rotation.x = 0.25; // planted
    } else if (sliding) {
      this.legR.rotation.x = -0.9;
      this.legL.rotation.x = 0.5;
    } else {
      this.legL.rotation.x = swing;
      this.legR.rotation.x = -swing;
    }

    // Arms.
    if (celebrating || diving) {
      this.armL.rotation.x = -2.7;
      this.armR.rotation.x = -2.7;
    } else if (kicking) {
      this.armL.rotation.x = 0.7;
      this.armR.rotation.x = -0.5;
    } else {
      this.armL.rotation.x = -swing * 0.6;
      this.armR.rotation.x = swing * 0.6;
    }

    // Whole-body poses.
    if (diving) {
      const t = 1 - (p.diveTimer ?? 0) / 0.6;
      const layout = Math.sin(Math.min(Math.max(t, 0) * 1.3, 1) * (Math.PI / 2));
      const airborne = Math.sin(Math.min(Math.max(t, 0), 1) * Math.PI);
      g.rotation.z = (p.diveDir ?? 1) * layout * 1.35;
      g.position.y = bob + airborne * 0.55 + layout * 0.2;
    } else if (sliding) {
      const t = 1 - (p.slideTimer ?? 0) / 0.7;
      const layout = t < 0.45 ? t / 0.45 : 1 - (t - 0.45) / 0.55;
      g.rotation.x = Math.max(0, layout) * 0.9;
      g.position.y = bob - 0.15 * Math.max(0, layout);
    } else if (moving) {
      g.rotation.x = -Math.min(speed / SPRINT_SPEED, 1) * 0.12; // lean into the run
    }

    this.markerSolid.visible = controlled;
    this.markerHollow.visible = switchHint && !controlled;
  }

  dispose() {
    for (const o of this.disposables) o.dispose();
  }
}
