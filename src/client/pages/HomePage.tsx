import { useEffect, useRef, useState } from 'react';
import { Play, RotateCcw, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import {
  PitchKickGame,
  CANVAS_W,
  CANVAS_H,
  type HudState,
} from '@/client/game/engine';
import { TEAMS, type TeamData } from '@/client/game/teams';

const CONTROLS: { keys: string; label: string }[] = [
  { keys: '← ↑ ↓ →', label: 'Move' },
  { keys: 'E', label: 'Sprint' },
  { keys: 'D', label: 'Shot / Tackle' },
  { keys: 'S', label: 'Short pass' },
  { keys: 'A', label: 'Long pass' },
  { keys: 'W', label: 'Through pass' },
  { keys: 'C', label: 'Contain (hold)' },
  { keys: 'Q', label: 'Switch player' },
];

type Phase = 'intro' | 'select' | 'playing';

function fmtTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function wrap(i: number, n: number) {
  return ((i % n) + n) % n;
}

export default function HomePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<PitchKickGame | null>(null);
  const [phase, setPhase] = useState<Phase>('intro');
  const [gameKey, setGameKey] = useState(0);

  // Team selection (indices into TEAMS). Left = you (home), right = CPU (away).
  const [homeIdx, setHomeIdx] = useState(0);
  const [awayIdx, setAwayIdx] = useState(1);
  const [activeSide, setActiveSide] = useState<'home' | 'away'>('home');

  const home: TeamData = TEAMS[homeIdx];
  const away: TeamData = TEAMS[awayIdx];

  const [hud, setHud] = useState<HudState>({
    homeScore: 0,
    awayScore: 0,
    clock: 0,
    message: '',
    possession: 'none',
    homePlayer: null,
    awayPlayer: null,
    charge: null,
  });

  // Boot the canvas game once the match phase begins.
  useEffect(() => {
    if (phase !== 'playing' || !canvasRef.current) return;
    const game = new PitchKickGame(canvasRef.current, setHud, home, away);
    gameRef.current = game;
    game.start();
    return () => {
      game.stop();
      gameRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, gameKey]);

  // FIFA-style keyboard navigation on the team-select screen.
  useEffect(() => {
    if (phase !== 'select') return;
    const onKey = (e: KeyboardEvent) => {
      const k = e.code;
      if (
        k === 'ArrowLeft' ||
        k === 'ArrowRight' ||
        k === 'Enter' ||
        k === 'KeyS' ||
        k === 'KeyD'
      ) {
        e.preventDefault();
      }
      const setActive = activeSide === 'home' ? setHomeIdx : setAwayIdx;
      if (k === 'ArrowLeft' || k === 'ArrowRight') {
        const dir = k === 'ArrowLeft' ? -1 : 1;
        setActive((cur) => {
          let n = wrap(cur + dir, TEAMS.length);
          // The CPU can't pick the team you already locked in.
          if (activeSide === 'away' && n === homeIdx)
            n = wrap(n + dir, TEAMS.length);
          return n;
        });
      } else if (k === 'Enter' || k === 'KeyS' || k === 'KeyD') {
        if (activeSide === 'home') {
          // Guarantee the CPU side differs from the just-picked home team.
          setAwayIdx((a) => (a === homeIdx ? wrap(homeIdx + 1, TEAMS.length) : a));
          setActiveSide('away');
        } else {
          setPhase('playing');
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, activeSide, homeIdx]);

  const handleKickOff = () => setPhase('select');
  const handleRestart = () => {
    setPhase('select');
    setActiveSide('home');
  };
  const handleRematch = () => {
    setPhase('intro');
    setGameKey((k) => k + 1);
    requestAnimationFrame(() => setPhase('playing'));
  };

  return (
    <div className="min-h-full flex flex-col items-center px-4 py-6 bg-night-950">
      {/* Brand bar */}
      <header className="w-full max-w-5xl flex items-center justify-between mb-5 animate-fade-in">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-5xl leading-none tracking-wide text-volt-500">
            PITCH<span className="text-white">KICK</span>
          </span>
          <span className="hidden sm:inline font-heading uppercase text-xs tracking-[0.3em] text-night-600">
            Arcade Football
          </span>
        </div>
        {phase === 'playing' && (
          <div className="flex items-center gap-4">
            <button
              onClick={handleRematch}
              className="flex items-center gap-2 font-heading uppercase text-sm tracking-wider text-night-600 hover:text-volt-400 transition-colors"
            >
              <RotateCcw size={16} />
              Rematch
            </button>
            <button
              onClick={handleRestart}
              className="flex items-center gap-2 font-heading uppercase text-sm tracking-wider text-night-600 hover:text-volt-400 transition-colors"
            >
              Change teams
            </button>
          </div>
        )}
      </header>

      {/* Pitch */}
      <div className="relative w-full max-w-5xl rounded-card overflow-hidden border border-night-800 shadow-2xl animate-slide-up">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="block w-full h-auto"
          style={{ aspectRatio: `${CANVAS_W} / ${CANVAS_H}` }}
        />

        {/* FIFA-style broadcast scoreboard. */}
        {phase === 'playing' && (
          <div className="absolute top-3 left-3 flex items-stretch h-9 rounded-md overflow-hidden shadow-lg shadow-black/40 font-heading select-none animate-fade-in text-sm">
            <span
              className="w-1.5 self-stretch"
              style={{ backgroundColor: home.color }}
            />
            <span className="flex items-center pl-2 pr-1.5 bg-night-950/95 text-white uppercase tracking-wider text-xs font-bold">
              {home.abbr}
            </span>
            <span className="flex items-center px-2.5 bg-night-950/95 text-white text-base tabular-nums font-display">
              {hud.homeScore}
            </span>
            <span className="flex items-center bg-night-950/95 text-night-600 text-xs">
              –
            </span>
            <span className="flex items-center px-2.5 bg-night-950/95 text-white text-base tabular-nums font-display">
              {hud.awayScore}
            </span>
            <span className="flex items-center pl-1.5 pr-2 bg-night-950/95 text-white uppercase tracking-wider text-xs font-bold">
              {away.abbr}
            </span>
            <span
              className="w-1.5 self-stretch"
              style={{ backgroundColor: away.color }}
            />
            <span className="flex items-center px-2.5 bg-volt-500 text-night-950 text-sm tabular-nums font-bold tracking-tight">
              {fmtTime(hud.clock)}
            </span>
          </div>
        )}

        {/* Broadcast lower-thirds. */}
        {phase === 'playing' && hud.homePlayer && (
          <PlayerNameTag
            side="left"
            color={home.color}
            textColor={home.textColor}
            num={hud.homePlayer.num}
            name={hud.homePlayer.name}
            charge={hud.charge}
          />
        )}
        {phase === 'playing' && hud.awayPlayer && (
          <PlayerNameTag
            side="right"
            color={away.color}
            textColor={away.textColor}
            num={hud.awayPlayer.num}
            name={hud.awayPlayer.name}
          />
        )}

        {/* Centre message (GOAL etc.) */}
        {phase === 'playing' && hud.message && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span
              key={hud.message + hud.homeScore + hud.awayScore}
              className="font-display text-7xl sm:text-8xl text-volt-500 drop-shadow-[0_4px_0_rgba(0,0,0,0.6)] animate-pop tracking-wider text-center px-6"
            >
              {hud.message}
            </span>
          </div>
        )}

        {/* Intro overlay */}
        {phase === 'intro' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-night-950/85 backdrop-blur-sm animate-fade-in">
            <h1 className="font-display text-6xl sm:text-7xl text-white tracking-wide mb-2">
              READY TO <span className="text-volt-500">KICK OFF?</span>
            </h1>
            <p className="font-body text-night-600 mb-8 text-center max-w-md">
              Pick your nation, then the CPU's — full 11v11 with real squads and
              formations, the TV camera follows the ball. Your active player wears
              the solid ▼ marker; a hollow ▽ hints who{' '}
              <span className="text-volt-400 font-semibold">Q</span> switches you to.
            </p>
            <button
              onClick={handleKickOff}
              className="group flex items-center gap-3 bg-volt-500 text-night-950 font-heading uppercase tracking-widest text-lg px-10 py-4 rounded-full hover:bg-volt-400 transition-all hover:scale-105 active:scale-95"
            >
              <Play size={22} className="fill-night-950" />
              Kick Off
            </button>
          </div>
        )}

        {/* Team-select overlay */}
        {phase === 'select' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-night-950/92 backdrop-blur-sm animate-fade-in px-4">
            <h2 className="font-display text-4xl sm:text-5xl text-white tracking-wide mb-1">
              SELECT <span className="text-volt-500">TEAMS</span>
            </h2>
            <p className="font-body text-night-600 text-sm mb-6 text-center">
              <span className="text-volt-400 font-semibold">← →</span> to choose
              ·{' '}
              <span className="text-volt-400 font-semibold">Enter / S / D</span>{' '}
              to confirm
            </p>
            <div className="flex items-stretch gap-4 sm:gap-8">
              <TeamCrest
                team={home}
                tag="YOU"
                active={activeSide === 'home'}
                locked={activeSide === 'away'}
              />
              <div className="flex items-center font-display text-3xl text-night-700">
                VS
              </div>
              <TeamCrest
                team={away}
                tag="CPU"
                active={activeSide === 'away'}
                locked={false}
              />
            </div>
          </div>
        )}
      </div>

      {/* Controls legend */}
      <div className="w-full max-w-5xl mt-5 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 animate-fade-in">
        {CONTROLS.map((c) => (
          <div
            key={c.label}
            className="flex flex-col items-center gap-1 bg-night-900 border border-night-800 rounded-xl py-3 px-2"
          >
            <kbd className="font-heading text-volt-400 text-base tracking-wider">
              {c.keys}
            </kbd>
            <span className="font-body text-xs text-night-600 uppercase tracking-wide">
              {c.label}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-5 text-xs text-night-700 font-body text-center max-w-xl">
        Tip: hold a pass/shot key to charge the power gauge, release to kick —
        a quick tap plays it soft. Defending: tap{' '}
        <span className="text-volt-400">D</span> for a standing tackle, hold{' '}
        <span className="text-volt-400">C</span> to contain and auto-poke, or
        just stay touch-tight — sustained contact wins the ball. Press{' '}
        <span className="text-volt-400">Q</span> to jump to the hinted ▽ player.
      </p>
    </div>
  );
}

function TeamCrest({
  team,
  tag,
  active,
  locked,
}: {
  team: TeamData;
  tag: string;
  active: boolean;
  locked: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-3 w-44 sm:w-52">
      <span
        className={`font-heading uppercase tracking-[0.3em] text-xs ${
          active ? 'text-volt-400' : 'text-night-600'
        }`}
      >
        {tag}
      </span>
      <div className="flex items-center gap-1 sm:gap-2">
        <ChevronLeft
          size={26}
          className={`shrink-0 transition-opacity ${
            active ? 'text-volt-500 animate-pulse' : 'text-transparent'
          }`}
        />
        <div
          className={`relative flex flex-col items-center justify-center rounded-2xl w-28 h-32 sm:w-32 sm:h-36 transition-all ${
            active
              ? 'ring-4 ring-volt-500 scale-105 shadow-xl shadow-black/40'
              : locked
                ? 'ring-2 ring-volt-700/60 opacity-90'
                : 'ring-1 ring-night-700 opacity-70'
          }`}
          style={{ backgroundColor: team.color }}
        >
          {locked && (
            <span className="absolute top-2 right-2 bg-volt-500 text-night-950 rounded-full p-0.5">
              <Check size={14} strokeWidth={3} />
            </span>
          )}
          <span
            className="font-display text-4xl sm:text-5xl tracking-wider leading-none"
            style={{ color: team.textColor }}
          >
            {team.abbr}
          </span>
          <span
            className="font-heading text-[10px] uppercase tracking-widest mt-2 opacity-80"
            style={{ color: team.textColor }}
          >
            {team.formation}
          </span>
        </div>
        <ChevronRight
          size={26}
          className={`shrink-0 transition-opacity ${
            active ? 'text-volt-500 animate-pulse' : 'text-transparent'
          }`}
        />
      </div>
      <span className="font-heading uppercase tracking-wider text-sm text-white text-center">
        {team.name}
      </span>
    </div>
  );
}

function PlayerNameTag({
  side,
  color,
  textColor,
  num,
  name,
  charge,
}: {
  side: 'left' | 'right';
  color: string;
  textColor: string;
  num: number;
  name: string;
  charge?: number | null;
}) {
  const showCharge = charge != null;
  return (
    <div
      className={`absolute bottom-3 ${
        side === 'left' ? 'left-3' : 'right-3'
      } rounded-md overflow-hidden shadow-lg shadow-black/40 bg-night-950/95 font-heading select-none animate-fade-in`}
    >
      <div className="flex items-stretch h-9">
        {side === 'left' && (
          <span
            className="w-1.5 self-stretch"
            style={{ backgroundColor: color }}
          />
        )}
        <span
          className="flex items-center px-2.5 text-sm tabular-nums font-display"
          style={{ backgroundColor: color, color: textColor }}
        >
          {num}
        </span>
        <span className="flex items-center px-3 text-white uppercase tracking-wider text-sm font-bold">
          {name}
        </span>
        {side === 'right' && (
          <span
            className="w-1.5 self-stretch"
            style={{ backgroundColor: color }}
          />
        )}
      </div>
      <div className="h-1 w-full bg-night-800">
        {showCharge && (
          <div
            className="h-full transition-[width] duration-75 ease-linear"
            style={{
              width: `${Math.round((charge as number) * 100)}%`,
              background:
                'linear-gradient(90deg,#39e639 0%,#ffe23a 55%,#ff8c1a 80%,#ff2e2e 100%)',
            }}
          />
        )}
      </div>
    </div>
  );
}
