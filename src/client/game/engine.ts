// PitchKick — arcade football engine (11v11 vs CPU).
// Pure canvas + requestAnimationFrame. No React inside the hot loop.
// Simulation is flat 2D; the renderer (./render.ts) projects it with a
// pseudo-3D TV broadcast camera (./projection.ts). World scale, geometry,
// physics and gameplay tunables live in ./constants.ts, stateless helpers in
// ./math.ts, and shared engine types in ./types.ts.

import type { TeamData, Kit } from './teams/types';
import {
  FIELD_W,
  FIELD_H,
  M,
  goalTop,
  goalBottom,
  PLAYER_R,
  BALL_R,
  GRAVITY,
  BOUNCE,
  CONTROL_HEIGHT,
  WALK_SPEED,
  SPRINT_SPEED,
  TEAMMATE_SPEED,
  AWAY_CHASE_SPEED,
  AWAY_CARRY_SPEED,
  AWAY_FORMATION_SPEED,
  RUN_SPEED,
  PRESS_SPEED,
  JOCKEY_SPEED,
  TACKLE_LUNGE_SPEED,
  CONTROL_DIST,
  BALL_DECAY,
  CHARGE_FULL,
  KICK_BUFFER,
  MATCH_DISPLAY_SECS,
  MATCH_REAL_SECS,
  ACCEL,
  TURN_RATE,
  HAIR_COLORS,
  SKIN_TONES,
} from './constants';
import { len, dist, clamp, distToSegment } from './math';
import { CAM_MIN, CAM_MAX, CAM_Y_MIN, CAM_Y_MAX } from './projection';
import type { Vec, Team, PlayerEntity, StateListener } from './types';
import { renderScene } from './render';

// Re-exports so consumers (e.g. HomePage) can import these from the engine entry.
export type { TeamData } from './teams/types';
export type { HudState } from './types';
export { CANVAS_W, CANVAS_H } from './constants';

const KICK_KEYS = new Set(['KeyW', 'KeyS', 'KeyA', 'KeyD']);
const ACTION_KEYS = new Set(['KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyQ']);
const MOVE_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'KeyE',
  'KeyC',
  'Space',
]);

// Team line-ups are no longer hardcoded here — they come from the two
// `TeamData` (home + away) passed into the engine. Each squad lists 11 players
// (index 0 = GK) with formation positions as fractions of the field attacking
// RIGHT; the away side is mirrored horizontally when built. See
// `./teams/` for the per-country data.

export class PitchKickGame {
  private ctx: CanvasRenderingContext2D;
  private raf = 0;
  private last = 0;
  private running = false;

  private keys = new Set<string>();
  private justPressed: string[] = [];
  private justReleased: string[] = [];
  /** Kick key currently charging (FIFA: press charges, release kicks). */
  private chargeKey: string | null = null;
  private chargeTime = 0;
  /** Q held when the charge began → loft the pass (Q+W = aerial through ball). */
  private chargeLofted = false;
  /** Buffered first-time kick: charge started before the ball arrived.
   *  `bufferTimer` counts down the window; `kickPending` = key already
   *  released, so fire the moment possession is gained. */
  private bufferTimer = 0;
  private kickPending = false;

