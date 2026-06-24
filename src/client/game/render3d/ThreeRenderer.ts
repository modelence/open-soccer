// ---- Three.js renderer (experimental, swappable) --------------------------
// Implements the same `GameRenderer` interface as the 2D canvas renderer, so
// the engine can drive it with the identical per-frame `Scene` snapshot. This
// is the FIFA-style 3D spike: a real perspective broadcast camera, lit grass
// with shadows, 3D goals/nets and articulated players. Gameplay code is
// untouched — everything here is read-only consumption of the snapshot.

import * as THREE from 'three';
import {
  CANVAS_W,
  CANVAS_H,
  BALL_R,
  BALL_VIS_SCALE,
} from '../constants';
import type { GameRenderer, Scene } from '../renderer';
import type { PlayerEntity } from '../types';
import { createPitch, type PitchHandles } from './pitch';
import { PlayerModel } from './players';
import { worldX, worldZ, pxToM } from './coords';

// Broadcast camera rig (metres). The camera sits high on the near touchline
// and follows the engine camera (camX/camY) across + into the pitch.
const CAM_HEIGHT = 21;
const CAM_BACK = 31;
const CAM_LOOK_Y = 1.1;

export class ThreeRenderer implements GameRenderer {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private pitch: PitchHandles;
  private ball: THREE.Mesh;
  private ballGeo: THREE.SphereGeometry;
  private ballMat: THREE.MeshStandardMaterial;
  private players = new Map<PlayerEntity, PlayerModel>();

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(CANVAS_W, CANVAS_H, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.scene.background = new THREE.Color(0x070b11);
    this.scene.fog = new THREE.Fog(0x070b11, 90, 240);

    this.camera = new THREE.PerspectiveCamera(34, CANVAS_W / CANVAS_H, 0.5, 400);

    this.pitch = createPitch(this.scene);

    const r = pxToM(BALL_R * BALL_VIS_SCALE);
    this.ballGeo = new THREE.SphereGeometry(r, 18, 18);
    this.ballMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.35,
      metalness: 0.0,
    });
    this.ball = new THREE.Mesh(this.ballGeo, this.ballMat);
    this.ball.castShadow = true;
    this.scene.add(this.ball);
  }

  render(scene: Scene) {
    // ---- Camera follow ----
    const tx = worldX(scene.camX);
    const tz = worldZ(scene.camY);
    this.camera.position.set(tx, CAM_HEIGHT, tz + CAM_BACK);
    this.camera.lookAt(tx, CAM_LOOK_Y, tz - 4);

    // Keep the sun aimed at the action so shadows stay grounded.
    this.pitch.sun.target.position.set(tx, 0, tz);
    this.pitch.sun.target.updateMatrixWorld();

    // Animate the goal nets (ripple when the ball hits them).
    this.pitch.update(scene.netRipple, performance.now() / 1000);

    // ---- Ball ----
    const r = pxToM(scene.ball.r * BALL_VIS_SCALE);
    this.ball.position.set(
      worldX(scene.ball.x),
      pxToM(scene.ball.z) + r,
      worldZ(scene.ball.y),
    );

    // ---- Players (lazily create, reuse, prune) ----
    const seen = new Set<PlayerEntity>();
    for (const { p, kit } of scene.players) {
      seen.add(p);
      let model = this.players.get(p);
      if (!model) {
        model = new PlayerModel(p, kit);
        this.players.set(p, model);
        this.scene.add(model.group);
      }
      model.update(p, p === scene.controlled, p === scene.switchHint);
    }
    for (const [p, model] of this.players) {
      if (!seen.has(p)) {
        this.scene.remove(model.group);
        model.dispose();
        this.players.delete(p);
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    for (const [, model] of this.players) {
      this.scene.remove(model.group);
      model.dispose();
    }
    this.players.clear();
    this.pitch.dispose();
    this.ballGeo.dispose();
    this.ballMat.dispose();
    this.renderer.dispose();
  }
}
