// Maps a player's FIFA-style attribute card (see teams/types.ts `Ratings`)
// onto concrete in-game multipliers. ALL gameplay effects of player skill
// funnel through these helpers so the balance lives in one place.
//
// Convention: 75 is the "average international" baseline → multiplier 1.0.
// Higher attributes buff, lower attributes nerf. The `spread` constant on
// each helper controls how strongly that attribute tilts the match — tuned
// for a NOTICEABLE (clear, not dramatic) advantage to the better team.

import type { Ratings } from './teams/types';

const BASELINE = 75;

/** Linear multiplier around 1.0 at the baseline rating. spread = how much a
 *  ±25 swing (i.e. 50 vs 99) moves the multiplier. */
function attrMul(rating: number, spread: number): number {
  return 1 + ((rating - BASELINE) / 100) * spread;
}

// ── PACE → movement speed ────────────────────────────────────────────────
// Scales every player's top/target speed, anchored to real km/h: at SPRINT_SPEED
// (34 km/h baseline), PAC 99 → ~38 km/h (Mbappé record), PAC 40 → ~28 km/h
// (slow CB). spread 0.5 keeps the footrace gap clear but humanly possible.
export function paceMul(r: Ratings): number {
  return attrMul(r.pac, 0.5);
}
// Pace also lends a little extra acceleration/agility (snappier off the mark).
export function paceAccelMul(r: Ratings): number {
  return attrMul(r.pac, 0.3);
}

// ── SHOOTING → power + accuracy ──────────────────────────────────────────
export function shotPowerMul(r: Ratings): number {
  return attrMul(r.sho, 0.4);
}
/** Multiplies a shot's angular spread — better shooters scatter LESS, so
 *  high SHO < 1 (tighter), low SHO > 1 (sprayed). Clamped to stay sane. */
export function shotSpreadMul(r: Ratings): number {
  return clamp(1 - ((r.sho - BASELINE) / 100) * 0.7, 0.45, 1.7);
}

// ── PASSING → weight + accuracy ──────────────────────────────────────────
export function passPowerMul(r: Ratings): number {
  return attrMul(r.pas, 0.18);
}
/** Multiplies a pass's angular spread — accurate passers misplace it far less
 *  often, weak passers give the ball away. */
export function passSpreadMul(r: Ratings): number {
  return clamp(1 - ((r.pas - BASELINE) / 100) * 0.8, 0.4, 1.8);
}

// ── DRIBBLING → close control + agility on the ball ──────────────────────
/** Returns the carrier's effective speed multiplier WHILE on the ball, given
 *  the base dribble penalty. Good dribblers lose less of their pace; poor
 *  ones are bogged down. Result stays at/below 1 so the dribble penalty holds. */
export function dribbleKeepMul(r: Ratings, baseMult: number): number {
  // baseMult (e.g. 0.83) is the average dribbler. Shift it toward 1 for high
  // DRI, further down for low DRI.
  const m = baseMult + ((r.dri - BASELINE) / 100) * 0.3;
  return clamp(m, 0.62, 0.99);
}
/** Turning/agility on the ball — scales DRIBBLE_ACCEL so good dribblers jink
 *  sharper. */
export function dribbleTurnMul(r: Ratings): number {
  return attrMul(r.dri, 0.5);
}

// ── DEFENDING → tackle reach + success ───────────────────────────────────
/** Scales a tackler's poke/jostle reach — better defenders nick the ball from
 *  a touch further out and time it better. */
export function tackleReachMul(r: Ratings): number {
  return attrMul(r.def, 0.45);
}

// ── PHYSICALITY → duels / shielding ──────────────────────────────────────
/** How fast a challenger wins (or a carrier resists) a sustained body-contact
 *  duel, as a function of the strength difference between the two. > 1 means
 *  the challenger overpowers the carrier and wins sooner; < 1 means the
 *  carrier shields them off for longer. */
export function duelRate(challenger: Ratings, carrier: Ratings): number {
  return clamp(1 + (challenger.phy - carrier.phy) / 100, 0.45, 1.8);
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
