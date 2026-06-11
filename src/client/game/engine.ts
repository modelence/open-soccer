// PitchKick — arcade football engine (single-player vs CPU).
// Pure canvas + requestAnimationFrame. No React inside the hot loop.

export const FIELD_W = 1050;
export const FIELD_H = 680;
export const MARGIN = 56;
export const CANVAS_W = FIELD_W + MARGIN * 2;
export const CANVAS_H = FIELD_H + MARGIN * 2;

const GOAL_HEIGHT = 200;
const GOAL_DEPTH = 38;
const goalTop = FIELD_H / 2 - GOAL_HEIGHT / 2;
const goalBottom = FIELD_H / 2 + GOAL_HEIGHT / 2;

const PLAYER_R = 15;
const BALL_R = 9;
const WALK_SPEED = 215;
const SPRINT_SPEED = 340;
const PC_SPEED = 232;
const CONTROL_DIST = PLAYER_R + BALL_R + 12;

type Vec = { x: number; y: number };

interface Mover {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

export interface HudState {
  homeScore: number;
  awayScore: number;
  timeLeft: number;
  message: string;
  possession: 'home' | 'away' | 'none';
}

type StateListener = (s: HudState) => void;

const KICK_KEYS = new Set(['KeyW', 'KeyS', 'KeyA', 'KeyD']);
const MOVE_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'KeyE',
  'Space',
]);

function len(x: number, y: number) {
  return Math.hypot(x, y) || 1;
}

export class PitchKickGame {
  private ctx: CanvasRenderingContext2D;
  private raf = 0;
  private last = 0;
  private running = false;

  private keys = new Set<string>();
  private justPressed: string[] = [];

  private ball: Mover = { x: 0, y: 0, vx: 0, vy: 0, r: BALL_R };
  private home: Mover = { x: 0, y: 0, vx: 0, vy: 0, r: PLAYER_R };
  private away: Mover = { x: 0, y: 0, vx: 0, vy: 0, r: PLAYER_R };
  private homeFacing: Vec = { x: 1, y: 0 };

  private homeScore = 0;
  private awayScore = 0;
  private timeLeft = 120;
  private message = '';
  private messageTimer = 0;
  private kickLock = 0;
  private possession: 'home' | 'away' | 'none' = 'none';
  private freeze = 0; // pause after a goal / kickoff

  private listener: StateListener;

  constructor(canvas: HTMLCanvasElement, listener: StateListener) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
    this.listener = listener;
    this.resetKickoff('home');
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
    if (MOVE_KEYS.has(e.code) || KICK_KEYS.has(e.code)) e.preventDefault();
    if (!e.repeat) {
      if (KICK_KEYS.has(e.code)) this.justPressed.push(e.code);
    }
    this.keys.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  // ---- helpers ------------------------------------------------------------

