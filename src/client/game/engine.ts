// PitchKick — arcade football engine (11v11 vs CPU).
// Pure canvas + requestAnimationFrame. No React inside the hot loop.
// Simulation is flat 2D; rendering uses a pseudo-3D TV broadcast camera
// (perspective trapezoid pitch, upright animated player sprites scaled by
// depth) — 16-bit FIFA / ISS style.

export const FIELD_W = 2200;
export const FIELD_H = 950;
export const MARGIN = 56;
export const CANVAS_W = 1162;
export const CANVAS_H = 700;

// ---- TV broadcast projection ----------------------------------------------
// The simulation stays flat 2D (x = goal-to-goal, y = depth between the
// touchlines). The renderer projects it like a TV camera: the far touchline
// (y=0) is drawn smaller and higher, the near touchline (y=FIELD_H) bigger
// and lower, and everything scales with depth.
const S_FAR = 0.56; // scale at the far touchline
const S_NEAR = 1.0; // scale at the near touchline
const PITCH_TOP = 116; // screen y of the far touchline
const PITCH_DRAW_H = 510; // screen height of the pitch
const AVG_S = (S_FAR + S_NEAR) / 2;

// The camera pans horizontally to follow the ball (FIFA tele cam) — only a
// section of the pitch is visible at a time. `viewCamX` is the field x the
// camera is centred on; the engine updates it every frame before rendering.
let viewCamX = FIELD_W / 2;
/** Camera clamp so the goal + some behind-goal apron stays on screen. */
const CAM_MIN = 500;
const CAM_MAX = FIELD_W - 500;

/** Project field coordinates to screen coordinates. */
function proj(x: number, y: number): { x: number; y: number; s: number } {
  const t = clamp(y / FIELD_H, -0.2, 1.2);
  const s = S_FAR + (S_NEAR - S_FAR) * t;
  // Integral of the scale function → vertical spacing matches foreshortening.
  const v = (S_FAR * t + 0.5 * (S_NEAR - S_FAR) * t * t) / AVG_S;
  return {
    x: CANVAS_W / 2 + (x - viewCamX) * s,
    y: PITCH_TOP + PITCH_DRAW_H * v,
    s,
  };
}

const GOAL_HEIGHT = 240;
const GOAL_DEPTH = 38;
const goalTop = FIELD_H / 2 - GOAL_HEIGHT / 2;
const goalBottom = FIELD_H / 2 + GOAL_HEIGHT / 2;

const PLAYER_R = 14;
const BALL_R = 8;

// Tuned down from the first prototype — calmer, more readable pace.
const WALK_SPEED = 165;
const SPRINT_SPEED = 255;
const TEAMMATE_SPEED = 155;
const AWAY_CHASE_SPEED = 180;
const AWAY_CARRY_SPEED = 165;
const AWAY_FORMATION_SPEED = 140;
/** Off-ball forward runs in behind (both teams). */
const RUN_SPEED = 200;
/** Closing down the carrier / tracking a marked attacker. */
const PRESS_SPEED = 200;
const CONTROL_DIST = PLAYER_R + BALL_R + 11;
/** Ball rolling friction (exponential decay per second). A kick at power v
 *  rolls v/BALL_DECAY px total — pass powers MUST account for this. */
const BALL_DECAY = 1.5;

/** How quickly velocity approaches the desired velocity (per second). */
const ACCEL = 8;
/** Max turn rate in radians per second. */
const TURN_RATE = 13;

type Vec = { x: number; y: number };
type Team = 'home' | 'away';
type Role = 'GK' | 'DF' | 'MF' | 'ST';

interface PlayerEntity {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  team: Team;
  /** Formation anchor in field coordinates. */
  anchor: Vec;
  facing: Vec;
  /** Run-cycle phase, advanced by distance travelled. */
  animPhase: number;
  /** > 0 while playing the kick pose. */
  kickTimer: number;
  hair: string;
  skin: string;
  isGK: boolean;
  role: Role;
}

export interface HudState {
  homeScore: number;
  awayScore: number;
  timeLeft: number;
  message: string;
  possession: Team | 'none';
}

type StateListener = (s: HudState) => void;

const KICK_KEYS = new Set(['KeyW', 'KeyS', 'KeyA', 'KeyD']);
const ACTION_KEYS = new Set(['KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyQ']);
const MOVE_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'KeyE',
  'Space',
]);

// 4-4-2 formation as fractions of the field (home attacks right).
// Index 0 is the goalkeeper; KICKOFF_FWD takes the kickoff.
const FORMATION: Vec[] = [
  { x: 0.045, y: 0.5 }, // GK
  { x: 0.16, y: 0.16 }, // RB
  { x: 0.14, y: 0.38 }, // CB
  { x: 0.14, y: 0.62 }, // CB
  { x: 0.16, y: 0.84 }, // LB
  { x: 0.34, y: 0.14 }, // RM
  { x: 0.32, y: 0.4 }, // CM
  { x: 0.32, y: 0.6 }, // CM
  { x: 0.34, y: 0.86 }, // LM
  { x: 0.52, y: 0.38 }, // ST
  { x: 0.52, y: 0.62 }, // ST
];
const KICKOFF_FWD = 9;

const HAIR_COLORS = ['#2b2118', '#0e0c0a', '#5a3b1e', '#857058'];
const SKIN_TONES = ['#e0ac7e', '#c98c5e', '#8d5a3b', '#f0c49a'];

interface Kit {
  shirt: string;
  sleeve: string;
  outline: string;
}

const HOME_KIT: Kit = { shirt: '#2e9bff', sleeve: '#1268c4', outline: '#0c3e78' };
const AWAY_KIT: Kit = { shirt: '#ff4d4d', sleeve: '#c42626', outline: '#7a1414' };
// Keepers wear distinct kits, like real football.
const HOME_GK_KIT: Kit = { shirt: '#ffb52e', sleeve: '#cc8512', outline: '#7a4d08' };
const AWAY_GK_KIT: Kit = { shirt: '#27e0a6', sleeve: '#12a878', outline: '#0a5c42' };

function kitFor(p: PlayerEntity): Kit {
  if (p.isGK) return p.team === 'home' ? HOME_GK_KIT : AWAY_GK_KIT;
  return p.team === 'home' ? HOME_KIT : AWAY_KIT;
}

