import { useEffect, useRef, useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import {
  PitchKickGame,
  CANVAS_W,
  CANVAS_H,
  type HudState,
} from '@/client/game/engine';

const CONTROLS: { keys: string; label: string }[] = [
  { keys: '← ↑ ↓ →', label: 'Move' },
  { keys: 'E', label: 'Sprint' },
  { keys: 'D', label: 'Shot' },
  { keys: 'S', label: 'Short pass' },
  { keys: 'A', label: 'Long pass' },
  { keys: 'W', label: 'Through pass' },
  { keys: 'Q', label: 'Switch player' },
];

function fmtTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function HomePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<PitchKickGame | null>(null);
  const [started, setStarted] = useState(false);
  const [gameKey, setGameKey] = useState(0);
  const [hud, setHud] = useState<HudState>({
    homeScore: 0,
    awayScore: 0,
    timeLeft: 120,
    message: '',
    possession: 'none',
  });

  useEffect(() => {
    if (!started || !canvasRef.current) return;
    const game = new PitchKickGame(canvasRef.current, setHud);
    gameRef.current = game;
    game.start();
    return () => {
      game.stop();
      gameRef.current = null;
    };
  }, [started, gameKey]);

  const handleStart = () => setStarted(true);
  const handleRestart = () => {
    setStarted(false);
    setGameKey((k) => k + 1);
    requestAnimationFrame(() => setStarted(true));
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
        {started && (
          <button
            onClick={handleRestart}
            className="flex items-center gap-2 font-heading uppercase text-sm tracking-wider text-night-600 hover:text-volt-400 transition-colors"
          >
            <RotateCcw size={16} />
            Restart
          </button>
        )}
      </header>

      {/* Scoreboard */}
      <div className="w-full max-w-5xl mb-3">
        <div className="flex items-stretch justify-center gap-1 font-display select-none">
          <Score label="YOU" color="text-home-500" value={hud.homeScore} active={hud.possession === 'home'} />
          <div className="flex flex-col items-center justify-center px-6 bg-night-900 border-y-2 border-night-800">
            <span className="font-heading text-[10px] tracking-[0.3em] text-night-600 uppercase">
              Time
            </span>
            <span className="text-4xl leading-none text-volt-500 tabular-nums">
              {fmtTime(hud.timeLeft)}
            </span>
          </div>
          <Score label="CPU" color="text-away-500" value={hud.awayScore} active={hud.possession === 'away'} flip />
        </div>
      </div>

      {/* Pitch */}
      <div className="relative w-full max-w-5xl rounded-card overflow-hidden border border-night-800 shadow-2xl animate-slide-up">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="block w-full h-auto"
          style={{ aspectRatio: `${CANVAS_W} / ${CANVAS_H}` }}
        />

        {/* Centre message (GOAL etc.) */}
        {started && hud.message && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span
              key={hud.message + hud.homeScore + hud.awayScore}
              className="font-display text-7xl sm:text-8xl text-volt-500 drop-shadow-[0_4px_0_rgba(0,0,0,0.6)] animate-pop tracking-wider text-center px-6"
            >
              {hud.message}
            </span>
          </div>
        )}

        {/* Start overlay */}
        {!started && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-night-950/85 backdrop-blur-sm animate-fade-in">
            <h1 className="font-display text-6xl sm:text-7xl text-white tracking-wide mb-2">
              READY TO <span className="text-volt-500">KICK OFF?</span>
            </h1>
            <p className="font-body text-night-600 mb-8 text-center max-w-md">
              4v4 against the CPU. You control the{' '}
              <span className="text-home-500 font-semibold">blue</span> player with the
              solid <span className="text-volt-400 font-semibold">▼</span>. A hollow ▽
              hints who <span className="text-volt-400 font-semibold">Q</span> will
              switch you to — selection never changes on its own.
            </p>
            <button
              onClick={handleStart}
              className="group flex items-center gap-3 bg-volt-500 text-night-950 font-heading uppercase tracking-widest text-lg px-10 py-4 rounded-full hover:bg-volt-400 transition-all hover:scale-105 active:scale-95"
            >
              <Play size={22} className="fill-night-950" />
              Kick Off
            </button>
          </div>
        )}
      </div>

      {/* Controls legend */}
      <div className="w-full max-w-5xl mt-5 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 animate-fade-in">
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
        Tip: passes go to the teammate you're facing and hand you control of the
        receiver. Off the ball, selection is yours — press{' '}
        <span className="text-volt-400">Q</span> to jump to the hinted ▽ player.
      </p>
    </div>
  );
}

function Score({
  label,
  color,
  value,
  active,
  flip,
}: {
  label: string;
  color: string;
  value: number;
  active: boolean;
  flip?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-4 px-8 py-2 bg-night-900 border-y-2 ${
        active ? 'border-volt-500' : 'border-night-800'
      } transition-colors ${flip ? 'flex-row-reverse' : ''}`}
    >
      <span className={`font-heading uppercase tracking-widest text-sm ${color}`}>
        {label}
      </span>
      <span className="text-5xl leading-none text-white tabular-nums">{value}</span>
    </div>
  );
}
