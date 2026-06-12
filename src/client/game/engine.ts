// PitchKick — arcade football engine (4v4 vs CPU).
// Pure canvas + requestAnimationFrame. No React inside the hot loop.
// Players are procedurally drawn top-down humanoids (Sensible-Soccer style)
// with a run cycle and kick pose, rotating freely to their facing angle.

export const FIELD_W = 1050;
export const FIELD_H = 680;
export const MARGIN = 56;
export const CANVAS_W = FIELD_W + MARGIN * 2;
export const CANVAS_H = FIELD_H + MARGIN * 2;

const GOAL_HEIGHT = 200;
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
const CONTROL_DIST = PLAYER_R + BALL_R + 11;

/** How quickly velocity approaches the desired velocity (per second). */
const ACCEL = 8;
/** Max turn rate in radians per second. */
const TURN_RATE = 13;

type Vec = { x: number; y: number };
type Team = 'home' | 'away';

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

// Diamond formation as fractions of the field (home attacks right).
const FORMATION: Vec[] = [
  { x: 0.16, y: 0.5 }, // defender
  { x: 0.36, y: 0.26 }, // midfield top
  { x: 0.36, y: 0.74 }, // midfield bottom
  { x: 0.56, y: 0.5 }, // forward
];

const HAIR_COLORS = ['#2b2118', '#0e0c0a', '#5a3b1e', '#857058'];
const SKIN_TONES = ['#e0ac7e', '#c98c5e', '#8d5a3b', '#f0c49a'];

interface Kit {
  shirt: string;
  sleeve: string;
  outline: string;
}

const HOME_KIT: Kit = { shirt: '#2e9bff', sleeve: '#1268c4', outline: '#0c3e78' };
const AWAY_KIT: Kit = { shirt: '#ff4d4d', sleeve: '#c42626', outline: '#7a1414' };