function len(x: number, y: number) {
  return Math.hypot(x, y) || 1;
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

/** Distance from point p to the line segment a→b. */
function distToSegment(p: Vec, a: Vec, b: Vec) {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lenSq = abx * abx + aby * aby;
  if (lenSq === 0) return dist(p, a);
  const t = clamp(((p.x - a.x) * abx + (p.y - a.y) * aby) / lenSq, 0, 1);
  return dist(p, { x: a.x + abx * t, y: a.y + aby * t });
}

export class PitchKickGame {
  private ctx: CanvasRenderingContext2D;
  private raf = 0;
  private last = 0;
  private running = false;

  private keys = new Set<string>();
  private justPressed: string[] = [];

  private ball = { x: 0, y: 0, vx: 0, vy: 0, r: BALL_R };
  private homePlayers: PlayerEntity[] = [];
  private awayPlayers: PlayerEntity[] = [];
  private controlled!: PlayerEntity;
  /** The player Q would switch to (rendered as a hollow marker). */
  private switchHint: PlayerEntity | null = null;

  private owner: PlayerEntity | null = null;
  private lastKicker: PlayerEntity | null = null;
  private kickerLock = 0;
  private cpuDecision = 0;
  /** Protection window after winning the ball — can't be tackled. */
  private stealProtect = 0;
  /** The player who just lost a tackle can't immediately win the ball back. */
  private dispossessed: PlayerEntity | null = null;
  private dispossessedTimer = 0;

  private homeScore = 0;
  private awayScore = 0;
  private timeLeft = 120;
  private message = '';
  private messageTimer = 0;
  private freeze = 0;
  /** TV camera x (field coordinates), follows the ball with smoothing. */
  private camX = FIELD_W / 2;

  private listener: StateListener;

  constructor(canvas: HTMLCanvasElement, listener: StateListener) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
    this.listener = listener;

    this.homePlayers = FORMATION.map((f, i) => this.makePlayer('home', f, i));
    this.awayPlayers = FORMATION.map((f, i) =>
      this.makePlayer('away', { x: 1 - f.x, y: f.y }, i),
    );
    this.controlled = this.homePlayers[KICKOFF_FWD];

    this.resetKickoff('home');
  }

  private makePlayer(team: Team, frac: Vec, i: number): PlayerEntity {
    return {
      x: frac.x * FIELD_W,
      y: frac.y * FIELD_H,
      vx: 0,
      vy: 0,
      r: PLAYER_R,
      team,
      anchor: { x: frac.x * FIELD_W, y: frac.y * FIELD_H },
      facing: { x: team === 'home' ? 1 : -1, y: 0 },
      animPhase: Math.random() * Math.PI * 2,
      kickTimer: 0,
      hair: HAIR_COLORS[(i + (team === 'away' ? 2 : 0)) % HAIR_COLORS.length],
      skin: SKIN_TONES[(i + (team === 'away' ? 1 : 0)) % SKIN_TONES.length],
      isGK: i === 0,
      role: i === 0 ? 'GK' : i <= 4 ? 'DF' : i <= 8 ? 'MF' : 'ST',
    };
  }

  // ---- lifecycle ----------------------------------------------------------

  start() {
    if (this.running) return;
    this.running = true;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
    this.emit();
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }

  // ---- input --------------------------------------------------------------

  private onKeyDown = (e: KeyboardEvent) => {
    if (MOVE_KEYS.has(e.code) || ACTION_KEYS.has(e.code)) e.preventDefault();
    if (!e.repeat && ACTION_KEYS.has(e.code)) this.justPressed.push(e.code);
    this.keys.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  // ---- helpers ------------------------------------------------------------

  private resetKickoff(kickingTeam: Team) {
    this.ball.x = FIELD_W / 2;
    this.ball.y = FIELD_H / 2;
    this.ball.vx = 0;
    this.ball.vy = 0;

    for (const p of [...this.homePlayers, ...this.awayPlayers]) {
      p.x = p.anchor.x;
      p.y = p.anchor.y;
      p.vx = p.vy = 0;
      p.kickTimer = 0;
      p.facing = { x: p.team === 'home' ? 1 : -1, y: 0 };
    }

    // Put the kicking team's forward on the ball.
    const fwd =
      kickingTeam === 'home'
        ? this.homePlayers[KICKOFF_FWD]
        : this.awayPlayers[KICKOFF_FWD];
    fwd.x = FIELD_W / 2 + (kickingTeam === 'home' ? -34 : 34);
    fwd.y = FIELD_H / 2;

    if (kickingTeam === 'home') this.controlled = this.homePlayers[KICKOFF_FWD];

    this.camX = FIELD_W / 2;

    this.owner = null;
    this.lastKicker = null;
    this.kickerLock = 0;
    this.stealProtect = 0;
    this.dispossessed = null;
    this.dispossessedTimer = 0;
    this.markAssign.clear();
    this.markTimer = 0;
    this.freeze = 0.9;
  }

  private setMessage(msg: string, secs: number) {
    this.message = msg;
    this.messageTimer = secs;
  }

  private emit() {
    this.listener({
      homeScore: this.homeScore,
      awayScore: this.awayScore,
      timeLeft: Math.max(0, Math.ceil(this.timeLeft)),
      message: this.message,
      possession: this.owner ? this.owner.team : 'none',
    });
  }

  private nearestTo(
    players: PlayerEntity[],
    pt: { x: number; y: number },
    exclude?: PlayerEntity,
  ): PlayerEntity | null {
    let best: PlayerEntity | null = null;
    let bestD = Infinity;
    for (const p of players) {
      if (p === exclude) continue;
      const d = dist(p, pt);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    return best;
  }

  private nearestOpponentDist(p: PlayerEntity): number {
    const opps = p.team === 'home' ? this.awayPlayers : this.homePlayers;
    let best = Infinity;
    for (const o of opps) best = Math.min(best, dist(p, o));
    return best;
  }

  // ---- movement helpers ---------------------------------------------------

  /** Smoothly steer a player toward a desired velocity (inertia + turning). */
  private steer(p: PlayerEntity, targetVx: number, targetVy: number, dt: number) {
    const k = 1 - Math.exp(-ACCEL * dt);
    p.vx += (targetVx - p.vx) * k;
    p.vy += (targetVy - p.vy) * k;
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    const sp = Math.hypot(p.vx, p.vy);
    if (sp > 25) this.faceToward(p, p.vx / sp, p.vy / sp, dt);
    p.animPhase += sp * dt * 0.055;

    this.clampToField(p);
  }

  /** Rotate facing toward a unit direction at a capped turn rate. */
  private faceToward(p: PlayerEntity, dx: number, dy: number, dt: number) {
    const cur = Math.atan2(p.facing.y, p.facing.x);
    const tgt = Math.atan2(dy, dx);
    let diff = tgt - cur;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const ang = cur + clamp(diff, -TURN_RATE * dt, TURN_RATE * dt);
    p.facing = { x: Math.cos(ang), y: Math.sin(ang) };
  }

  private moveToward(p: PlayerEntity, t: Vec, speed: number, dt: number) {
    const dx = t.x - p.x;
    const dy = t.y - p.y;
    const d = len(dx, dy);
    // Slow into the target so AI players don't orbit/jitter.
    const sp = d < 36 ? speed * (d / 36) : speed;
    this.steer(p, (dx / d) * sp, (dy / d) * sp, dt);
  }

  // ---- update -------------------------------------------------------------

  private loop = (now: number) => {
    if (!this.running) return;
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (dt > 0.05) dt = 0.05;

    this.update(dt);
    this.render();
    this.emit();
    this.raf = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    if (this.messageTimer > 0) {
      this.messageTimer -= dt;
      if (this.messageTimer <= 0) this.message = '';
    }
    if (this.kickerLock > 0) this.kickerLock -= dt;
    else this.lastKicker = null;
    if (this.cpuDecision > 0) this.cpuDecision -= dt;
    if (this.stealProtect > 0) this.stealProtect -= dt;
    if (this.dispossessedTimer > 0) {
      this.dispossessedTimer -= dt;
      if (this.dispossessedTimer <= 0) this.dispossessed = null;
    }
    for (const p of [...this.homePlayers, ...this.awayPlayers]) {
      if (p.kickTimer > 0) p.kickTimer -= dt;
    }

    if (this.freeze > 0) {
      this.freeze -= dt;
      this.justPressed = [];
      return;
    }

    if (this.timeLeft > 0) {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        const verdict =
          this.homeScore > this.awayScore
            ? 'FULL TIME — YOU WIN!'
            : this.homeScore < this.awayScore
              ? 'FULL TIME — CPU WINS'
              : 'FULL TIME — DRAW';
        this.setMessage(verdict, 9999);
        this.freeze = 9999;
      }
    }

    this.markTimer -= dt;
    if (this.markTimer <= 0) {
      this.markTimer = 0.35;
      this.computeMarking();
    }

    this.updateSwitchHint();
    this.handleSwitchKey();
    this.updateControlled(dt);
    this.updateHomeTeammates(dt);
    this.updateAwayTeam(dt);
    this.separatePlayers();
    this.resolvePossession();
    this.updateBall(dt);
    this.handleGoals();
    this.updateCamera(dt);

    this.justPressed = [];
  }

  /** Pan the TV camera toward the ball (with a little velocity lookahead). */
  private updateCamera(dt: number) {
    const target = clamp(this.ball.x + this.ball.vx * 0.25, CAM_MIN, CAM_MAX);
    const k = 1 - Math.exp(-2.6 * dt);
    this.camX += (target - this.camX) * k;
  }

  /**
   * FIFA-style switch scoring (lower = better candidate).
   *
   * When the CPU has the ball, the best player to switch to is NOT the one
   * radially closest to the ball — it's the one best placed to intercept
   * the carrier's path toward OUR goal: we project an intercept point in
   * front of the carrier (toward the home goal) and strongly prefer
   * goal-side defenders over players level with or behind the play.
   */
  private switchScore(p: PlayerEntity): number {
    const carrier = this.owner && this.owner.team === 'away' ? this.owner : null;

    if (carrier) {
      // Direction of the attack: blend "toward our goal" with the
      // carrier's actual movement.
      const goal = { x: 0, y: FIELD_H / 2 };
      const gl = len(goal.x - carrier.x, goal.y - carrier.y);
      let dirX = (goal.x - carrier.x) / gl;
      let dirY = (goal.y - carrier.y) / gl;
      const sp = len(carrier.vx, carrier.vy);
      if (sp > 40) {
        dirX = dirX * 0.5 + (carrier.vx / sp) * 0.5;
        dirY = dirY * 0.5 + (carrier.vy / sp) * 0.5;
        const dl = len(dirX, dirY);
        dirX /= dl;
        dirY /= dl;
      }
      const intercept = {
        x: carrier.x + dirX * 70,
        y: carrier.y + dirY * 70,
      };

      let score = dist(p, intercept);
      // Goal-side (between carrier and our goal) is what defending is
      // about — reward it; punish being behind the play.
      if (p.x < carrier.x - 5) score -= 55;
      else if (p.x > carrier.x + 15) score += 60;
      return score;
    }

    // Loose ball (or our own possession): closest to where the ball is
    // heading wins.
    const ahead = {
      x: clamp(this.ball.x + this.ball.vx * 0.35, 0, FIELD_W),
      y: clamp(this.ball.y + this.ball.vy * 0.35, 0, FIELD_H),
    };
    return dist(p, ahead);
  }

  private bestSwitchCandidate(exclude: PlayerEntity): PlayerEntity | null {
    let best: PlayerEntity | null = null;
    let bestScore = Infinity;
    for (const p of this.homePlayers) {
      if (p === exclude) continue;
      // The keeper is never auto-suggested (FIFA-style) unless he has the
      // ball or it's right next to him.
      if (p.isGK && this.owner !== p && dist(p, this.ball) > 160) continue;
      const s = this.switchScore(p);
      if (s < bestScore) {
        bestScore = s;
        best = p;
      }
    }
    return best;
  }

  /**
   * Compute who Q would switch to. No automatic switching happens here —
   * the hint is only a marker until the user presses Q (passing is the one
   * exception: control follows the pass you played).
   */
  private updateSwitchHint() {
    if (this.owner && this.owner.team === 'home' && this.owner !== this.controlled) {
      this.switchHint = this.owner;
      return;
    }
    const candidate = this.bestSwitchCandidate(this.controlled);
    // Only suggest a switch when the candidate is meaningfully better
    // positioned than the player you already control.
    if (
      candidate &&
      this.switchScore(candidate) + 25 < this.switchScore(this.controlled)
    ) {
      this.switchHint = candidate;
    } else {
      this.switchHint = null;
    }
  }

  private handleSwitchKey() {
    if (!this.justPressed.includes('KeyQ')) return;
    const target =
      this.switchHint ?? this.bestSwitchCandidate(this.controlled);
    if (target) {
      this.controlled = target;
      this.switchHint = null;
    }
  }

  private updateControlled(dt: number) {
    const p = this.controlled;
    let dx = 0;
    let dy = 0;
    if (this.keys.has('ArrowUp')) dy -= 1;
    if (this.keys.has('ArrowDown')) dy += 1;
    if (this.keys.has('ArrowLeft')) dx -= 1;
    if (this.keys.has('ArrowRight')) dx += 1;

    const speed = this.keys.has('KeyE') ? SPRINT_SPEED : WALK_SPEED;

    let tvx = 0;
    let tvy = 0;
    if (dx !== 0 || dy !== 0) {
      const l = len(dx, dy);
      tvx = (dx / l) * speed;
      tvy = (dy / l) * speed;
    }
    this.steer(p, tvx, tvy, dt);

    const owns = this.owner === p;
    for (const code of this.justPressed) {
      if (!owns || !KICK_KEYS.has(code)) continue;
      this.doHomeKick(code);
    }
  }

  // ---- kicking / passing --------------------------------------------------

  private doHomeKick(code: string) {
    const kicker = this.controlled;

    if (code === 'KeyD') {
      this.shootAssisted(kicker);
      return;
    }

    const isShort = code === 'KeyS';
    const isLong = code === 'KeyA';
    const isThrough = code === 'KeyW';
    if (!isShort && !isLong && !isThrough) return;
    this.passAssisted(kicker, { isShort, isLong, isThrough });
  }

  /**
   * FIFA-style assisted shot. The ball always goes toward the goal you
   * attack; the vertical arrow input picks the *zone* of the frame
   * (up = top half, down = bottom half, neutral = anywhere), and within
   * that zone the engine picks the placement with the clearest shooting
   * lane — i.e. the spot furthest from any blocking player, like FIFA's
   * assisted finishing steering shots away from the keeper/defenders.
   */
  private shootAssisted(kicker: PlayerEntity) {
    let vert = 0;
    if (this.keys.has('ArrowUp')) vert -= 1;
    if (this.keys.has('ArrowDown')) vert += 1;
    // No arrow held at all → fall back to the facing direction's vertical
    // lean, so curling runs still place shots naturally.
    const horizontalHeld =
      this.keys.has('ArrowLeft') || this.keys.has('ArrowRight');
    if (vert === 0 && !horizontalHeld) {
      if (kicker.facing.y < -0.45) vert = -1;
      else if (kicker.facing.y > 0.45) vert = 1;
    }

    const inset = 16; // keep aim inside the posts
    const mid = (goalTop + goalBottom) / 2;
    // Zone of the frame the input allows, and the spot the input "wants".
    let zoneLo = goalTop + inset;
    let zoneHi = goalBottom - inset;
    let desiredY = mid;
    if (vert < 0) {
      zoneHi = mid - 8;
      desiredY = goalTop + inset; // top corner
    } else if (vert > 0) {
      zoneLo = mid + 8;
      desiredY = goalBottom - inset; // bottom corner
    }

    // Sample candidate placements across the allowed zone and score each
    // by how clear the shooting lane is (distance of the nearest blocker
    // to the ball→target line), with a tie-break preference for the spot
    // the player's input asked for.
    const blockers = [...this.awayPlayers, ...this.homePlayers].filter(
      (p) => p !== kicker,
    );
    const goalX = FIELD_W - 2;
    const zoneSpan = Math.max(zoneHi - zoneLo, 1);
    const SAMPLES = 9;
    let bestY = desiredY;
    let bestScore = -Infinity;
    for (let i = 0; i < SAMPLES; i++) {
      const ty = zoneLo + (zoneSpan * i) / (SAMPLES - 1);
      const target = { x: goalX, y: ty };
      let clearance = Infinity;
      for (const b of blockers) {
        clearance = Math.min(
          clearance,
          distToSegment(b, this.ball, target) - b.r,
        );
      }
      // Clearance dominates (capped so wide-open lanes stop competing),
      // input preference breaks ties between similarly open lanes.
      const score =
        Math.min(clearance, 50) +
        (1 - Math.abs(ty - desiredY) / zoneSpan) * 16;
      if (score > bestScore) {
        bestScore = score;
        bestY = ty;
      }
    }

    this.kickBallToward({ x: goalX, y: bestY }, 660, kicker);
  }

  private passAssisted(
    kicker: PlayerEntity,
    opts: { isShort: boolean; isLong: boolean; isThrough: boolean },
  ) {
    const { isShort, isLong, isThrough } = opts;

    const target = this.pickPassTarget(kicker, {
      short: isShort,
      long: isLong,
      through: isThrough,
    });
    if (!target) {
      // No teammate available — knock it in the aimed direction.
      const f = this.heldDir(kicker);
      this.ball.vx = f.x * 380;
      this.ball.vy = f.y * 380;
      this.afterKick(kicker);
      return;
    }

    let aim: Vec;
    if (isThrough) {
      // Lead the receiver along their actual RUN (FIFA through ball):
      // play the ball into the space they're heading to, defaulting to
      // straight at the opponent goal when they're standing still.
      const atkX = kicker.team === 'home' ? 1 : -1;
      const sp = Math.hypot(target.vx, target.vy);
      let rx = atkX;
      let ry = 0;
      if (sp > 50) {
        rx = target.vx / sp;
        ry = target.vy / sp;
        // Never lead a through ball backwards.
        if (rx * atkX < 0.1) {
          rx = atkX * 0.55;
          const rl = len(rx, ry);
          rx /= rl;
          ry /= rl;
        }
      }
      const lead = 200;
      aim = {
        x: clamp(target.x + rx * lead, 30, FIELD_W - 30),
        y: clamp(target.y + ry * lead, 20, FIELD_H - 20),
      };
    } else {
      // Aim slightly ahead of where they're moving.
      aim = {
        x: clamp(target.x + target.vx * 0.2, 15, FIELD_W - 15),
        y: clamp(target.y + target.vy * 0.2, 15, FIELD_H - 15),
      };
    }

    const d = dist(this.ball, aim);
    // Friction-aware power: arrive at the aim point still rolling at the
    // given speed (exponential friction covers (v0 - vEnd)/BALL_DECAY px),
    // instead of dying en route like the old distance multipliers did.
    const power = isLong
      ? this.passPower(d, 320, 1500)
      : isThrough
        ? this.passPower(d, 300, 1050)
        : this.passPower(d, 260, 880);

    this.kickBallToward(aim, power, kicker);

    // Control follows your pass (FIFA-style). All other switching is Q-only.
    this.controlled = target;
  }

  /** The direction the user is holding on the arrows, falling back to the
   *  kicker's facing when no arrow is held (FIFA: your held direction at
   *  the moment of the pass picks the intended receiver). */
  private heldDir(kicker: PlayerEntity): Vec {
    let dx = 0;
    let dy = 0;
    if (this.keys.has('ArrowUp')) dy -= 1;
    if (this.keys.has('ArrowDown')) dy += 1;
    if (this.keys.has('ArrowLeft')) dx -= 1;
    if (this.keys.has('ArrowRight')) dx += 1;
    if (dx === 0 && dy === 0) return kicker.facing;
    const l = len(dx, dy);
    return { x: dx / l, y: dy / l };
  }

  /**
   * FIFA-style receiver selection: the HELD ARROW direction picks the
   * target — the first teammate in the aimed cone wins, with alignment
   * dominating. No preferred-distance bands (the old ~380px through-ball
   * band made W skip the close runner for a farther one). Long passes
   * keep a mild bonus for distance so A finds the far outlet.
   */
  private pickPassTarget(
    kicker: PlayerEntity,
    opts: { short: boolean; long: boolean; through: boolean },
  ): PlayerEntity | null {
    const aim = this.heldDir(kicker);
    const mates = (
      kicker.team === 'home' ? this.homePlayers : this.awayPlayers
    ).filter((p) => p !== kicker && !(opts.through && p.isGK));

    let best: PlayerEntity | null = null;
    let bestScore = -Infinity;

    for (const m of mates) {
      const dx = m.x - kicker.x;
      const dy = m.y - kicker.y;
      const d = len(dx, dy);
      const align = (dx / d) * aim.x + (dy / d) * aim.y;

      // Alignment with the aimed direction dominates everything else.
      let score = align * 260;
      // Teammates behind / far outside the aim cone are a last resort.
      if (align < 0.1) score -= 400;

      if (opts.long) {
        score += clamp(d, 0, 900) * 0.12; // find the far outlet
      } else {
        // Short & through: first man along the aim, nearest wins ties.
        score -= d * (opts.short ? 0.3 : 0.22);
      }

      if (score > bestScore) {
        bestScore = score;
        best = m;
      }
    }

    return best;
  }

  /** Power needed to reach distance d and still roll at `arrival` speed. */
  private passPower(d: number, arrival: number, max: number) {
    return Math.min(BALL_DECAY * d + arrival, max);
  }

  private kickBallToward(aim: Vec, power: number, kicker: PlayerEntity) {
    const dx = aim.x - this.ball.x;
    const dy = aim.y - this.ball.y;
    const l = len(dx, dy);
    this.ball.vx = (dx / l) * power;
    this.ball.vy = (dy / l) * power;
    this.afterKick(kicker);
  }

  private afterKick(kicker: PlayerEntity) {
    this.owner = null;
    this.lastKicker = kicker;
    this.kickerLock = 0.45;
    kicker.kickTimer = 0.28;
  }

  // ---- teammates AI (home, non-controlled) --------------------------------

  /** Keeper stays on his line and tracks the ball across the goal mouth. */
  private keeperTarget(p: PlayerEntity): Vec {
    const mid = FIELD_H / 2;
    const ty = clamp(
      mid + (this.ball.y - mid) * 0.55,
      goalTop + 16,
      goalBottom - 16,
    );
    // Step slightly off the line when the ball is close on his side.
    const ownGoalX = p.team === 'home' ? 0 : FIELD_W;
    const ballDX = Math.abs(this.ball.x - ownGoalX);
    const out = ballDX < 320 ? 46 : 26;
    const tx = p.team === 'home' ? p.anchor.x + out - 26 : p.anchor.x - out + 26;
    return { x: tx, y: ty };
  }

  // ---- off-ball intelligence (FIFA-style, both teams) ----------------------

  private markAssign = new Map<PlayerEntity, PlayerEntity>();
  private markTimer = 0;

  /**
   * Assign defenders to man-mark dangerous opponents, like FIFA marks
   * attackers who get near the defensive zone. Greedy: the most dangerous
   * threat (closest to the defended goal) is claimed first by the nearest
   * free defender within 320px. Recomputed every 0.35s so marks are stable
   * and don't jitter between assignments.
   */
  private computeMarking() {
    this.markAssign.clear();
    const owner = this.owner;
    if (!owner) return;
    const attackers =
      owner.team === 'home' ? this.homePlayers : this.awayPlayers;
    const defenders =
      owner.team === 'home' ? this.awayPlayers : this.homePlayers;
    const defGoalX = owner.team === 'home' ? FIELD_W : 0;
    const threats = attackers
      .filter(
        (a) =>
          a !== owner && !a.isGK && Math.abs(a.x - defGoalX) < FIELD_W * 0.62,
      )
      .sort((a, b) => Math.abs(a.x - defGoalX) - Math.abs(b.x - defGoalX));
    const taken = new Set<PlayerEntity>();
    for (const threat of threats) {
      let best: PlayerEntity | null = null;
      let bestD = 320;
      for (const def of defenders) {
        if (def.isGK || def === this.controlled || taken.has(def)) continue;
        const dd = dist(def, threat);
        if (dd < bestD) {
          bestD = dd;
          best = def;
        }
      }
      if (best) {
        taken.add(best);
        this.markAssign.set(best, threat);
      }
    }
  }

  /** Goal-side (slightly ball-side) marking spot 40px off the attacker. */
  private markTarget(d: PlayerEntity, threat: PlayerEntity): Vec {
    const goal = { x: d.team === 'home' ? 0 : FIELD_W, y: FIELD_H / 2 };
    const lg = len(goal.x - threat.x, goal.y - threat.y);
    const gx = (goal.x - threat.x) / lg;
    const gy = (goal.y - threat.y) / lg;
    const lb = len(this.ball.x - threat.x, this.ball.y - threat.y);
    const bx = (this.ball.x - threat.x) / lb;
    const by = (this.ball.y - threat.y) / lb;
    const mx = gx * 0.75 + bx * 0.25;
    const my = gy * 0.75 + by * 0.25;
    const ml = len(mx, my);
    return this.clampTarget({
      x: threat.x + (mx / ml) * 40,
      y: threat.y + (my / ml) * 40,
    });
  }

  private clampTarget(t: Vec): Vec {
    return {
      x: clamp(t.x, 20, FIELD_W - 20),
      y: clamp(t.y, 20, FIELD_H - 20),
    };
  }

  /**
   * FIFA-style off-ball positioning, used by every player except the
   * user-controlled one, the carrier, and the active presser/chaser.
   *
   * The team shape is BALL-RELATIVE, not anchor-relative: each line
   * (DF/MF/ST) targets a depth measured from its own goal that tracks the
   * ball, so the block moves up and down the pitch as a connected unit —
   * no gap between the players joining the attack and the rest.
   * Line depths are clamped so the defence never collapses onto its own
   * goal line (floor ≈ penalty-box edge) and strikers never drop deep.
   * - ATTACK: lines push up around the ball; players level with/ahead of
   *   the carrier make runs in behind; everyone drifts off markers.
   * - DEFEND: compact mid/low block + goal-side man-marking (computeMarking).
   * - LOOSE: neutral block around the ball.
   */
  private offBallPlan(
    p: PlayerEntity,
    baseSpeed: number,
  ): { pos: Vec; speed: number } {
    if (p.isGK) return { pos: this.keeperTarget(p), speed: baseSpeed };
    const dir = p.team === 'home' ? 1 : -1;
    const ownGoalX = p.team === 'home' ? 0 : FIELD_W;
    /** Distance from own goal along the attacking direction (0..FIELD_W). */
    const depth = (x: number) => (x - ownGoalX) * dir;
    const fromDepth = (d: number) => ownGoalX + d * dir;
    const ballD = depth(this.ball.x);
    const W = FIELD_W;
    const owner = this.owner;
    const phase: 'attack' | 'defend' | 'loose' = !owner
      ? 'loose'
      : owner.team === p.team
        ? 'attack'
        : 'defend';

    // Per-line target depth, tracking the ball. [DF, MF, ST] per phase.
    let lineD: number;
    if (phase === 'defend') {
      lineD =
        p.role === 'DF'
          ? clamp(ballD - 200, 170, W * 0.52) // never parked on the goal line
          : p.role === 'MF'
            ? clamp(ballD - 20, 340, W * 0.68)
            : clamp(ballD + 230, W * 0.4, W * 0.75); // STs stay up as the outlet
    } else if (phase === 'attack') {
      lineD =
        p.role === 'DF'
          ? clamp(ballD - 420, 280, W * 0.58)
          : p.role === 'MF'
            ? clamp(ballD - 150, 450, W * 0.8)
            : clamp(ballD + 170, 720, W - 170);
    } else {
      lineD =
        p.role === 'DF'
          ? clamp(ballD - 300, 220, W * 0.55)
          : p.role === 'MF'
            ? clamp(ballD - 80, 400, W * 0.74)
            : clamp(ballD + 200, 640, W * 0.85);
    }
    // Keep the formation's internal stagger (full-backs/wingers slightly
    // higher than the centre of their line).
    const roleCenter = p.role === 'DF' ? 0.15 : p.role === 'MF' ? 0.33 : 0.52;
    lineD += (depth(p.anchor.x) / W - roleCenter) * W * 1.6;

    // Width: hold the lane from the formation, pulled toward the ball side.
    const ySqueeze = phase === 'defend' ? 0.4 : 0.28;
    const t = {
      x: fromDepth(lineD),
      y: p.anchor.y + (this.ball.y - FIELD_H / 2) * ySqueeze,
    };

    // DEFEND: man-marking overrides the zonal block.
    if (phase === 'defend') {
      const mark = this.markAssign.get(p);
      if (mark) {
        return { pos: this.markTarget(p, mark), speed: PRESS_SPEED * 0.95 };
      }
      return { pos: this.clampTarget(t), speed: baseSpeed };
    }

    // ATTACK
    if (phase === 'attack' && owner) {
      let speed = baseSpeed;
      // Run in behind when level with / ahead of the carrier and near
      // the play — this is what creates through-ball targets.
      if (
        p.role !== 'DF' &&
        (p.x - owner.x) * dir > -50 &&
        dist(p, owner) < 560
      ) {
        t.x = clamp(owner.x + dir * 260, 150, FIELD_W - 150);
        speed = RUN_SPEED;
      }
      // Get open: drift away from the nearest opponent near the spot so
      // there's always a clean passing option.
      const pos = this.clampTarget(t);
      const opps = p.team === 'home' ? this.awayPlayers : this.homePlayers;
      const near = this.nearestTo(opps, pos);
      if (near) {
        const d = dist(near, pos);
        if (d < 95) {
          const push = 95 - d;
          pos.x += ((pos.x - near.x) / (d || 1)) * push;
          pos.y += ((pos.y - near.y) / (d || 1)) * push;
        }
      }
      return { pos: this.clampTarget(pos), speed };
    }

    // LOOSE
    return { pos: this.clampTarget(t), speed: baseSpeed };
  }

  private updateHomeTeammates(dt: number) {
    const awayCarrier =
      this.owner && this.owner.team === 'away' ? this.owner : null;
    // One teammate actively presses the CPU carrier (or races to a loose
    // ball the CPU last touched) — the user only controls one player, so
    // without this the team never defends. Everyone else marks/keeps shape.
    let presser: PlayerEntity | null = null;
    const candidates = this.homePlayers.filter(
      (p) => p !== this.controlled && !p.isGK && this.owner !== p,
    );
    if (awayCarrier) {
      presser = this.nearestTo(candidates, awayCarrier);
    } else if (!this.owner && this.lastKicker?.team === 'away') {
      presser = this.nearestTo(candidates, this.ball);
    }

    for (const p of this.homePlayers) {
      if (p === this.controlled) continue;
      if (this.owner === p) {
        if (p.isGK) {
          // Your keeper distributes automatically: pass to the most open
          // teammate (control stays where it is — no auto-switch).
          this.steer(p, 0, 0, dt);
          this.homeKeeperDistribute(dt);
          continue;
        }
        // A teammate has the ball but you haven't switched to them:
        // they shield it and wait for you (press Q to take over).
        this.steer(p, 0, 0, dt);
        this.faceToward(p, 1, 0, dt);
        continue;
      }
      if (p === presser) {
        const t = this.clampTarget({
          x: this.ball.x + this.ball.vx * 0.18,
          y: this.ball.y + this.ball.vy * 0.18,
        });
        this.moveToward(p, t, PRESS_SPEED, dt);
        continue;
      }
      const plan = this.offBallPlan(p, TEAMMATE_SPEED);
      // Jog into position, but RUN when badly out of position.
      const sp =
        dist(p, plan.pos) > 240 ? Math.max(plan.speed, RUN_SPEED) : plan.speed;
      this.moveToward(p, plan.pos, sp, dt);
    }
  }

  private gkHoldTimer = 0;

  private homeKeeperDistribute(dt: number) {
    const gk = this.owner;
    if (!gk) return;
    this.gkHoldTimer += dt;
    if (this.gkHoldTimer < 0.7) return; // brief hold before clearing
    this.gkHoldTimer = 0;
    let best: PlayerEntity | null = null;
    let bestScore = -Infinity;
    for (const m of this.homePlayers) {
      if (m === gk || m.isGK) continue;
      const score =
        this.nearestOpponentDist(m) - Math.abs(m.x - FIELD_W * 0.45) * 0.1;
      if (score > bestScore) {
        bestScore = score;
        best = m;
      }
    }
    if (best) {
      const d = dist(this.ball, best);
      this.kickBallToward(best, this.passPower(d, 300, 1300), gk);
    }
  }

  // ---- CPU team AI ---------------------------------------------------------

  private updateAwayTeam(dt: number) {
    const carrier =
      this.owner && this.owner.team === 'away' ? this.owner : null;
    // The keeper never leaves his area to chase.
    const outfield = this.awayPlayers.filter(
      (p) => !p.isGK || dist(p, this.ball) < 200,
    );
    const chaser =
      carrier ?? this.nearestTo(outfield, this.ball) ?? this.awayPlayers[1];

    for (const p of this.awayPlayers) {
      if (p === carrier) {
        this.updateAwayCarrier(p, dt);
      } else if (p === chaser) {
        // Chase the ball with slight anticipation.
        const t = {
          x: clamp(this.ball.x + this.ball.vx * 0.18, p.r, FIELD_W - p.r),
          y: clamp(this.ball.y + this.ball.vy * 0.18, p.r, FIELD_H - p.r),
        };
        this.moveToward(p, t, AWAY_CHASE_SPEED, dt);
      } else {
        const plan = this.offBallPlan(p, AWAY_FORMATION_SPEED);
        const sp =
          dist(p, plan.pos) > 240
            ? Math.max(plan.speed, RUN_SPEED)
            : plan.speed;
        this.moveToward(p, plan.pos, sp, dt);
      }
    }
  }

  private updateAwayCarrier(p: PlayerEntity, dt: number) {
    // The keeper doesn't dribble out — he clears long upfield.
    if (p.isGK) {
      this.steer(p, 0, 0, dt);
      if (this.cpuDecision > 0) return;
      this.cpuDecision = 0.5;
      let best: PlayerEntity | null = null;
      let bestScore = -Infinity;
      for (const m of this.awayPlayers) {
        if (m === p || m.isGK) continue;
        const score = this.nearestOpponentDist(m) - Math.abs(m.x - FIELD_W * 0.5) * 0.1;
        if (score > bestScore) {
          bestScore = score;
          best = m;
        }
      }
      if (best) {
        const d = dist(this.ball, best);
        this.kickBallToward(best, this.passPower(d, 300, 1300), p);
      }
      return;
    }

    // Dribble toward the player's (left) goal.
    const t = { x: 36, y: FIELD_H / 2 + (p.y - FIELD_H / 2) * 0.35 };
    this.moveToward(p, t, AWAY_CARRY_SPEED, dt);

    if (this.cpuDecision > 0) return;
    this.cpuDecision = 0.5;

    const pressure = this.nearestOpponentDist(p);

    // Shoot when in range.
    if (p.x < 300) {
      const gy = clamp(p.y, goalTop + 24, goalBottom - 24);
      this.kickBallToward({ x: 0, y: gy }, 640, p);
      return;
    }

    // Pass when pressured and a teammate is further forward + open.
    if (pressure < 85) {
      let best: PlayerEntity | null = null;
      let bestScore = -Infinity;
      for (const m of this.awayPlayers) {
        if (m === p) continue;
        if (m.x > p.x - 40) continue; // must be more advanced (closer to left goal)
        const openness = this.nearestOpponentDist(m);
        if (openness < 90) continue;
        const score = openness - dist(p, m) * 0.2;
        if (score > bestScore) {
          bestScore = score;
          best = m;
        }
      }
      if (best) {
        const d = dist(this.ball, best);
        this.kickBallToward(
          { x: best.x + best.vx * 0.2, y: best.y + best.vy * 0.2 },
          this.passPower(d, 260, 880),
          p,
        );
      }
    }
  }

  // ---- possession / ball ---------------------------------------------------

  private resolvePossession() {
    const prev = this.owner;

    let best: PlayerEntity | null = null;
    let bestD = Infinity;
    for (const p of [...this.homePlayers, ...this.awayPlayers]) {
      if (this.kickerLock > 0 && p === this.lastKicker) continue;
      // A freshly dispossessed player can't win the ball straight back.
      if (this.dispossessed === p) continue;
      const d = dist(p, this.ball);
      if (d <= CONTROL_DIST && d < bestD) {
        bestD = d;
        best = p;
      }
    }

    // Hysteresis: the current owner keeps the ball against challengers
    // unless the challenger gets meaningfully closer AND the protection
    // window from winning it has elapsed.
    if (prev && best && best !== prev && this.dispossessed !== prev) {
      const prevD = dist(prev, this.ball);
      if (prevD <= CONTROL_DIST + 4) {
        const challengerWins =
          this.stealProtect <= 0 &&
          (best.team === prev.team || bestD < prevD - 7);
        if (!challengerWins) best = prev;
      }
    }

    // Possession changed hands.
    if (best && best !== prev) {
      if (prev && prev.team !== best.team) {
        // Tackle won: protect the winner and lock out the loser.
        this.stealProtect = 0.9;
        this.dispossessed = prev;
        this.dispossessedTimer = 1.2;
        // Turn the winner away from the tackled opponent so the dribble
        // carries the ball out on the FAR side, not back into their feet.
        const dx = best.x - prev.x;
        const dy = best.y - prev.y;
        const l = len(dx, dy);
        best.facing = { x: dx / l, y: dy / l };
        this.ball.x = best.x + (dx / l) * (best.r + this.ball.r);
        this.ball.y = best.y + (dy / l) * (best.r + this.ball.r);
      } else {
        // Clean receive (pass or loose ball) — short protection.
        this.stealProtect = 0.35;
      }
    }

    this.owner = best;
    if (best) {
      // FIFA-style: when YOUR team gains possession, you control the man
      // on the ball (the GK distributes by himself). Off-ball switching
      // remains strictly Q-only.
      if (best.team === 'home' && !best.isGK) {
        this.controlled = best;
      }
      this.dribble(best);
      // Receiving a pass clears the kicker lock so play flows.
      this.lastKicker = null;
      this.kickerLock = 0;
    }
  }

  private dribble(owner: PlayerEntity) {
    // While protected (just won a tackle / received), keep the ball glued
    // to the feet instead of pushed out in front where it can be poked.
    const ahead =
      this.stealProtect > 0
        ? owner.r + this.ball.r - 2
        : owner.r + this.ball.r + 4;
    const targetX = owner.x + owner.facing.x * ahead;
    const targetY = owner.y + owner.facing.y * ahead;
    const snap = this.stealProtect > 0 ? 0.55 : 0.3;
    this.ball.x += (targetX - this.ball.x) * snap;
    this.ball.y += (targetY - this.ball.y) * snap;
    this.ball.vx = owner.vx;
    this.ball.vy = owner.vy;
  }

  /** Soft circle-vs-circle separation so players can't stand inside each other. */
  private separatePlayers() {
    const all = [...this.homePlayers, ...this.awayPlayers];
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const a = all[i];
        const b = all[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        const minD = a.r + b.r - 4; // slight overlap allowed for shoulder contact
        if (d > 0 && d < minD) {
          const push = (minD - d) / 2;
          const nx = dx / d;
          const ny = dy / d;
          a.x -= nx * push;
          a.y -= ny * push;
          b.x += nx * push;
          b.y += ny * push;
          this.clampToField(a);
          this.clampToField(b);
        }
      }
    }
  }

  private updateBall(dt: number) {
    if (this.owner) return; // dribble handles it

    this.ball.x += this.ball.vx * dt;
    this.ball.y += this.ball.vy * dt;

    const decay = Math.exp(-BALL_DECAY * dt);
    this.ball.vx *= decay;
    this.ball.vy *= decay;
    if (Math.hypot(this.ball.vx, this.ball.vy) < 4) {
      this.ball.vx = 0;
      this.ball.vy = 0;
    }

    if (this.ball.y < this.ball.r) {
      this.ball.y = this.ball.r;
      this.ball.vy = Math.abs(this.ball.vy) * 0.7;
    } else if (this.ball.y > FIELD_H - this.ball.r) {
      this.ball.y = FIELD_H - this.ball.r;
      this.ball.vy = -Math.abs(this.ball.vy) * 0.7;
    }

    const inGoalMouth = this.ball.y > goalTop && this.ball.y < goalBottom;
    if (!inGoalMouth) {
      if (this.ball.x < this.ball.r) {
        this.ball.x = this.ball.r;
        this.ball.vx = Math.abs(this.ball.vx) * 0.7;
      } else if (this.ball.x > FIELD_W - this.ball.r) {
        this.ball.x = FIELD_W - this.ball.r;
        this.ball.vx = -Math.abs(this.ball.vx) * 0.7;
      }
    }
  }

  private handleGoals() {
    const inMouth = this.ball.y > goalTop && this.ball.y < goalBottom;
    if (!inMouth) return;

    if (this.ball.x <= 2) {
      this.awayScore += 1;
      this.setMessage('CPU SCORES', 1.6);
      this.resetKickoff('home');
    } else if (this.ball.x >= FIELD_W - 2) {
      this.homeScore += 1;
      this.setMessage('G O A L !', 1.6);
      this.resetKickoff('away');
    }
  }

  private clampToField(m: { x: number; y: number; r: number }) {
    m.x = Math.max(m.r, Math.min(FIELD_W - m.r, m.x));
    m.y = Math.max(m.r, Math.min(FIELD_H - m.r, m.y));
  }

  // ---- render (TV broadcast pseudo-3D) ------------------------------------

  private render() {
    const ctx = this.ctx;
    viewCamX = this.camX; // sync the projection with the engine camera
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Stadium backdrop: dark stands above the far touchline.
    const sky = ctx.createLinearGradient(0, 0, 0, PITCH_TOP + 20);
    sky.addColorStop(0, '#05080c');
    sky.addColorStop(1, '#0d1420');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    this.drawCrowd(ctx);

    this.drawPitch(ctx);
    this.drawGoalBack(ctx, 'left');
    this.drawGoalBack(ctx, 'right');

    // Depth-sort all drawables (players + ball) so near covers far.
    type Drawable = { depth: number; draw: () => void };
    const items: Drawable[] = [];
    for (const p of [...this.awayPlayers, ...this.homePlayers]) {
      // Cull players well outside the camera view.
      const px = proj(p.x, p.y).x;
      if (px < -60 || px > CANVAS_W + 60) continue;
      items.push({
        depth: p.y,
        draw: () => this.drawHumanoid(ctx, p, kitFor(p)),
      });
    }
    items.push({ depth: this.ball.y, draw: () => this.drawBall(ctx) });
    items.sort((a, b) => a.depth - b.depth);
    for (const it of items) it.draw();

    this.drawGoalFront(ctx, 'left');
    this.drawGoalFront(ctx, 'right');
  }

  /** Crowd dots + hoarding behind the far touchline, with camera parallax. */
  private drawCrowd(ctx: CanvasRenderingContext2D) {
    const top = 18;
    const bottom = PITCH_TOP - 14;
    ctx.fillStyle = '#101a28';
    ctx.fillRect(0, top, CANVAS_W, bottom - top);
    // Stands pan with the camera at the far-line rate (parallax).
    const offset = -(this.camX - FIELD_W / 2) * S_FAR;
    const span = (CAM_MAX - CAM_MIN) * S_FAR + CANVAS_W + 100;
    const x0 = -(CAM_MAX - FIELD_W / 2) * S_FAR - 50;
    // Deterministic pseudo-random dots (no per-frame flicker).
    for (let i = 0; i < 760; i++) {
      const n = Math.sin(i * 127.1) * 43758.5453;
      const fx = n - Math.floor(n);
      const n2 = Math.sin(i * 311.7) * 12543.123;
      const fy = n2 - Math.floor(n2);
      const x = x0 + fx * span + offset;
      if (x < -4 || x > CANVAS_W + 4) continue;
      const y = top + 6 + fy * (bottom - top - 12);
      const shade = 0.10 + ((i * 37) % 23) / 23 * 0.22;
      ctx.fillStyle = `rgba(180,200,230,${shade.toFixed(3)})`;
      ctx.fillRect(x, y, 2, 2);
    }
    // Hoarding strip between crowd and pitch.
    ctx.fillStyle = '#0a0f16';
    ctx.fillRect(0, bottom, CANVAS_W, PITCH_TOP - bottom);
    ctx.fillStyle = 'rgba(198,255,46,0.55)';
    ctx.font = '700 11px Oswald, sans-serif';
    ctx.textAlign = 'center';
    for (let x = x0; x < x0 + span; x += 220) {
      const sx = x + offset;
      if (sx < -110 || sx > CANVAS_W + 110) continue;
      ctx.fillText('P I T C H K I C K', sx, bottom + (PITCH_TOP - bottom) / 2 + 4);
    }
  }

  /** Trace a polygon of projected field points. */
  private projPath(ctx: CanvasRenderingContext2D, pts: Vec[], close = true) {
    ctx.beginPath();
    pts.forEach((pt, i) => {
      const q = proj(pt.x, pt.y);
      if (i === 0) ctx.moveTo(q.x, q.y);
      else ctx.lineTo(q.x, q.y);
    });
    if (close) ctx.closePath();
  }

  private drawPitch(ctx: CanvasRenderingContext2D) {
    // Grass apron slightly beyond the lines.
    this.projPath(ctx, [
      { x: -MARGIN, y: -26 },
      { x: FIELD_W + MARGIN, y: -26 },
      { x: FIELD_W + MARGIN, y: FIELD_H + 34 },
      { x: -MARGIN, y: FIELD_H + 34 },
    ]);
    ctx.fillStyle = '#1f6e3a';
    ctx.fill();

    // Mow stripes (vertical bands converging toward the far line).
    const stripes = 18;
    const sw = FIELD_W / stripes;
    for (let i = 0; i < stripes; i++) {
      this.projPath(ctx, [
        { x: i * sw, y: 0 },
        { x: (i + 1) * sw, y: 0 },
        { x: (i + 1) * sw, y: FIELD_H },
        { x: i * sw, y: FIELD_H },
      ]);
      ctx.fillStyle = i % 2 === 0 ? '#258044' : '#22783f';
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.78)';
    ctx.lineWidth = 2.5;

    // Touchlines + goal lines.
    this.projPath(ctx, [
      { x: 0, y: 0 },
      { x: FIELD_W, y: 0 },
      { x: FIELD_W, y: FIELD_H },
      { x: 0, y: FIELD_H },
    ]);
    ctx.stroke();

    // Halfway line.
    this.projPath(ctx, [
      { x: FIELD_W / 2, y: 0 },
      { x: FIELD_W / 2, y: FIELD_H },
    ], false);
    ctx.stroke();

    // Centre circle (projected → ellipse-ish, sampled).
    const circle: Vec[] = [];
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      circle.push({
        x: FIELD_W / 2 + Math.cos(a) * 130,
        y: FIELD_H / 2 + Math.sin(a) * 130,
      });
    }
    this.projPath(ctx, circle, false);
    ctx.stroke();
    const spot = proj(FIELD_W / 2, FIELD_H / 2);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(spot.x, spot.y, 3 * spot.s, 0, Math.PI * 2);
    ctx.fill();

    // Penalty boxes + six-yard boxes.
    const boxH = 560;
    const boxW = 300;
    const sixH = 300;
    const sixW = 110;
    const by = (FIELD_H - boxH) / 2;
    const sy = (FIELD_H - sixH) / 2;
    for (const left of [true, false]) {
      this.projPath(ctx, [
        { x: left ? 0 : FIELD_W, y: by },
        { x: left ? boxW : FIELD_W - boxW, y: by },
        { x: left ? boxW : FIELD_W - boxW, y: by + boxH },
        { x: left ? 0 : FIELD_W, y: by + boxH },
      ], false);
      ctx.stroke();
    }
    for (const left of [true, false]) {
      this.projPath(ctx, [
        { x: left ? 0 : FIELD_W, y: sy },
        { x: left ? sixW : FIELD_W - sixW, y: sy },
        { x: left ? sixW : FIELD_W - sixW, y: sy + sixH },
        { x: left ? 0 : FIELD_W, y: sy + sixH },
      ], false);
      ctx.stroke();
    }
  }

  // Goal frame: posts stand upright on screen; the mouth spans depth
  // (goalTop..goalBottom). Net + back structure drawn behind players,
  // front posts + crossbar drawn in front.
  private goalGeom(side: 'left' | 'right') {
    const gx = side === 'left' ? 0 : FIELD_W;
    const backX = side === 'left' ? -GOAL_DEPTH : FIELD_W + GOAL_DEPTH;
    const far = proj(gx, goalTop);
    const near = proj(gx, goalBottom);
    const backFar = proj(backX, goalTop + 10);
    const backNear = proj(backX, goalBottom - 10);
    const postH = (s: number) => 58 * s;
    return { far, near, backFar, backNear, postH };
  }

  private drawGoalBack(ctx: CanvasRenderingContext2D, side: 'left' | 'right') {
    const { far, near, backFar, backNear, postH } = this.goalGeom(side);

    // Net: back panel + side panels, simple mesh.
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 1;

    const meshSteps = 5;
    // Back panel verticals.
    for (let i = 0; i <= meshSteps; i++) {
      const t = i / meshSteps;
      const bx = backFar.x + (backNear.x - backFar.x) * t;
      const by = backFar.y + (backNear.y - backFar.y) * t;
      const bh = postH(backFar.s + (backNear.s - backFar.s) * t) * 0.82;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx, by - bh);
      ctx.stroke();
    }
    // Back panel horizontals.
    for (let i = 0; i <= 4; i++) {
      const t = i / 4;
      ctx.beginPath();
      ctx.moveTo(backFar.x, backFar.y - postH(backFar.s) * 0.82 * t);
      ctx.lineTo(backNear.x, backNear.y - postH(backNear.s) * 0.82 * t);
      ctx.stroke();
    }
    // Side panels (top diagonals from posts to back).
    ctx.beginPath();
    ctx.moveTo(far.x, far.y - postH(far.s));
    ctx.lineTo(backFar.x, backFar.y - postH(backFar.s) * 0.82);
    ctx.moveTo(near.x, near.y - postH(near.s));
    ctx.lineTo(backNear.x, backNear.y - postH(backNear.s) * 0.82);
    ctx.moveTo(far.x, far.y);
    ctx.lineTo(backFar.x, backFar.y);
    ctx.moveTo(near.x, near.y);
    ctx.lineTo(backNear.x, backNear.y);
    ctx.stroke();
  }

  private drawGoalFront(ctx: CanvasRenderingContext2D, side: 'left' | 'right') {
    const { far, near, postH } = this.goalGeom(side);
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

  private drawBall(ctx: CanvasRenderingContext2D) {
    const q = proj(this.ball.x, this.ball.y);
    const r = this.ball.r * q.s * 0.95;

    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(q.x + 2, q.y + 1.5, r * 1.05, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ball sits slightly above its ground point.
    const by = q.y - r * 0.7;
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
    const roll = (this.ball.x + this.ball.y) * 0.12;
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
  private drawHumanoid(ctx: CanvasRenderingContext2D, p: PlayerEntity, kit: Kit) {
    const q = proj(p.x, p.y);
    const s = q.s;
    const speed = Math.hypot(p.vx, p.vy);
    const moving = speed > 30;
    const swing = moving ? Math.sin(p.animPhase) : 0;
    const kicking = p.kickTimer > 0;

    const fx = p.facing.x;
    const fy = p.facing.y;
    // Horizontal mirror: face left or right on screen.
    const side = fx >= 0 ? 1 : -1;
    // How much the player faces toward/away from the camera.
    const toward = clamp(fy, -1, 1);

    // Ground decorations (not scaled by ctx transform — drawn in screen px).
    // Possession ring / selection ring under the feet.
    if (this.owner === p) {
      ctx.strokeStyle = 'rgba(198,255,46,0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(q.x, q.y + 2 * s, 15 * s, 6 * s, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(q.x + 2 * s, q.y + 1.5 * s, 11 * s, 4 * s, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(q.x, q.y);
    ctx.scale(s, s);

    const H = 44; // body height at scale 1
    const hipY = -H * 0.42;
    const shoulderY = -H * 0.78;
    const headY = -H * 0.9;
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
    const drawLeg = (footX: number, footY: number, lift: number, hipX: number) => {
      const fy2 = footY - lift;
      // Thigh + calf as a single two-tone limb.
      ctx.strokeStyle = p.skin;
      ctx.lineWidth = 3.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hipX, hipY + bob);
      const kneeX = (hipX + footX) / 2;
      const kneeY = (hipY + bob + fy2) / 2 - 1.5;
      ctx.quadraticCurveTo(kneeX, kneeY, footX, fy2 - 4);
      ctx.stroke();
      // Sock.
      ctx.strokeStyle = sockColor;
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo((kneeX + footX) / 2, (kneeY + fy2) / 2 - 2);
      ctx.lineTo(footX, fy2 - 2.5);
      ctx.stroke();
      // Boot.
      ctx.fillStyle = '#16181d';
      ctx.beginPath();
      ctx.ellipse(footX + side * 1.4, fy2 - 1, 3.4, 1.9, 0, 0, Math.PI * 2);
      ctx.fill();
    };

    // Far leg first (slightly darker), near leg after.
    drawLeg(f2x, f2y, f2Lift, -side * 2.2);
    drawLeg(f1x, f1y, f1Lift, side * 2.2);

    // Shorts.
    ctx.fillStyle = '#f4f6f9';
    ctx.beginPath();
    ctx.roundRect(-6, hipY + bob - 5, 12, 8, 3);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.18)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Arms (counter-swing). Far arm behind torso, near arm in front.
    const armSwing = kicking ? 6 : -swing * 5;
    const drawArm = (dir: number, swingAmt: number) => {
      ctx.strokeStyle = kit.sleeve;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(dir * 5.5, shoulderY + bob + 2);
      ctx.quadraticCurveTo(
        dir * 7 + swingAmt * 0.4,
        shoulderY + bob + 9,
        dir * 5 + swingAmt,
        hipY + bob + 1,
      );
      ctx.stroke();
      // Hand.
      ctx.fillStyle = p.skin;
      ctx.beginPath();
      ctx.arc(dir * 5 + swingAmt, hipY + bob + 1.5, 1.6, 0, Math.PI * 2);
      ctx.fill();
    };
    drawArm(-side, -armSwing * side);

    // Torso (shirt).
    ctx.fillStyle = kit.shirt;
    ctx.beginPath();
    ctx.moveTo(-6.5, shoulderY + bob + 1);
    ctx.quadraticCurveTo(0, shoulderY + bob - 2.5, 6.5, shoulderY + bob + 1);
    ctx.lineTo(5.2, hipY + bob - 3);
    ctx.quadraticCurveTo(0, hipY + bob - 1, -5.2, hipY + bob - 3);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = kit.outline;
    ctx.lineWidth = 1;
    ctx.stroke();
    // Kit stripe.
    ctx.strokeStyle = kit.sleeve;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(side * 3.4, shoulderY + bob + 0.5);
    ctx.lineTo(side * 2.8, hipY + bob - 3);
    ctx.stroke();

    // Near arm (in front of torso).
    drawArm(side, armSwing * side);

    // Head + hair, orientation hints from facing.
    const headX = fx * 1.6;
    ctx.fillStyle = p.skin;
    ctx.beginPath();
    ctx.arc(headX, headY + bob, 4.4, 0, Math.PI * 2);
    ctx.fill();
    // Hair: cap on top; covers more of the face when running away from
    // camera (toward < 0 = facing up/away → we see the back of the head).
    ctx.fillStyle = p.hair;
    const hairBias = toward < -0.3 ? 1 : 0.45; // away → full back of head
    ctx.beginPath();
    ctx.arc(headX, headY + bob, 4.4, Math.PI + 0.2, -0.2);
    ctx.fill();
    if (toward < -0.3) {
      ctx.beginPath();
      ctx.arc(headX, headY + bob + 1, 3.9 * hairBias, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Profile/front: small sideburn toward the back of the head.
      ctx.beginPath();
      ctx.arc(headX - side * 2.2, headY + bob + 0.5, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Markers above the head (screen space).
    const topY = q.y - 50 * s;
    if (p === this.controlled) {
      ctx.fillStyle = '#c6ff2e';
      ctx.beginPath();
      ctx.moveTo(q.x, topY);
      ctx.lineTo(q.x - 6.5, topY - 10);
      ctx.lineTo(q.x + 6.5, topY - 10);
      ctx.closePath();
      ctx.fill();
    } else if (p === this.switchHint) {
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
}