  private resetKickoff(toward: 'home' | 'away') {
    this.ball.x = FIELD_W / 2;
    this.ball.y = FIELD_H / 2;
    this.ball.vx = 0;
    this.ball.vy = 0;

    this.home.x = FIELD_W * 0.32;
    this.home.y = FIELD_H / 2;
    this.home.vx = this.home.vy = 0;

    this.away.x = FIELD_W * 0.68;
    this.away.y = FIELD_H / 2;
    this.away.vx = this.away.vy = 0;

    this.freeze = 0.8;
    this.possession = 'none';
    void toward;
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
      possession: this.possession,
    });
  }

  // ---- update -------------------------------------------------------------

  private loop = (now: number) => {
    if (!this.running) return;
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (dt > 0.05) dt = 0.05; // clamp big tab-switch gaps

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
    if (this.kickLock > 0) this.kickLock -= dt;

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

    this.updateHomePlayer(dt);
    this.updateAwayPlayer(dt);
    this.resolvePossession();
    this.updateBall(dt);
    this.handleGoals();

    this.justPressed = [];
  }

  private updateHomePlayer(dt: number) {
    let dx = 0;
    let dy = 0;
    if (this.keys.has('ArrowUp')) dy -= 1;
    if (this.keys.has('ArrowDown')) dy += 1;
    if (this.keys.has('ArrowLeft')) dx -= 1;
    if (this.keys.has('ArrowRight')) dx += 1;

    const sprinting = this.keys.has('KeyE');
    const speed = sprinting ? SPRINT_SPEED : WALK_SPEED;

    if (dx !== 0 || dy !== 0) {
      const l = len(dx, dy);
      dx /= l;
      dy /= l;
      this.home.vx = dx * speed;
      this.home.vy = dy * speed;
      this.homeFacing = { x: dx, y: dy };
    } else {
      this.home.vx = 0;
      this.home.vy = 0;
    }

    this.home.x += this.home.vx * dt;
    this.home.y += this.home.vy * dt;
    this.clampToField(this.home);

    // Kicks (only meaningful when we hold the ball)
    const owns = this.possession === 'home';
    for (const code of this.justPressed) {
      if (!owns || this.kickLock > 0) continue;
      this.doKick(code);
    }
  }

  private doKick(code: string) {
    const f = this.homeFacing;
    let power = 0;
    let dir: Vec = { x: f.x, y: f.y };

    if (code === 'KeyD') {
      // Shot — aim at the CPU goal mouth for a satisfying strike.
      const tx = FIELD_W;
      const ty = Math.max(goalTop + 24, Math.min(goalBottom - 24, this.ball.y));
      const ddx = tx - this.ball.x;
      const ddy = ty - this.ball.y;
      const l = len(ddx, ddy);
      dir = { x: ddx / l, y: ddy / l };
      power = 720;
    } else if (code === 'KeyA') {
      power = 560; // long pass
    } else if (code === 'KeyW') {
      power = 470; // through pass
    } else if (code === 'KeyS') {
      power = 360; // short pass
    }

    if (power > 0) {
      this.ball.vx = dir.x * power;
      this.ball.vy = dir.y * power;
      this.possession = 'none';
      this.kickLock = 0.28;
    }
  }

  private updateAwayPlayer(dt: number) {
    const owns = this.possession === 'away';
    let tx: number;
    let ty: number;

    if (owns) {
      // Carry toward the player's goal (left), then shoot when close.
      tx = 30;
      ty = FIELD_H / 2;
      const distToGoal = this.away.x - 40;
      if (distToGoal < 230 && this.kickLock <= 0) {
        const gy = Math.max(
          goalTop + 24,
          Math.min(goalBottom - 24, this.away.y),
        );
        const ddx = 0 - this.ball.x;
        const ddy = gy - this.ball.y;
        const l = len(ddx, ddy);
        this.ball.vx = (ddx / l) * 680;
        this.ball.vy = (ddy / l) * 680;
        this.possession = 'none';
        this.kickLock = 0.3;
      }
    } else {
      // Chase the ball, anticipating slightly.
      tx = this.ball.x + this.ball.vx * 0.18;
      ty = this.ball.y + this.ball.vy * 0.18;
    }

    const ddx = tx - this.away.x;
    const ddy = ty - this.away.y;
    const l = len(ddx, ddy);
    this.away.vx = (ddx / l) * PC_SPEED;
    this.away.vy = (ddy / l) * PC_SPEED;
    this.away.x += this.away.vx * dt;
    this.away.y += this.away.vy * dt;
    this.clampToField(this.away);
  }

  private resolvePossession() {
    const dHome = Math.hypot(this.ball.x - this.home.x, this.ball.y - this.home.y);
    const dAway = Math.hypot(this.ball.x - this.away.x, this.ball.y - this.away.y);

    if (this.kickLock > 0) {
      // Ball was just struck — don't immediately re-grab.
      this.possession = 'none';
      return;
    }

    const homeCan = dHome <= CONTROL_DIST;
    const awayCan = dAway <= CONTROL_DIST;

    if (homeCan && (!awayCan || dHome <= dAway)) {
      this.possession = 'home';
      this.dribble(this.home, this.homeFacing);
    } else if (awayCan) {
      this.possession = 'away';
      const f = {
        x: this.away.vx,
        y: this.away.vy,
      };
      const l = len(f.x, f.y);
      this.dribble(this.away, { x: f.x / l, y: f.y / l });
    } else {
      this.possession = 'none';
    }
  }

  private dribble(owner: Mover, facing: Vec) {
    // Nudge the ball just ahead of the owner in their facing direction.
    const ahead = owner.r + this.ball.r + 5;
    const targetX = owner.x + facing.x * ahead;
    const targetY = owner.y + facing.y * ahead;
    this.ball.x += (targetX - this.ball.x) * 0.35;
    this.ball.y += (targetY - this.ball.y) * 0.35;
    this.ball.vx = owner.vx;
    this.ball.vy = owner.vy;
  }

  private updateBall(dt: number) {
    if (this.possession !== 'none') return; // dribble handles it

    this.ball.x += this.ball.vx * dt;
    this.ball.y += this.ball.vy * dt;

    // Rolling friction.
    const decay = Math.exp(-1.5 * dt);
    this.ball.vx *= decay;
    this.ball.vy *= decay;
    if (Math.hypot(this.ball.vx, this.ball.vy) < 4) {
      this.ball.vx = 0;
      this.ball.vy = 0;
    }

    // Bounce off top/bottom touchlines.
    if (this.ball.y < this.ball.r) {
      this.ball.y = this.ball.r;
      this.ball.vy = Math.abs(this.ball.vy) * 0.7;
    } else if (this.ball.y > FIELD_H - this.ball.r) {
      this.ball.y = FIELD_H - this.ball.r;
      this.ball.vy = -Math.abs(this.ball.vy) * 0.7;
    }

    // Bounce off side walls EXCEPT inside the goal mouths.
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
      // CPU scored in the player's (left) goal.
      this.awayScore += 1;
      this.setMessage('CPU SCORES', 1.6);
      this.resetKickoff('home');
    } else if (this.ball.x >= FIELD_W - 2) {
      // Player scored in the CPU (right) goal.
      this.homeScore += 1;
      this.setMessage('G O A L !', 1.6);
      this.resetKickoff('away');
    }
  }

  private clampToField(m: Mover) {
    m.x = Math.max(m.r, Math.min(FIELD_W - m.r, m.x));
    m.y = Math.max(m.r, Math.min(FIELD_H - m.r, m.y));
  }

  // ---- render -------------------------------------------------------------

  private render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Surrounding darkness.
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

    this.drawPlayer(ctx, this.home, '#2e9bff', '#7cc4ff', this.possession === 'home');
    this.drawPlayer(ctx, this.away, '#ff4d4d', '#ff9b9b', this.possession === 'away');

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

    // Outer boundary.
    ctx.strokeRect(0, 0, FIELD_W, FIELD_H);

    // Halfway line.
    ctx.beginPath();
    ctx.moveTo(FIELD_W / 2, 0);
    ctx.lineTo(FIELD_W / 2, FIELD_H);
    ctx.stroke();

    // Centre circle + spot.
    ctx.beginPath();
    ctx.arc(FIELD_W / 2, FIELD_H / 2, 80, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(FIELD_W / 2, FIELD_H / 2, 4, 0, Math.PI * 2);
    ctx.fill();

    // Penalty boxes.
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
    // Left goal (extends into left margin).
    ctx.strokeRect(-GOAL_DEPTH, goalTop, GOAL_DEPTH, goalBottom - goalTop);
    // Right goal.
    ctx.strokeRect(FIELD_W, goalTop, GOAL_DEPTH, goalBottom - goalTop);

    // Net hint.
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

  private drawShadow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(x + 3, y + 5, r, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawPlayer(
    ctx: CanvasRenderingContext2D,
    p: Mover,
    color: string,
    ring: string,
    owns: boolean,
  ) {
    this.drawShadow(ctx, p.x, p.y, p.r);

    if (owns) {
      ctx.strokeStyle = '#c6ff2e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r + 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = ring;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}