function len(x: number, y: number) {
  return Math.hypot(x, y) || 1;
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
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

  private homeScore = 0;
  private awayScore = 0;
  private timeLeft = 120;
  private message = '';
  private messageTimer = 0;
  private freeze = 0;

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
    this.controlled = this.homePlayers[3]; // forward

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
      kickingTeam === 'home' ? this.homePlayers[3] : this.awayPlayers[3];
    fwd.x = FIELD_W / 2 + (kickingTeam === 'home' ? -34 : 34);
    fwd.y = FIELD_H / 2;

    if (kickingTeam === 'home') this.controlled = this.homePlayers[3];

    this.owner = null;
    this.lastKicker = null;
    this.kickerLock = 0;
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

    this.updateSwitchHint();
    this.handleSwitchKey();
    this.updateControlled(dt);
    this.updateHomeTeammates(dt);
    this.updateAwayTeam(dt);
    this.resolvePossession();
    this.updateBall(dt);
    this.handleGoals();

    this.justPressed = [];
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
    const candidate = this.nearestTo(this.homePlayers, this.ball, this.controlled);
    // Only suggest a switch when the candidate is meaningfully closer.
    if (
      candidate &&
      dist(candidate, this.ball) + 30 < dist(this.controlled, this.ball)
    ) {
      this.switchHint = candidate;
    } else {
      this.switchHint = null;
    }
  }

  private handleSwitchKey() {
    if (!this.justPressed.includes('KeyQ')) return;
    const target =
      this.switchHint ??
      this.nearestTo(this.homePlayers, this.ball, this.controlled);
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
      // Shot — aim at the CPU goal mouth.
      const ty = clamp(this.ball.y, goalTop + 24, goalBottom - 24);
      this.kickBallToward({ x: FIELD_W, y: ty }, 660, kicker);
      return;
    }

    const isShort = code === 'KeyS';
    const isLong = code === 'KeyA';
    const isThrough = code === 'KeyW';
    if (!isShort && !isLong && !isThrough) return;

    const target = this.pickPassTarget(kicker, { short: isShort, long: isLong });
    if (!target) {
      // No teammate available — knock it forward in the facing direction.
      const f = kicker.facing;
      this.ball.vx = f.x * 380;
      this.ball.vy = f.y * 380;
      this.afterKick(kicker);
      return;
    }

    let aim: Vec;
    if (isThrough) {
      // Lead the receiver into space toward the CPU goal.
      const lead = 110;
      aim = {
        x: clamp(target.x + lead, 30, FIELD_W - 20),
        y: clamp(target.y + target.vy * 0.25, 20, FIELD_H - 20),
      };
    } else {
      // Aim slightly ahead of where they're moving.
      aim = {
        x: clamp(target.x + target.vx * 0.2, 15, FIELD_W - 15),
        y: clamp(target.y + target.vy * 0.2, 15, FIELD_H - 15),
      };
    }

    const d = dist(this.ball, aim);
    const power = isLong
      ? clamp(d * 1.55, 430, 650)
      : isThrough
        ? clamp(d * 1.65, 390, 580)
        : clamp(d * 1.85, 300, 500);

    this.kickBallToward(aim, power, kicker);

    // Control follows your pass (FIFA-style). All other switching is Q-only.
    this.controlled = target;
  }

  /**
   * Pick the best teammate for a pass: favours players aligned with the
   * kicker's facing direction; short passes prefer close players, long
   * passes prefer distant ones.
   */
  private pickPassTarget(
    kicker: PlayerEntity,
    opts: { short: boolean; long: boolean },
  ): PlayerEntity | null {
    const mates = (
      kicker.team === 'home' ? this.homePlayers : this.awayPlayers
    ).filter((p) => p !== kicker);

    let best: PlayerEntity | null = null;
    let bestScore = -Infinity;

    for (const m of mates) {
      const dx = m.x - kicker.x;
      const dy = m.y - kicker.y;
      const d = len(dx, dy);
      const align = (dx / d) * kicker.facing.x + (dy / d) * kicker.facing.y;

      // Heavily penalise teammates behind the kick direction.
      let score = align * 100;

      if (opts.short) score -= Math.abs(d - 220) * 0.25;
      else if (opts.long) score += clamp(d, 0, 600) * 0.15;
      else score -= Math.abs(d - 320) * 0.15; // through

      if (score > bestScore) {
        bestScore = score;
        best = m;
      }
    }

    return best;
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

  private formationTarget(p: PlayerEntity): Vec {
    return {
      x: clamp(
        p.anchor.x + (this.ball.x - FIELD_W / 2) * 0.35,
        p.r,
        FIELD_W - p.r,
      ),
      y: clamp(
        p.anchor.y + (this.ball.y - FIELD_H / 2) * 0.25,
        p.r,
        FIELD_H - p.r,
      ),
    };
  }

  private updateHomeTeammates(dt: number) {
    for (const p of this.homePlayers) {
      if (p === this.controlled) continue;
      if (this.owner === p) {
        // A teammate has the ball but you haven't switched to them:
        // they shield it and wait for you (press Q to take over).
        this.steer(p, 0, 0, dt);
        this.faceToward(p, 1, 0, dt);
        continue;
      }
      this.moveToward(p, this.formationTarget(p), TEAMMATE_SPEED, dt);
    }
  }

  // ---- CPU team AI ---------------------------------------------------------

  private updateAwayTeam(dt: number) {
    const carrier =
      this.owner && this.owner.team === 'away' ? this.owner : null;
    const chaser =
      carrier ?? this.nearestTo(this.awayPlayers, this.ball) ?? this.awayPlayers[0];

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
        this.moveToward(p, this.formationTarget(p), AWAY_FORMATION_SPEED, dt);
      }
    }
  }

  private updateAwayCarrier(p: PlayerEntity, dt: number) {
    // Dribble toward the player's (left) goal.
    const t = { x: 36, y: FIELD_H / 2 + (p.y - FIELD_H / 2) * 0.35 };
    this.moveToward(p, t, AWAY_CARRY_SPEED, dt);

    if (this.cpuDecision > 0) return;
    this.cpuDecision = 0.5;

    const pressure = this.nearestOpponentDist(p);

    // Shoot when in range.
    if (p.x < 250) {
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
          clamp(d * 1.85, 300, 560),
          p,
        );
      }
    }
  }

  // ---- possession / ball ---------------------------------------------------

  private resolvePossession() {
    let best: PlayerEntity | null = null;
    let bestD = Infinity;
    for (const p of [...this.homePlayers, ...this.awayPlayers]) {
      if (this.kickerLock > 0 && p === this.lastKicker) continue;
      const d = dist(p, this.ball);
      if (d <= CONTROL_DIST && d < bestD) {
        bestD = d;
        best = p;
      }
    }

    this.owner = best;
    if (best) {
      this.dribble(best);
      // Receiving a pass clears the kicker lock so play flows.
      this.lastKicker = null;
      this.kickerLock = 0;
    }
  }

  private dribble(owner: PlayerEntity) {
    const ahead = owner.r + this.ball.r + 4;
    const targetX = owner.x + owner.facing.x * ahead;
    const targetY = owner.y + owner.facing.y * ahead;
    this.ball.x += (targetX - this.ball.x) * 0.3;
    this.ball.y += (targetY - this.ball.y) * 0.3;
    this.ball.vx = owner.vx;
    this.ball.vy = owner.vy;
  }

  private updateBall(dt: number) {
    if (this.owner) return; // dribble handles it

    this.ball.x += this.ball.vx * dt;
    this.ball.y += this.ball.vy * dt;

    const decay = Math.exp(-1.5 * dt);
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

  // ---- render -------------------------------------------------------------

  private render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.fillStyle = '#070b10';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.save();
    ctx.translate(MARGIN, MARGIN);

    this.drawPitch(ctx);
    this.drawGoals(ctx);

    // Ball shadow + ball.
    this.drawShadow(ctx, this.ball.x, this.ball.y, this.ball.r);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.ball.x, this.ball.y, this.ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Simple panel detail so the roll reads.
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(this.ball.x, this.ball.y, this.ball.r * 0.5, 0, Math.PI * 2);
    ctx.stroke();

    // Sort by y so lower players overlap upper ones naturally.
    const everyone = [...this.awayPlayers, ...this.homePlayers].sort(
      (a, b) => a.y - b.y,
    );
    for (const p of everyone) {
      this.drawHumanoid(ctx, p, p.team === 'home' ? HOME_KIT : AWAY_KIT);
    }

    ctx.restore();
  }

  private drawPitch(ctx: CanvasRenderingContext2D) {
    const stripes = 12;
    const sw = FIELD_W / stripes;
    for (let i = 0; i < stripes; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#258044' : '#22783f';
      ctx.fillRect(i * sw, 0, sw, FIELD_H);
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, FIELD_W, FIELD_H);

    ctx.beginPath();
    ctx.moveTo(FIELD_W / 2, 0);
    ctx.lineTo(FIELD_W / 2, FIELD_H);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(FIELD_W / 2, FIELD_H / 2, 80, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(FIELD_W / 2, FIELD_H / 2, 4, 0, Math.PI * 2);
    ctx.fill();

    const boxH = 320;
    const boxW = 150;
    const sixH = 160;
    const sixW = 60;
    const by = (FIELD_H - boxH) / 2;
    const sy = (FIELD_H - sixH) / 2;
    ctx.strokeRect(0, by, boxW, boxH);
    ctx.strokeRect(FIELD_W - boxW, by, boxW, boxH);
    ctx.strokeRect(0, sy, sixW, sixH);
    ctx.strokeRect(FIELD_W - sixW, sy, sixW, sixH);
  }

  private drawGoals(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 4;
    ctx.strokeRect(-GOAL_DEPTH, goalTop, GOAL_DEPTH, goalBottom - goalTop);
    ctx.strokeRect(FIELD_W, goalTop, GOAL_DEPTH, goalBottom - goalTop);

    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    for (let gx = -GOAL_DEPTH + 6; gx < 0; gx += 8) {
      ctx.beginPath();
      ctx.moveTo(gx, goalTop);
      ctx.lineTo(gx, goalBottom);
      ctx.stroke();
    }
    for (let gx = FIELD_W + 6; gx < FIELD_W + GOAL_DEPTH; gx += 8) {
      ctx.beginPath();
      ctx.moveTo(gx, goalTop);
      ctx.lineTo(gx, goalBottom);
      ctx.stroke();
    }
  }

  private drawShadow(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    r: number,
  ) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(x + 3, y + 5, r, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // ---- humanoid sprite ----------------------------------------------------

  /**
   * Procedural top-down footballer. Drawn in local space where +x is the
   * facing direction: boots and arms swing with the run cycle, a kick pose
   * extends the striking leg, and the whole body rotates to any angle.
   */
  private drawHumanoid(ctx: CanvasRenderingContext2D, p: PlayerEntity, kit: Kit) {
    const speed = Math.hypot(p.vx, p.vy);
    const moving = speed > 30;
    const swing = moving ? Math.sin(p.animPhase) : 0;
    const ang = Math.atan2(p.facing.y, p.facing.x);
    const kicking = p.kickTimer > 0;

    this.drawShadow(ctx, p.x, p.y, p.r * 0.85);

    // Possession ring (under the body).
    if (this.owner === p) {
      ctx.strokeStyle = 'rgba(198,255,46,0.9)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(ang);

    // Boots (alternate along the facing axis while running).
    let frontFoot = swing * 7;
    let backFoot = -swing * 7;
    if (kicking) {
      frontFoot = 12; // striking leg extended
      backFoot = -4;
    }
    ctx.fillStyle = '#16181d';
    ctx.beginPath();
    ctx.ellipse(frontFoot, -5, 4, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(backFoot, 5, 4, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Arms (counter-swing to the legs).
    const armSwing = kicking ? 5 : -swing * 6;
    ctx.fillStyle = kit.sleeve;
    ctx.beginPath();
    ctx.arc(armSwing, -9.5, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-armSwing, 9.5, 2.8, 0, Math.PI * 2);
    ctx.fill();

    // Torso (shoulders wide, viewed from above).
    ctx.fillStyle = kit.shirt;
    ctx.beginPath();
    ctx.ellipse(0, 0, 6.5, 9.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = kit.outline;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Shoulder trim stripe.
    ctx.fillStyle = kit.sleeve;
    ctx.beginPath();
    ctx.ellipse(-3.2, 0, 1.8, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head: skin circle with hair covering the back of the crown.
    ctx.fillStyle = p.skin;
    ctx.beginPath();
    ctx.arc(1.5, 0, 4.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.hair;
    ctx.beginPath();
    ctx.arc(0.4, 0, 3.7, Math.PI * 0.42, Math.PI * 1.58);
    ctx.fill();

    ctx.restore();

    // Markers above the head (not rotated).
    if (p === this.controlled) {
      ctx.fillStyle = '#c6ff2e';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - p.r - 9);
      ctx.lineTo(p.x - 7, p.y - p.r - 20);
      ctx.lineTo(p.x + 7, p.y - p.r - 20);
      ctx.closePath();
      ctx.fill();
    } else if (p === this.switchHint) {
      ctx.strokeStyle = 'rgba(198,255,46,0.75)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - p.r - 9);
      ctx.lineTo(p.x - 7, p.y - p.r - 20);
      ctx.lineTo(p.x + 7, p.y - p.r - 20);
      ctx.closePath();
      ctx.stroke();
    }
  }
}