  private ball = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, r: BALL_R };
  private homePlayers: PlayerEntity[] = [];
  private awayPlayers: PlayerEntity[] = [];
  private controlled!: PlayerEntity;
  /** The player Q would switch to (rendered as a hollow marker). */
  private switchHint: PlayerEntity | null = null;
  /** CPU's "active" player (carrier, else nearest to ball) — gets the away
   *  selected-player indicator, mirroring FIFA showing both sides' names. */
  private awayActive: PlayerEntity | null = null;

  private owner: PlayerEntity | null = null;
  private lastKicker: PlayerEntity | null = null;
  private kickerLock = 0;
  /** The teammate our last pass is travelling toward (becomes the controlled
   *  player). While the pass is in flight this player gets "ball gravity":
   *  their run is biased to meet the ball so a mistimed arrow press doesn't
   *  make them run away from it. Cleared once possession resolves. */
  private passReceiver: PlayerEntity | null = null;
  private cpuDecision = 0;
  /** Protection window after winning the ball — can't be tackled. */
  private stealProtect = 0;
  /** The player who just lost a tackle can't immediately win the ball back. */
  private dispossessed: PlayerEntity | null = null;
  private dispossessedTimer = 0;
  /** Standing tackle (D off the ball): active lunge window + commit cooldown. */
  private tackleTimer = 0;
  private tackleCooldown = 0;
  private tackleDir: Vec = { x: 1, y: 0 };
  /** Accumulated body-contact time on the carrier (auto jostle steal). */
  private jostle = 0;
  /** Grace window right after a kick: the ball is "in flight" and NOBODY can
   *  claim it, so a just-struck shot/pass clears the cluster instead of being
   *  instantly received by an opponent standing point-blank at the kicker. */
  private ballFree = 0;
  /** Manual keeper-rush window (home GK), set by pressing W without the ball —
   *  the keeper charges off his line to claim/smother the ball (FIFA's "rush
   *  keeper out"). Decays each frame; cleared the instant he gathers it. */
  private gkRush = 0;

  private homeScore = 0;
  private awayScore = 0;
  /** Real seconds of play elapsed; drives the accelerated match clock. */
  private elapsed = 0;
  private message = '';
  private messageTimer = 0;
  private freeze = 0;
  /** Goal celebration: holds play while the ball sits in the net and the
   *  scoring side celebrates, before the restart. */
  private celebration = 0;
  private celebrateTeam: Team | null = null;
  /** Which side kicks off once the celebration ends. */
  private pendingKickoff: Team | null = null;
  /** The player who scored (last kicker of the scoring team), runs off ahead. */
  private scorer: PlayerEntity | null = null;
  /** Per-side net ripple intensity (0..1), decays after a ball hits the net. */
  private netRipple = { left: 0, right: 0 };
  /** Attackers who were in an offside position at the instant of the last
   *  pass. If one of them is the next teammate to touch the ball, the flag is
   *  raised (FIFA: offside is only penalised when the player gets involved). */
  private offsideFlags = new Set<PlayerEntity>();
  /** TV camera x (field coordinates), follows the ball with smoothing. */
  private camX = FIELD_W / 2;
  /** TV camera depth (field coordinates), follows the ball vertically. */
  private camY = FIELD_H / 2;

  private listener: StateListener;

  /** Selected nations driving the match (lineups, names, numbers, kits). */
  readonly homeTeam: TeamData;
  readonly awayTeam: TeamData;

  constructor(
    canvas: HTMLCanvasElement,
    listener: StateListener,
    homeTeam: TeamData,
    awayTeam: TeamData,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
    this.listener = listener;
    this.homeTeam = homeTeam;
    this.awayTeam = awayTeam;

    this.homePlayers = homeTeam.players.map((p, i) =>
      this.makePlayer('home', p.pos, i),
    );
    this.awayPlayers = awayTeam.players.map((p, i) =>
      this.makePlayer('away', { x: 1 - p.pos.x, y: p.pos.y }, i),
    );
    this.controlled = this.homePlayers[homeTeam.kickoffFwd];

    this.resetKickoff('home');
  }

  private makePlayer(team: Team, frac: Vec, i: number): PlayerEntity {
    const squad = (team === 'home' ? this.homeTeam : this.awayTeam).players[i];
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
      num: squad.num,
      name: squad.name,
    };
  }

  private kitFor(p: PlayerEntity): Kit {
    const t = p.team === 'home' ? this.homeTeam : this.awayTeam;
    return p.isGK ? t.gkKit : t.kit;
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
    if (KICK_KEYS.has(e.code)) this.justReleased.push(e.code);
    this.keys.delete(e.code);
  };

  // ---- helpers ------------------------------------------------------------

  private resetKickoff(kickingTeam: Team) {
    this.ball.x = FIELD_W / 2;
    this.ball.y = FIELD_H / 2;
    this.ball.z = 0;
    this.ball.vx = 0;
    this.ball.vy = 0;
    this.ball.vz = 0;

    for (const p of [...this.homePlayers, ...this.awayPlayers]) {
      p.x = p.anchor.x;
      p.y = p.anchor.y;
      p.vx = p.vy = 0;
      p.kickTimer = 0;
      p.celebrating = false;
      p.facing = { x: p.team === 'home' ? 1 : -1, y: 0 };
    }

    // Put the kicking team's forward on the ball.
    const fwd =
      kickingTeam === 'home'
        ? this.homePlayers[this.homeTeam.kickoffFwd]
        : this.awayPlayers[this.awayTeam.kickoffFwd];
    fwd.x = FIELD_W / 2 + (kickingTeam === 'home' ? -34 : 34);
    fwd.y = FIELD_H / 2;

    if (kickingTeam === 'home')
      this.controlled = this.homePlayers[this.homeTeam.kickoffFwd];

    this.camX = FIELD_W / 2;
    this.camY = FIELD_H / 2;

    this.owner = null;
    this.lastKicker = null;
    this.kickerLock = 0;
    this.passReceiver = null;
    this.gkRush = 0;
    this.stealProtect = 0;
    this.dispossessed = null;
    this.dispossessedTimer = 0;
    this.markAssign.clear();
    this.markTimer = 0;
    this.chargeKey = null;
    this.chargeTime = 0;
    this.bufferTimer = 0;
    this.kickPending = false;
    this.ballFree = 0;
    this.offsideFlags.clear();
    this.tackleTimer = 0;
    this.tackleCooldown = 0;
    this.jostle = 0;
    this.freeze = 0.9;
    this.celebration = 0;
    this.celebrateTeam = null;
    this.pendingKickoff = null;
    this.scorer = null;
  }

  private setMessage(msg: string, secs: number) {
    this.message = msg;
    this.messageTimer = secs;
  }

  private emit() {
    this.listener({
      homeScore: this.homeScore,
      awayScore: this.awayScore,
      clock: Math.min(
        MATCH_DISPLAY_SECS,
        Math.floor((this.elapsed / MATCH_REAL_SECS) * MATCH_DISPLAY_SECS),
      ),
      message: this.message,
      possession: this.owner ? this.owner.team : 'none',
      homePlayer: this.controlled
        ? { num: this.controlled.num, name: this.controlled.name }
        : null,
      awayPlayer: this.awayActive
        ? { num: this.awayActive.num, name: this.awayActive.name }
        : null,
      charge: this.chargeLevel(),
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
    if (this.ballFree > 0) this.ballFree -= dt;
    if (this.gkRush > 0) this.gkRush -= dt;
    if (this.cpuDecision > 0) this.cpuDecision -= dt;
    if (this.stealProtect > 0) this.stealProtect -= dt;
    if (this.tackleCooldown > 0) this.tackleCooldown -= dt;
    if (this.dispossessedTimer > 0) {
      this.dispossessedTimer -= dt;
      if (this.dispossessedTimer <= 0) this.dispossessed = null;
    }
    for (const p of [...this.homePlayers, ...this.awayPlayers]) {
      if (p.kickTimer > 0) p.kickTimer -= dt;
    }
    if (this.netRipple.left > 0) this.netRipple.left = Math.max(0, this.netRipple.left - dt * 0.6);
    if (this.netRipple.right > 0) this.netRipple.right = Math.max(0, this.netRipple.right - dt * 0.6);

    // Goal celebration: hold play, let the ball sit in the net and the scorers
    // celebrate, then restart with the conceding side kicking off.
    if (this.celebration > 0) {
      this.celebration -= dt;
      this.updateCelebration(dt);
      this.updateCamera(dt);
      this.justPressed = [];
      this.justReleased = [];
      if (this.celebration <= 0 && this.pendingKickoff) {
        this.resetKickoff(this.pendingKickoff);
      }
      return;
    }

    if (this.freeze > 0) {
      this.freeze -= dt;
      this.justPressed = [];
      this.justReleased = [];
      return;
    }

    if (this.elapsed < MATCH_REAL_SECS) {
      this.elapsed += dt;
      if (this.elapsed >= MATCH_REAL_SECS) {
        this.elapsed = MATCH_REAL_SECS;
        const verdict =
          this.homeScore > this.awayScore
            ? `FULL TIME — ${this.homeTeam.name.toUpperCase()} WIN!`
            : this.homeScore < this.awayScore
              ? `FULL TIME — ${this.awayTeam.name.toUpperCase()} WIN!`
              : 'FULL TIME — DRAW';
        this.setMessage(verdict, 9999);
        this.freeze = 9999;
      }
    }

    this.markTimer -= dt;
    if (this.markTimer <= 0) {
      this.markTimer = 0.35;
      this.computeMarking();
      this.computeAttackSupport();
    }

    this.updateSwitchHint();
    this.handleSwitchKey();
    this.updateControlled(dt);
    this.updateHomeTeammates(dt);
    this.updateAwayTeam(dt);
    this.separatePlayers();
    this.updateJostle(dt);
    this.resolvePossession();
    this.updateBall(dt);
    this.handleGoals();
    this.updateCamera(dt);
    this.updateAwayActive();

    this.justPressed = [];
    this.justReleased = [];
  }

  /** The CPU player that should wear the away indicator: the carrier if the
   *  away team has the ball, otherwise the outfield CPU nearest the ball.
   *  Sticky to the carrier so the plate doesn't flicker between defenders. */
  private updateAwayActive() {
    if (this.owner && this.owner.team === 'away') {
      this.awayActive = this.owner;
      return;
    }
    const outfield = this.awayPlayers.filter((p) => !p.isGK);
    this.awayActive = this.nearestTo(outfield, this.ball) ?? this.awayActive;
  }

  /** Pan the TV camera toward the ball (with a little velocity lookahead). */
  private updateCamera(dt: number) {
    const target = clamp(this.ball.x + this.ball.vx * 0.25, CAM_MIN, CAM_MAX);
    const k = 1 - Math.exp(-2.6 * dt);
    this.camX += (target - this.camX) * k;

    // Vertical follow is gentler and clamped — a TV cam drifts in depth only
    // a little, keeping the action framed without swinging up and down.
    const targetY = clamp(this.ball.y + this.ball.vy * 0.18, CAM_Y_MIN, CAM_Y_MAX);
    const ky = 1 - Math.exp(-1.8 * dt);
    this.camY += (targetY - this.camY) * ky;
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
    // Q doubles as the LOB MODIFIER (Q+W = aerial through ball). When we have
    // the ball — or a pass key is held/charging — Q is being used to modify a
    // kick, so it must NOT switch players away from the carrier.
    const usingAsModifier =
      this.owner === this.controlled ||
      !!this.chargeKey ||
      [...KICK_KEYS].some((k) => this.keys.has(k));
    if (usingAsModifier) return;
    const target =
      this.switchHint ?? this.bestSwitchCandidate(this.controlled);
    if (target) {
      this.controlled = target;
      this.switchHint = null;
    }
  }

  private updateControlled(dt: number) {
    const p = this.controlled;
    const owns = this.owner === p;
    const carrier =
      this.owner && this.owner.team === 'away' ? this.owner : null;
    // The ball is loose and travelling from our own kick (a pass/shot in
    // flight) — i.e. it's "incoming" to our team. In this state a kick key
    // is buffered as a first-time shot/pass, NOT a tackle.
    const incoming =
      !owns && this.owner === null && this.lastKicker?.team === 'home';

    // W without the ball = "rush keeper out" (FIFA): send your goalkeeper
    // charging off his line to claim/smother the ball. Only meaningful when
    // we're defending (not while our own pass is incoming, where W is a
    // buffered first-time through-ball).
    if (!owns && !incoming) {
      // A tap commits the keeper to a charge; HOLDING W keeps him out (FIFA's
      // hold-to-rush) so he doesn't back-pedal to his line mid-charge.
      if (this.justPressed.includes('KeyW')) this.gkRush = 1.5;
      else if (this.keys.has('KeyW')) this.gkRush = Math.max(this.gkRush, 0.25);
    }

    // D without the ball = standing tackle (FIFA: a committed lunge at
    // the ball — winning it cleanly if it's in reach, leaving you beaten
    // for a moment if you whiff). Suppressed while our own pass is incoming.
    if (
      !owns &&
      !incoming &&
      this.tackleCooldown <= 0 &&
      this.justPressed.includes('KeyD')
    ) {
      const bx = this.ball.x + this.ball.vx * 0.1 - p.x;
      const by = this.ball.y + this.ball.vy * 0.1 - p.y;
      const l = len(bx, by);
      this.tackleDir = { x: bx / l, y: by / l };
      this.tackleTimer = 0.22;
      this.tackleCooldown = 0.8;
      p.kickTimer = Math.max(p.kickTimer, 0.22);
    }

    const containing = this.keys.has('KeyC') && !owns;

    if (this.tackleTimer > 0) {
      // Mid-lunge: burst toward the ball and poke it loose on contact.
      this.tackleTimer -= dt;
      this.steer(
        p,
        this.tackleDir.x * TACKLE_LUNGE_SPEED,
        this.tackleDir.y * TACKLE_LUNGE_SPEED,
        dt,
      );
      this.pokeTackle(p, CONTROL_DIST + 18);
    } else if (containing && carrier) {
      // FIFA contain (hold C): auto-jockey goal-side of the carrier and
      // automatically poke the ball when it comes into reach.
      const gx = -carrier.x;
      const gy = FIELD_H / 2 - carrier.y;
      const gl = len(gx, gy);
      const spot = {
        x: carrier.x + (gx / gl) * 30,
        y: carrier.y + (gy / gl) * 30,
      };
      const speed = this.keys.has('KeyE')
        ? SPRINT_SPEED * 0.94
        : JOCKEY_SPEED;
      this.moveToward(p, spot, speed, dt);
      if (this.tackleCooldown <= 0 && this.pokeTackle(p, CONTROL_DIST + 8)) {
        this.tackleCooldown = 0.5;
      }
    } else if (containing) {
      // Contain with a loose ball — just hunt it down.
      const speed = this.keys.has('KeyE')
        ? SPRINT_SPEED * 0.94
        : JOCKEY_SPEED;
      this.moveToward(p, { x: this.ball.x, y: this.ball.y }, speed, dt);
    } else {
      let dx = 0;
      let dy = 0;
      if (this.keys.has('ArrowUp')) dy -= 1;
      if (this.keys.has('ArrowDown')) dy += 1;
      if (this.keys.has('ArrowLeft')) dx -= 1;
      if (this.keys.has('ArrowRight')) dx += 1;
      const hasInput = dx !== 0 || dy !== 0;

      // Build the user's intended heading (unit vector, or zero).
      let ix = 0;
      let iy = 0;
      if (hasInput) {
        const l = len(dx, dy);
        ix = dx / l;
        iy = dy / l;
      }

      const sprint = this.keys.has('KeyE');
      let speed = sprint ? SPRINT_SPEED : WALK_SPEED;
      let hx = ix;
      let hy = iy;

      // FIFA-style "ball gravity": while OUR pass is in flight to this exact
      // receiver, predict whether continuing the user's CURRENT run will
      // actually intercept the ball. If it will (they're already on a path to
      // meet it), leave their run alone. If it WON'T — e.g. they're holding a
      // direction that runs them away/ahead and the ball can't catch them —
      // override toward the meeting point so they don't miss it. With no arrow
      // held, the receiver fully takes over and collects the ball.
      if (incoming && p === this.passReceiver) {
        // The velocity the user's input WOULD give the player this frame.
        const ivx = ix * speed;
        const ivy = iy * speed;
        // Simulate the next ~1.3s to find the closest the player's CURRENT run
        // gets to the ball — accounting for the ball's exponential friction so
        // a runaway player who the (slowing) ball can never catch is correctly
        // flagged as "going to miss". Airborne passes decay far slower.
        const airborne = this.ball.z > 0.01 || this.ball.vz > 0.01;
        const k = airborne ? BALL_DECAY * 0.12 : BALL_DECAY;
        let bx = this.ball.x;
        let by = this.ball.y;
        let bvx = this.ball.vx;
        let bvy = this.ball.vy;
        let px = p.x;
        let py = p.y;
        const stepT = 0.05;
        const decayStep = Math.exp(-k * stepT);
        // Displacement over one step for the current velocity (∫v dt).
        const dispK = k > 1e-3 ? (1 - decayStep) / k : stepT;
        let minGap = Infinity;
        let meetX = bx;
        let meetY = by;
        for (let t = 0; t <= 1.3; t += stepT) {
          const g = len(bx - px, by - py);
          if (g < minGap) {
            minGap = g;
            meetX = bx;
            meetY = by;
          }
          bx += bvx * dispK;
          by += bvy * dispK;
          bvx *= decayStep;
          bvy *= decayStep;
          px += ivx * stepT;
          py += ivy * stepT;
        }

        // 0 while the current run clearly intercepts (gap within reach), 1 once
        // it would clearly miss (gap a stride or more outside reach).
        const reach = CONTROL_DIST + 6;
        const gravity = hasInput ? clamp((minGap - reach) / 45, 0, 1) : 1;

        if (gravity > 0) {
          const ax = meetX - p.x;
          const ay = meetY - p.y;
          const al = len(ax, ay);
          const ux = al > 1 ? ax / al : 0;
          const uy = al > 1 ? ay / al : 0;
          hx = ix * (1 - gravity) + ux * gravity;
          hy = iy * (1 - gravity) + uy * gravity;
          // Make sure they can actually get there: chase at a real running
          // pace when meaningfully pulled off their input.
          if (!sprint && gravity > 0.25) speed = RUN_SPEED;
        }
      }

      let tvx = 0;
      let tvy = 0;
      const hl = len(hx, hy);
      if (hl > 0.001) {
        tvx = (hx / hl) * speed;
        tvy = (hy / hl) * speed;
      }
      this.steer(p, tvx, tvy, dt);
    }

    // FIFA-style kick charging + input buffering. Pressing a kick key starts
    // the power gauge; releasing executes the kick. Crucially you may press it
    // WHILE the ball is still travelling to you (`incoming`) — the input is
    // buffered and fires the instant you receive the ball (a first-time
    // shot/pass), instead of being dropped.
    if (!this.chargeKey && (owns || incoming)) {
      for (const code of this.justPressed) {
        if (KICK_KEYS.has(code)) {
          this.chargeKey = code;
          this.chargeTime = 0;
          this.chargeLofted = this.keys.has('KeyQ');
          this.kickPending = false;
          this.bufferTimer = owns ? 0 : KICK_BUFFER;
          break;
        }
      }
    }

    if (this.chargeKey) {
      const released = this.justReleased.includes(this.chargeKey);
      if (owns) {
        // We have the ball: fire on release, or immediately if a buffered
        // first-time kick was already released during the transition.
        if (this.kickPending || released) {
          const t = clamp(this.chargeTime / CHARGE_FULL, 0, 1);
          const code = this.chargeKey;
          const lofted = this.chargeLofted || this.keys.has('KeyQ');
          this.chargeKey = null;
          this.kickPending = false;
          this.doHomeKick(code, t, lofted);
        } else {
          this.chargeTime = Math.min(this.chargeTime + dt, CHARGE_FULL);
        }
      } else if (this.owner && this.owner.team === 'away') {
        // An opponent intercepted before we received it — drop the buffer.
        this.chargeKey = null;
        this.kickPending = false;
      } else {
        // Ball still in transit: keep buffering within the window. Charge
        // while held; once released, mark pending so it fires on first touch.
        this.bufferTimer -= dt;
        if (this.bufferTimer <= 0) {
          this.chargeKey = null;
          this.kickPending = false;
        } else if (released) {
          this.kickPending = true;
        } else if (!this.kickPending) {
          this.chargeTime = Math.min(this.chargeTime + dt, CHARGE_FULL);
        }
      }
    }
  }

  /** 0..1 charge of the in-progress kick, or null (for the HUD gauge). */
  private chargeLevel(): number | null {
    if (!this.chargeKey) return null;
    return clamp(this.chargeTime / CHARGE_FULL, 0, 1);
  }

  // ---- kicking / passing --------------------------------------------------

  /** @param charge 0..1 power gauge from how long the key was held. */
  private doHomeKick(code: string, charge: number, lofted = false) {
    const kicker = this.controlled;

    if (code === 'KeyD') {
      this.shootAssisted(kicker, charge);
      return;
    }

    const isShort = code === 'KeyS';
    const isLong = code === 'KeyA';
    const isThrough = code === 'KeyW';
    if (!isShort && !isLong && !isThrough) return;
    this.passAssisted(kicker, { isShort, isLong, isThrough, lofted, charge });
  }

  /**
   * FIFA-style assisted shot. The ball always goes toward the goal you
   * attack; the vertical arrow input picks the *zone* of the frame
   * (up = top half, down = bottom half, neutral = anywhere), and within
   * that zone the engine picks the placement with the clearest shooting
   * lane — i.e. the spot furthest from any blocking player, like FIFA's
   * assisted finishing steering shots away from the keeper/defenders.
   */
  private shootAssisted(kicker: PlayerEntity, charge: number) {
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

    // Charge controls shot power across a clearly-felt range: even an
    // untapped shot has real pace (strong base), and a full bar is a blast
    // (~2.2x the base). Harder shots rise more — a full blast lifts toward
    // the top corners, while a placed side-foot stays low and grounded.
    const loft = M(0.6) + charge * M(7);
    // Shots scatter the most — a harder strike (more charge) is less precise,
    // so a power blast can flash just wide while a placed side-foot is tighter.
    const shotSpread = 0.05 + charge * 0.045;
    this.kickBallToward(
      { x: goalX, y: bestY },
      620 + 720 * charge,
      kicker,
      loft,
      shotSpread,
    );
  }

  private passAssisted(
    kicker: PlayerEntity,
    opts: {
      isShort: boolean;
      isLong: boolean;
      isThrough: boolean;
      lofted?: boolean;
      charge: number;
    },
  ) {
    const { isShort, isLong, isThrough, charge } = opts;
    const lofted = !!opts.lofted;

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

    // Control follows your pass (FIFA-style), and the receiver gets "ball
    // gravity" until they actually take possession (see updateControlled).
    this.passReceiver = target;

    let aim: Vec;
    if (isThrough) {
      // Lead the receiver along their actual RUN (FIFA through ball):
      // play the ball into the space they're heading to, defaulting to
      // straight at the opponent goal when they're standing still.
      const atkX = kicker.team === 'home' ? 1 : -1;
      const sp = Math.hypot(target.vx, target.vy);
      // Direction to play the ball into: always lead toward goal, blended
      // with the receiver's actual run so a sprinter gets played in behind
      // along their line and a standing player gets pushed forward.
      let rx = atkX;
      let ry = 0;
      if (sp > 50) {
        rx = target.vx / sp + atkX * 0.6;
        ry = target.vy / sp;
        // Never lead a through ball backwards.
        if (rx * atkX < 0.1) rx = atkX * 0.55;
        const rl = len(rx, ry);
        rx /= rl;
        ry /= rl;
      }
      // Always carve out a clear gap in front of the receiver (FIFA through
      // ball): a fixed forward lead plus extra for how fast they're running,
      // so even a standing player has real space to chase onto.
      const lead = clamp(M(3) + sp * 0.4, M(3), M(7.5));
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

    if (isThrough && lofted) {
      // Q + W = a LOFTED through ball (FIFA): same lead-into-space aim as the
      // grounded through ball, but chipped through the air so it clears a
      // defender stepping into the lane and drops into the runner's path.
      // Lower, faster arc than a raking long ball so it still threads behind.
      const T = clamp(0.5 + d / M(95) + charge * 0.2, 0.5, 1.15);
      const vz = 0.5 * GRAVITY * T;
      const hspeed = Math.min((d / T) * 1.08, 1500);
      this.kickBallToward(aim, hspeed, kicker, vz, 0.05);
      this.controlled = target;
      return;
    }

    if (isLong) {
      // Long ball = a LOFTED, ballistic pass (FIFA): it flies over the
      // defenders and drops onto the receiver. Solve a projectile so the
      // hang time matches the horizontal travel (air friction is light, so
      // horizontal speed stays roughly constant in flight). A fuller charge
      // floats it higher and longer.
      const T = clamp(0.62 + d / M(70) + charge * 0.25, 0.6, 1.5);
      const vz = 0.5 * GRAVITY * T;
      const hspeed = Math.min((d / T) * 1.12, 1500);
      // A raking long ball is harder to land on a sixpence than a short pass.
      this.kickBallToward(aim, hspeed, kicker, vz, 0.045);
      this.controlled = target;
      return;
    }

    // Friction-aware power: arrive at the aim point still rolling at the
    // given speed (exponential friction covers (v0 - vEnd)/BALL_DECAY px),
    // instead of dying en route like the old distance multipliers did.
    const base = isThrough
      ? this.passPower(d, 240, 1050)
      : this.passPower(d, 260, 880);
    // FIFA assist: targeting is automatic, but the gauge still matters —
    // undercharged passes arrive soft/short, overcharged ones run past
    // the receiver. charge 0.4 ≈ the "right" weight.
    const scale = 0.78 + 0.55 * charge;
    const power = Math.min(base * scale, 1600);

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
   * target, with alignment dominating — but the PASSING LANE openness is
   * also scored so a teammate with a defender standing in the straight-line
   * lane is demoted in favour of an equally-aimed teammate in space (FIFA
   * assisted passing avoids threading the ball into a defender's feet).
   * Long passes are LOFTED over the defence, so ground blockers don't count
   * against them. No preferred-distance bands.
   */
  private pickPassTarget(
    kicker: PlayerEntity,
    opts: { short: boolean; long: boolean; through: boolean },
  ): PlayerEntity | null {
    const aim = this.heldDir(kicker);
    const mates = (
      kicker.team === 'home' ? this.homePlayers : this.awayPlayers
    ).filter((p) => p !== kicker && !(opts.through && p.isGK));
    const opps = kicker.team === 'home' ? this.awayPlayers : this.homePlayers;

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

      // Passing-lane openness (ground passes only — a lofted long ball flies
      // over). Endpoint mirrors the aim used in passAssisted: short = at the
      // receiver, through = led ahead into their run. An opponent sitting in
      // the lane heavily demotes this receiver so an open one wins instead.
      if (!opts.long) {
        const end = this.passLaneEnd(kicker, m, opts.through);
        let clearance = Infinity;
        for (const o of opps) {
          if (o.isGK) continue;
          // Ignore a defender right on the kicker's back — he sits at the
          // start of EVERY lane (so wouldn't change ranking) and is already
          // handled by the just-kicked grace. Only true lane blockers count.
          if (dist(o, kicker) < 34) continue;
          clearance = Math.min(
            clearance,
            distToSegment(o, kicker, end) - o.r,
          );
        }
        // A clear channel (>~26px either side) is fine; the tighter the lane,
        // the bigger the penalty, so a body in the lane (clearance≈0) is a
        // strong deterrent without being an absolute veto.
        const LANE_OK = 26;
        if (clearance < LANE_OK) {
          score -= (LANE_OK - Math.max(clearance, -10)) * 7;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        best = m;
      }
    }

    return best;
  }

  /** Estimated endpoint of a ground pass to `m`, matching passAssisted's aim
   *  (short = a touch ahead of the receiver, through = led into their run) —
   *  used to evaluate how open the passing lane is. */
  private passLaneEnd(
    kicker: PlayerEntity,
    m: PlayerEntity,
    through: boolean,
  ): Vec {
    if (!through) {
      return { x: m.x + m.vx * 0.2, y: m.y + m.vy * 0.2 };
    }
    const atkX = kicker.team === 'home' ? 1 : -1;
    const sp = Math.hypot(m.vx, m.vy);
    let rx = atkX;
    let ry = 0;
    if (sp > 50) {
      rx = m.vx / sp;
      ry = m.vy / sp;
      if (rx * atkX < 0.1) {
        rx = atkX * 0.55;
        const rl = len(rx, ry);
        rx /= rl;
        ry /= rl;
      }
    }
    const lead = clamp(sp * 0.45, 45, 110);
    return {
      x: clamp(m.x + rx * lead, 30, FIELD_W - 30),
      y: clamp(m.y + ry * lead, 20, FIELD_H - 20),
    };
  }

  /** Power needed to reach distance d and still roll at `arrival` speed. */
  private passPower(d: number, arrival: number, max: number) {
    return Math.min(BALL_DECAY * d + arrival, max);
  }

  private kickBallToward(
    aim: Vec,
    power: number,
    kicker: PlayerEntity,
    loft = 0,
    /** Angular error envelope in radians — how much this kick can stray from
     *  the perfect aim. Short passes are tight; shots/long balls scatter more
     *  (FIFA: not every strike is pixel-perfect). */
    spread = 0.03,
  ) {
    const dx = aim.x - this.ball.x;
    const dy = aim.y - this.ball.y;
    const l = len(dx, dy);
    const nx = dx / l;
    const ny = dy / l;
    // FIFA-like imperfection: deflect the aim by a small random angle and
    // nudge the power, so no two kicks come out exactly the same. The noise is
    // triangular (peaked at 0) — most kicks are near-perfect, the odd one
    // sprays wide or runs heavy.
    const ang = spread * this.kickNoise();
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    const rx = nx * ca - ny * sa;
    const ry = nx * sa + ny * ca;
    const pw = power * (1 + 0.05 * this.kickNoise());
    this.ball.vx = rx * pw;
    this.ball.vy = ry * pw;
    // `loft` is the upward launch velocity (px/s). Pop the ball just off the
    // turf so it leaves the ground cleanly on a lofted kick.
    this.ball.vz = loft;
    if (loft > 0) this.ball.z = Math.max(this.ball.z, 0.5);
    this.afterKick(kicker);
  }

  /** Triangular random in [-1, 1], peaked at 0: the difference of two uniforms.
   *  Small deviations are common, large ones rare — natural kick scatter. */
  private kickNoise(): number {
    return Math.random() - Math.random();
  }

  private afterKick(kicker: PlayerEntity) {
    this.owner = null;
    this.lastKicker = kicker;
    this.kickerLock = 0.45;
    kicker.kickTimer = 0.28;
    // The struck ball is briefly untouchable so it physically leaves the
    // kicker's body cluster before anyone (esp. an opponent leaning on the
    // kicker's back) can claim it — otherwise the kick is "canceled" the same
    // frame it's launched. ~0.12s ≈ 100-150px of travel at pass/shot speed,
    // enough to clear bodies while a defender genuinely down the lane can
    // still intercept.
    this.ballFree = 0.12;
    this.jostle = 0;
    this.snapshotOffside(kicker);
  }

  /**
   * Record which of the kicker's teammates are in an offside position at the
   * moment the ball is played. A player is offside if, AT THIS INSTANT, they
   * are (a) in the opponent's half, (b) ahead of the ball, and (c) ahead of
   * the second-last defender (the offside line — usually the last outfield
   * man, since the keeper is the last). The flag is only acted on later, if
   * that player is the one who receives the ball (see resolvePossession).
   */
  private snapshotOffside(kicker: PlayerEntity) {
    this.offsideFlags.clear();
    const team = kicker.team;
    const mates = team === 'home' ? this.homePlayers : this.awayPlayers;
    const opps = team === 'home' ? this.awayPlayers : this.homePlayers;
    // Project positions onto the attacking axis so "more forward" is always a
    // larger number (home attacks +x, away attacks -x).
    const atk = team === 'home' ? 1 : -1;
    const fwd = (x: number) => x * atk;

    // Offside line = the second-deepest defender along the attack axis.
    const oppFwd = opps.map((o) => fwd(o.x)).sort((a, b) => b - a);
    const line = oppFwd.length >= 2 ? oppFwd[1] : (oppFwd[0] ?? Infinity);
    const ballFwd = fwd(this.ball.x);
    const halfFwd = fwd(FIELD_W / 2);
    // A player level with the defender / ball is onside — small tolerance.
    const TOL = 6;

    for (const m of mates) {
      if (m === kicker || m.isGK) continue;
      const mf = fwd(m.x);
      if (mf > line + TOL && mf > ballFwd + TOL && mf > halfFwd) {
        this.offsideFlags.add(m);
      }
    }
  }

  /** Blow up an offside: stop play, reposition BOTH teams for the restart, and
   *  award an indirect free kick to the defending team at the offside spot
   *  (FIFA: the whistle goes, everyone resets, the other team gets the ball). */
  private callOffside(offsider: PlayerEntity) {
    const atkTeam = offsider.team;
    const defTeam: Team = atkTeam === 'home' ? 'away' : 'home';
    const defs = defTeam === 'home' ? this.homePlayers : this.awayPlayers;
    const defAtk = defTeam === 'home' ? 1 : -1;

    // Free kick spot: where the offside player was when the ball reached him.
    const spotX = clamp(offsider.x, 40, FIELD_W - 40);
    const spotY = clamp(offsider.y, 28, FIELD_H - 28);

    // Stop the ball dead at the spot.
    this.ball.x = spotX;
    this.ball.y = spotY;
    this.ball.z = 0;
    this.ball.vx = this.ball.vy = this.ball.vz = 0;

    // Reposition for the restart like a real free kick: everyone KEEPS their
    // current spot (play just stopped where it was) — we only clear momentum
    // and turn them upfield. The one exception is the OFFENDING attacking
    // team: any of their players standing ahead of the ball is pulled BACK
    // onside (to the own-half side of the spot) so they're clearly behind the
    // restart and out of the kicker's way. The defending team holds its shape.
    const atkDir = atkTeam === 'home' ? 1 : -1; // attackers' attacking axis
    for (const p of [...this.homePlayers, ...this.awayPlayers]) {
      if (p.team === atkTeam && !p.isGK) {
        // Distance the player is AHEAD of the ball along the attack axis.
        const ahead = (p.x - spotX) * atkDir;
        if (ahead > -20) {
          // Drop them back behind the ball, keeping their vertical lane.
          p.x = clamp(spotX - atkDir * (28 + ahead), p.r, FIELD_W - p.r);
        }
      }
      p.vx = p.vy = 0;
      p.kickTimer = 0;
      p.facing = { x: p.team === 'home' ? 1 : -1, y: 0 };
    }

    // Nearest outfield defender takes the kick; drop him onto the ball facing
    // upfield so he can play out.
    const taker =
      this.nearestTo(
        defs.filter((p) => !p.isGK),
        { x: spotX, y: spotY },
      ) ?? defs[1];
    taker.x = clamp(spotX - defAtk * 16, taker.r, FIELD_W - taker.r);
    taker.y = spotY;
    taker.vx = taker.vy = 0;
    taker.facing = { x: defAtk, y: 0 };

    this.owner = taker;
    this.controlled =
      defTeam === 'home' ? taker : this.homePlayers[this.homeTeam.kickoffFwd];

    // Pan the camera to the restart and hold play for a beat.
    this.camX = clamp(spotX, CAM_MIN, CAM_MAX);
    this.camY = clamp(spotY, CAM_Y_MIN, CAM_Y_MAX);
    this.setMessage('OFFSIDE', 1.6);
    this.freeze = 1.1;

    // Clear all transient ball/possession state so play restarts cleanly.
    this.offsideFlags.clear();
    this.lastKicker = null;
    this.kickerLock = 0;
    this.stealProtect = 1.2;
    this.dispossessed = null;
    this.dispossessedTimer = 0;
    this.markAssign.clear();
    this.markTimer = 0;
    this.ballFree = 0;
    this.jostle = 0;
    this.tackleTimer = 0;
    this.tackleCooldown = 0;
    this.chargeKey = null;
    this.chargeTime = 0;
    this.bufferTimer = 0;
    this.kickPending = false;
  }

  // ---- teammates AI (home, non-controlled) --------------------------------

  /**
   * Active keeper positioning (FIFA-style sweeper-keeper). Instead of parking
   * on the line, the keeper plays the ANGLE: he sits on the segment from his
   * goal centre to the ball, coming further off his line — and shifting
   * laterally to cover the near post — the closer the ball gets. When the ball
   * is loose or an opponent is bearing down in/near the box with no defender
   * challenging (a 1v1), he RUSHES out at speed to smother it. `this.gkRush`
   * (set by the W key for the home side) forces an aggressive charge too.
   */
  private keeperPlan(p: PlayerEntity): { pos: Vec; speed: number } {
    const mid = FIELD_H / 2;
    const ownGoalX = p.team === 'home' ? 0 : FIELD_W;
    const sign = p.team === 'home' ? 1 : -1; // +1 = "out" toward the field
    const bx = this.ball.x;
    const by = this.ball.y;
    // How deep the ball is toward this keeper's goal, along the goal-to-goal
    // axis (0 = on the goal line, larger = further upfield).
    const ballDX = Math.abs(bx - ownGoalX);

    // ---- Danger / rush detection ----
    const carrier =
      this.owner && this.owner.team !== p.team ? this.owner : null;
    const mates = (p.team === 'home' ? this.homePlayers : this.awayPlayers)
      .filter((m) => !m.isGK);
    // Is a teammate already right on the ball (challenging)? If so, no need to
    // abandon the goal — only rush when it's genuinely the keeper's to claim.
    const defenderOnBall = mates.some((m) => dist(m, this.ball) < 64);
    // Is a defender COVERING — positioned goal-side, between the keeper and the
    // ball, and roughly in the lane? If so the situation is already handled, so
    // the keeper should hold his line rather than charging out past his own man
    // and vacating the goal. (Goal-side = nearer our goal line than the ball;
    // "in the lane" = laterally close to the keeper→ball line.)
    const kbx = bx - p.x;
    const kby = by - p.y;
    const kbLen = Math.max(1, len(kbx, kby));
    const defenderCovering = mates.some((m) => {
      const goalSide = Math.abs(m.x - ownGoalX) < ballDX - 8; // nearer our goal
      if (!goalSide) return false;
      // Perpendicular distance from the defender to the keeper→ball segment.
      const t = clamp(((m.x - p.x) * kbx + (m.y - p.y) * kby) / (kbLen * kbLen), 0, 1);
      const px = p.x + kbx * t;
      const py = p.y + kby * t;
      return len(m.x - px, m.y - py) < 70;
    });
    const manualRush = p.team === 'home' && this.gkRush > 0;
    const ballInBoxX = ballDX < M(18); // ~ edge of the penalty area (depth)
    // Only commit to a rush when the ball is also CENTRAL — within the penalty
    // area's width. A ball out on the flank is near the goal LINE but no direct
    // threat, so the keeper must hold his net and play the near post instead of
    // charging sideways and leaving the goal gaping.
    const ballCentral = Math.abs(by - mid) < M(18);
    const looseClose = !this.owner && ballInBoxX && ballCentral;
    // An opponent CARRIER only triggers a rush once he's genuinely CLOSE —
    // inside the box near the penalty spot — and central. Rushing earlier (when
    // he's still way out) just left the keeper parked at the box edge, and then
    // back-pedalling toward goal as the attacker finally arrived (the "rushed
    // early then retreated" bug). Held until ~M13 he plays the angle instead,
    // then comes straight OUT to smother — keeper and attacker converging, so
    // he never moves backwards while the attacker advances.
    const carrierClose =
      !!carrier &&
      Math.abs(carrier.x - ownGoalX) < M(13) &&
      Math.abs(carrier.y - mid) < M(20);
    // Auto-rush only when it's genuinely the keeper's to claim: no teammate is
    // already on the ball AND none is covering goal-side in the lane. (A manual
    // W rush ignores this — the player explicitly commanded the charge.)
    const autoRush =
      (looseClose || carrierClose) && !defenderOnBall && !defenderCovering;
    const boxEdge = ownGoalX + sign * M(16); // don't sweep past the box

    if (manualRush || autoRush) {
      // Charge the ball to smother / claim it, anticipating its motion a touch.
      const lead = manualRush ? 0.16 : 0.12;
      const aimX = bx + this.ball.vx * lead;
      const aimY = by + this.ball.vy * lead;
      // A MANUAL W rush is an explicit "rush keeper out" command — let him chase
      // the real ball well beyond the box, across the full width of the pitch,
      // so he actually runs AT the ball instead of sliding to the box edge. The
      // AUTO sweeper rush stays inside the box (no keeper at the halfway line).
      const outLimit = manualRush ? M(40) : M(16);
      const reachEdge = ownGoalX + sign * outLimit;
      const tx =
        sign > 0
          ? clamp(aimX, ownGoalX + 12, reachEdge)
          : clamp(aimX, reachEdge, ownGoalX - 12);
      const ty = manualRush
        ? clamp(aimY, 20, FIELD_H - 20)
        : clamp(aimY, mid - M(14), mid + M(14));
      return { pos: { x: tx, y: ty }, speed: SPRINT_SPEED };
    }

    // ---- Angle play (no rush) ----
    // Come off the line more as the ball nears: ~14px when it's a long way
    // out, up to ~150px on the edge of the box.
    const comeOut = clamp(220 - ballDX * 0.26, 14, 150);
    const gx = bx - ownGoalX;
    const gy = by - mid;
    const gl = Math.max(120, len(gx, gy));
    // Fraction along the goal→ball line; bounded so lateral tracking grows as
    // the ball gets close (small/central when it's far away).
    const f = clamp(comeOut / gl, 0, 0.5);
    const tx =
      sign > 0
        ? clamp(ownGoalX + gx * f, ownGoalX + 14, boxEdge)
        : clamp(ownGoalX + gx * f, boxEdge, ownGoalX - 14);
    const ty = clamp(mid + gy * f, goalTop + 14, goalBottom - 14);
    // Hustle back into position when badly out of it, else glide.
    const here = { x: tx, y: ty };
    const speed = dist(p, here) > 90 ? RUN_SPEED : WALK_SPEED;
    return { pos: here, speed };
  }

  // ---- off-ball intelligence (FIFA-style, both teams) ----------------------

  private markAssign = new Map<PlayerEntity, PlayerEntity>();
  private markTimer = 0;

  /**
   * Attacking off-ball role for each non-carrier teammate of the team in
   * possession. FIFA gives the carrier VARIED options instead of everyone
   * sprinting at goal: a couple penetrate in behind (`run`), a couple check
   * back toward the ball as a safe outlet (`short`), wide players stretch the
   * defence on the touchline (`width`), and the rest hold shape to recycle
   * possession and screen the counter (`hold`). Recomputed with the marking.
   */
  private attackRole = new Map<
    PlayerEntity,
    'run' | 'short' | 'width' | 'hold'
  >();

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
   * Hand out attacking off-ball roles to the team in possession so the carrier
   * always has a MIX of options (FIFA "player support"), instead of every
   * teammate making the same run at goal. Greedy + position-based so it's
   * stable across the 0.35s recompute. See `attackRole` for the role meanings.
   */
  private computeAttackSupport() {
    this.attackRole.clear();
    const owner = this.owner;
    if (!owner) return;
    const dir = owner.team === 'home' ? 1 : -1;
    const ownGoalX = owner.team === 'home' ? 0 : FIELD_W;
    /** Distance up the pitch (attacking direction) from own goal. */
    const depth = (x: number) => (x - ownGoalX) * dir;
    const ballD = depth(owner.x);
    const team = owner.team === 'home' ? this.homePlayers : this.awayPlayers;
    const mates = team.filter((p) => p !== owner && !p.isGK);

    // RUNNERS: the up-to-2 most advanced non-defenders that are level with or
    // ahead of the carrier make penetrating runs in behind.
    const runners = mates
      .filter((p) => p.role !== 'DF' && depth(p.x) > ballD - 120)
      .sort((a, b) => depth(b.x) - depth(a.x))
      .slice(0, 2);
    for (const p of runners) this.attackRole.set(p, 'run');

    // WIDTH: remaining non-defenders whose formation lane hugs a touchline
    // stay wide to stretch the defence.
    for (const p of mates) {
      if (this.attackRole.has(p) || p.role === 'DF') continue;
      if (Math.abs(p.anchor.y - FIELD_H / 2) > FIELD_H * 0.2) {
        this.attackRole.set(p, 'width');
      }
    }

    // SHORT: the up-to-2 nearest remaining mates behind/level with the carrier
    // check back toward the ball as a safe passing outlet.
    const shortMen = mates
      .filter((p) => !this.attackRole.has(p) && depth(p.x) <= ballD + 60)
      .sort((a, b) => dist(a, owner) - dist(b, owner))
      .slice(0, 2);
    for (const p of shortMen) this.attackRole.set(p, 'short');

    // Everyone else holds shape (recycle / cover the counter).
    for (const p of mates) {
      if (!this.attackRole.has(p)) this.attackRole.set(p, 'hold');
    }
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
    if (p.isGK) return this.keeperPlan(p);
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

    // ATTACK — role-based support (computeAttackSupport) so the team offers a
    // MIX of options instead of everyone sprinting at goal. `t` already holds
    // the zonal line target, which is what `hold` players use.
    if (phase === 'attack' && owner) {
      let speed = baseSpeed;
      const role = this.attackRole.get(p) ?? 'hold';
      // Which touchline this player's formation lane favours.
      const laneSide = p.anchor.y < FIELD_H / 2 ? -1 : 1;

      if (role === 'run') {
        // Penetrate in behind, ahead of the carrier, staggered into this
        // player's lane so two runners don't converge on the same spot.
        t.x = clamp(owner.x + dir * 300, 200, FIELD_W - 120);
        t.y = clamp(
          FIELD_H / 2 +
            laneSide * FIELD_H * 0.22 +
            (this.ball.y - FIELD_H / 2) * 0.2,
          70,
          FIELD_H - 70,
        );
        speed = RUN_SPEED;
      } else if (role === 'short') {
        // Check back toward the ball — slightly behind the carrier and off to
        // one side — to give a safe, supporting pass option.
        t.x = clamp(owner.x - dir * 150, 120, FIELD_W - 120);
        t.y = clamp(owner.y + laneSide * 150, 70, FIELD_H - 70);
        speed = Math.max(baseSpeed, RUN_SPEED * 0.8);
      } else if (role === 'width') {
        // Hold the touchline a touch ahead of the ball to stretch the block.
        t.x = fromDepth(clamp(ballD + 90, W * 0.25, W - 200));
        t.y = clamp(FIELD_H / 2 + laneSide * FIELD_H * 0.4, 80, FIELD_H - 80);
        speed = Math.max(baseSpeed, RUN_SPEED * 0.7);
      }
      // `hold`: keep the zonal `t` (defenders + deep mids stay back to recycle
      // and screen the counter).

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
    // The keeper isn't a generic chaser — his own keeperPlan decides when to
    // hold the line vs. rush out (and keeps him inside the box).
    const outfield = this.awayPlayers.filter((p) => !p.isGK);
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

  /**
   * Realism gate shared by every steal path: a tackle only connects when the
   * defender can actually reach the ball — i.e. he's on the BALL side of the
   * carrier (not shielded out behind him) AND roughly facing the ball. A
   * defender at the carrier's back, facing the other way, can't win it (he'd
   * have to foul). The carrier dribbles the ball ahead of his facing, so we
   * compare the defender's position to where the ball actually is.
   */
  private canTackle(tackler: PlayerEntity, carrier: PlayerEntity): boolean {
    // Shielding: is the defender on the same side as the ball, relative to
    // the carrier's body? If the carrier is between the defender and the
    // ball, the ball is screened and can't be taken cleanly.
    const ballSideX = this.ball.x - carrier.x;
    const ballSideY = this.ball.y - carrier.y;
    const tackSideX = tackler.x - carrier.x;
    const tackSideY = tackler.y - carrier.y;
    const sideDot = ballSideX * tackSideX + ballSideY * tackSideY;
    if (sideDot < 0) return false; // behind the carrier → shielded out

    // Engagement: the defender must be facing toward the ball (within ~80°),
    // not turned the other way.
    const toBallX = this.ball.x - tackler.x;
    const toBallY = this.ball.y - tackler.y;
    const tb = len(toBallX, toBallY);
    const faceDot =
      (tackler.facing.x * toBallX + tackler.facing.y * toBallY) / tb;
    return faceDot > 0.15;
  }

  /**
   * Poke the ball off an opposing carrier if it's within reach. The ball is
   * knocked to the tackler's far side (away from the carrier), and normal
   * possession resolution then awards it — triggering the tackle-won
   * protection / dispossession lockout. Returns true if the poke connected.
   */
  private pokeTackle(tackler: PlayerEntity, reach: number): boolean {
    const carrier = this.owner;
    if (!carrier || carrier.team === tackler.team || carrier.isGK)
      return false;
    if (this.stealProtect > 0 || this.dispossessed === tackler) return false;
    if (dist(tackler, this.ball) > reach) return false;
    if (!this.canTackle(tackler, carrier)) return false;

    const dx = tackler.x - carrier.x;
    const dy = tackler.y - carrier.y;
    const l = len(dx, dy);
    this.ball.x = tackler.x + (dx / l) * 6;
    this.ball.y = tackler.y + (dy / l) * 6;
    this.ball.vx = tackler.vx;
    this.ball.vy = tackler.vy;
    tackler.kickTimer = Math.max(tackler.kickTimer, 0.18);
    this.jostle = 0;
    return true;
  }

  /**
   * FIFA-style physical jostling: sustained body contact with the carrier
   * wins the ball automatically — no button needed. Running straight into
   * the man on the ball and staying touch-tight dislodges it after a beat.
   * Symmetric: CPU defenders muscle you off the ball the same way.
   */
  private updateJostle(dt: number) {
    const o = this.owner;
    if (!o || o.isGK) {
      this.jostle = 0;
      return;
    }
    const opps = o.team === 'home' ? this.awayPlayers : this.homePlayers;
    let challenger: PlayerEntity | null = null;
    let bestD = Infinity;
    for (const q of opps) {
      if (q.isGK || q === this.dispossessed) continue;
      const d = dist(q, o);
      // Only count a body-contact challenge that is actually goal/ball-side
      // and engaged — a defender shielded out at the carrier's back can lean
      // on him forever without ever winning it.
      if (d < o.r + q.r + 9 && d < bestD && this.canTackle(q, o)) {
        bestD = d;
        challenger = q;
      }
    }
    if (!challenger || this.stealProtect > 0) {
      this.jostle = Math.max(0, this.jostle - dt * 2.5);
      return;
    }
    this.jostle += dt;
    if (this.jostle < 0.5) return;
    // Contact sustained long enough — the challenger muscles the ball away.
    this.pokeTackle(challenger, Infinity);
  }

  private resolvePossession() {
    const prev = this.owner;

    // A ball above chest height flies over everyone — nobody can trap it
    // until it drops back down (FIFA: lofted balls sail past players).
    if (this.ball.z > CONTROL_HEIGHT) {
      this.owner = null;
      return;
    }

    // Just-kicked grace: the ball is in flight and untouchable for a beat so
    // it clears the kicker's body cluster (prevents an opponent at the
    // kicker's back from instantly "receiving" the struck ball).
    if (this.ballFree > 0) {
      this.owner = null;
      return;
    }

    const ballSpeed = Math.hypot(this.ball.vx, this.ball.vy);
    let best: PlayerEntity | null = null;
    let bestD = Infinity;
    for (const p of [...this.homePlayers, ...this.awayPlayers]) {
      if (this.kickerLock > 0 && p === this.lastKicker) continue;
      // A freshly dispossessed player can't win the ball straight back.
      if (this.dispossessed === p) continue;
      // Keepers have HANDS: a bigger gather radius so a slow ball at their feet
      // is claimed (not left for an attacker to steal), and enough reach to
      // pull in / parry a shot they get across to.
      const reach = p.isGK
        ? CONTROL_DIST + (ballSpeed < 320 ? 34 : 18)
        : CONTROL_DIST;
      const d = dist(p, this.ball);
      if (d <= reach && d < bestD) {
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

    // Offside: if the first teammate to touch the played ball was flagged
    // offside at the moment of the pass, blow the whistle. Any other first
    // touch (a defender, or an onside teammate) resolves the phase and clears
    // the flags.
    if (best && best !== prev && this.offsideFlags.size > 0) {
      if (this.offsideFlags.has(best)) {
        this.callOffside(best);
        return;
      }
      this.offsideFlags.clear();
    }

    // Possession changed hands.
    if (best && best !== prev) {
      this.jostle = 0;
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
      // FIFA-style: when YOUR team gains possession, you control the man on the
      // ball — INCLUDING the keeper, so you can immediately clear/throw after a
      // save (previously the GK was excluded and you couldn't take over).
      if (best.team === 'home') {
        this.controlled = best;
      }
      if (best.isGK) {
        // A keeper CATCHES cleanly: secure the ball with a longer protection
        // window so a striker can't instantly poke the held ball back out and
        // tap in the rebound. The rush (if any) has done its job.
        this.stealProtect = Math.max(this.stealProtect, 1.1);
        this.gkRush = 0;
      }
      this.dribble(best);
      // Receiving a pass clears the kicker lock so play flows.
      this.lastKicker = null;
      this.kickerLock = 0;
      // The pass has been collected (or intercepted) — ball gravity ends.
      this.passReceiver = null;
    }
  }

  private dribble(owner: PlayerEntity) {
    // A keeper holds the ball in his HANDS at his chest — glued to his body,
    // dead still. This stops a saved shot from squirting out in front (toward
    // the onrushing striker) and being tapped back in.
    if (owner.isGK) {
      this.ball.x += (owner.x - this.ball.x) * 0.6;
      this.ball.y += (owner.y - this.ball.y) * 0.6;
      this.ball.z = 0;
      this.ball.vz = 0;
      this.ball.vx = owner.vx;
      this.ball.vy = owner.vy;
      return;
    }
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
    this.ball.z = 0;
    this.ball.vz = 0;
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

    // ---- Height (z) integration: gravity + ground bounce ----
    const airborne = this.ball.z > 0.01 || this.ball.vz > 0.01;
    if (airborne) {
      this.ball.vz -= GRAVITY * dt;
      this.ball.z += this.ball.vz * dt;
      if (this.ball.z <= 0) {
        // Landed: bounce with restitution; settle when the hop gets tiny.
        this.ball.z = 0;
        if (this.ball.vz < 0) this.ball.vz = -this.ball.vz * BOUNCE;
        if (this.ball.vz < GRAVITY * 0.03) this.ball.vz = 0;
        // A bounce scrubs a little pace off the roll.
        this.ball.vx *= 0.86;
        this.ball.vy *= 0.86;
      }
    }

    // Horizontal friction: almost none while flying, full rolling drag on
    // the grass. A lofted ball carries; a grounded ball decays as before.
    const decay = airborne
      ? Math.exp(-BALL_DECAY * 0.12 * dt)
      : Math.exp(-BALL_DECAY * dt);
    this.ball.vx *= decay;
    this.ball.vy *= decay;
    if (!airborne && Math.hypot(this.ball.vx, this.ball.vy) < 4) {
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
    if (this.celebration > 0) return;
    const inMouth = this.ball.y > goalTop && this.ball.y < goalBottom;
    if (!inMouth) return;
    // Over the bar — a ball higher than the crossbar (2.44 m) isn't a goal.
    if (this.ball.z > M(2.44)) return;

    if (this.ball.x <= 2) {
      this.awayScore += 1;
      this.startCelebration(
        'away',
        `${this.awayTeam.name.toUpperCase()} SCORE`,
        'home',
        'left',
      );
    } else if (this.ball.x >= FIELD_W - 2) {
      this.homeScore += 1;
      this.startCelebration('home', 'G O A L !', 'away', 'right');
    }
  }

  /** Kick off the goal-celebration sequence: settle the ball in the net,
   *  ripple the net, and send the scoring side off celebrating. */
  private startCelebration(
    scoringTeam: Team,
    msg: string,
    nextKickoff: Team,
    side: 'left' | 'right',
  ) {
    const CELEBRATION_SECS = 4;
    this.celebration = CELEBRATION_SECS;
    this.celebrateTeam = scoringTeam;
    this.pendingKickoff = nextKickoff;
    this.setMessage(msg, CELEBRATION_SECS);
    this.netRipple[side] = 1;

    // Nestle the ball into the back of the net so the strike clearly counts.
    this.ball.vx = this.ball.vy = this.ball.vz = 0;
    this.ball.z = 0;
    this.ball.x = side === 'left' ? -M(1.4) : FIELD_W + M(1.4);
    this.ball.y = clamp(this.ball.y, goalTop + 14, goalBottom - 14);

    // The scorer is the scoring side's last kicker; teammates mob them.
    this.scorer =
      this.lastKicker && this.lastKicker.team === scoringTeam
        ? this.lastKicker
        : null;
    const team = scoringTeam === 'home' ? this.homePlayers : this.awayPlayers;
    for (const p of team) if (!p.isGK) p.celebrating = true;
    this.owner = null;
  }

  /** Animate the celebrating players: the scorer wheels away toward the corner
   *  by the goal, arms aloft, and teammates chase to mob them. The conceding
   *  side doesn't freeze — they trudge back toward their own positions,
   *  dejected, while their keeper retrieves the ball from the net. */
  private updateCelebration(dt: number) {
    if (!this.celebrateTeam) return;
    const scoredRight = this.celebrateTeam === 'home';
    const cornerX = scoredRight ? FIELD_W - M(16) : M(16);
    const cornerY = FIELD_H * 0.82;

    for (const p of [...this.homePlayers, ...this.awayPlayers]) {
      if (p.celebrating) {
        // Scoring side: wheel away to the corner / mob the scorer.
        let tx = cornerX;
        let ty = cornerY;
        if (this.scorer && p !== this.scorer) {
          tx = this.scorer.x + (scoredRight ? -34 : 34);
          ty = this.scorer.y - 6;
        }
        this.moveToward(p, { x: tx, y: ty }, RUN_SPEED * 0.62, dt);
      } else {
        // Everyone else (the conceding team + the scoring keeper): walk back
        // toward their formation anchor at a slow, dejected pace instead of
        // standing frozen. The conceding keeper drifts toward the ball in the
        // net as if collecting it to restart quickly.
        const concededTeam =
          (p.team === 'home') !== scoredRight; // true if p just conceded
        let target = p.anchor;
        if (p.isGK && concededTeam) {
          target = { x: this.ball.x, y: this.ball.y };
        }
        this.moveToward(p, target, WALK_SPEED * 0.6, dt);
      }
    }
  }

  private clampToField(m: { x: number; y: number; r: number }) {
    m.x = Math.max(m.r, Math.min(FIELD_W - m.r, m.x));
    m.y = Math.max(m.r, Math.min(FIELD_H - m.r, m.y));
  }

  // ---- render (TV broadcast pseudo-3D) ------------------------------------

  private render() {
    renderScene(this.ctx, {
      camX: this.camX,
      camY: this.camY,
      ball: this.ball,
      players: [...this.awayPlayers, ...this.homePlayers].map((p) => ({
        p,
        kit: this.kitFor(p),
      })),
      controlled: this.controlled,
      switchHint: this.switchHint,
      netRipple: this.netRipple,
    });
  }
}
