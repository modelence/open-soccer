import type { TeamData } from './types';

// ── Team imports ─────────────────────────────────────────────────────────
import { argentina } from './argentina';
import { brazil } from './brazil';
import { uruguay } from './uruguay';
import { colombia } from './colombia';
import { ecuador } from './ecuador';
import { paraguay } from './paraguay';
import { france } from './france';
import { spain } from './spain';
import { england } from './england';
import { germany } from './germany';
import { portugal } from './portugal';
import { netherlands } from './netherlands';
import { croatia } from './croatia';
import { belgium } from './belgium';
import { switzerland } from './switzerland';
import { austria } from './austria';
import { turkey } from './turkey';
import { norway } from './norway';
import { sweden } from './sweden';
import { scotland } from './scotland';
import { czechia } from './czechia';
import { bosnia } from './bosnia';
import { usa } from './usa';
import { mexico } from './mexico';
import { canada } from './canada';
import { panama } from './panama';
import { curacao } from './curacao';
import { haiti } from './haiti';
import { japan } from './japan';
import { southKorea } from './southkorea';
import { iran } from './iran';
import { australia } from './australia';
import { saudiArabia } from './saudiarabia';
import { qatar } from './qatar';
import { uzbekistan } from './uzbekistan';
import { iraq } from './iraq';
import { jordan } from './jordan';
import { morocco } from './morocco';
import { senegal } from './senegal';
import { egypt } from './egypt';
import { ghana } from './ghana';
import { algeria } from './algeria';
import { ivoryCoast } from './ivorycoast';
import { tunisia } from './tunisia';
import { southAfrica } from './southafrica';
import { capeVerde } from './capeverde';
import { drCongo } from './drcongo';
import { newZealand } from './newzealand';

// ── Groups — the OFFICIAL FIFA World Cup 2026 draw (Dec 2025) ─────────────
// Source: the real group-stage draw. Hosts: Mexico (A1), Canada (B1),
// USA (D1). These are the actual 12 groups of four.
export const GROUPS: Record<string, TeamData[]> = {
  A: [mexico, southAfrica, southKorea, czechia],
  B: [canada, bosnia, qatar, switzerland],
  C: [brazil, morocco, haiti, scotland],
  D: [usa, paraguay, australia, turkey],
  E: [germany, curacao, ivoryCoast, ecuador],
  F: [netherlands, japan, sweden, tunisia],
  G: [belgium, egypt, iran, newZealand],
  H: [spain, capeVerde, saudiArabia, uruguay],
  I: [france, senegal, iraq, norway],
  J: [argentina, algeria, austria, jordan],
  K: [portugal, drCongo, uzbekistan, colombia],
  L: [england, croatia, ghana, panama],
};

// ── Schedule type ────────────────────────────────────────────────────────
export type Match = {
  kickoffUTC: Date;
  home: TeamData;
  away: TeamData;
  group: string;
  venue: string;
};

// Helper: ISO time is UTC (the source GMT kickoff times are already UTC).
const m = (
  iso: string,
  group: string,
  home: TeamData,
  away: TeamData,
  venue: string,
): Match => ({
  kickoffUTC: new Date(iso),
  home,
  away,
  group,
  venue,
});

// ── Group-stage fixtures — the real WC2026 schedule ──────────────────────
// Kickoff times are the published GMT/UTC start times. Venues use the FIFA
// tournament stadium names (host-city assignments are approximate).
export const MATCHES: Match[] = [
  // ── MATCHDAY 1 ─────────────────────────────────────────────────────────
  m('2026-06-11T19:00:00Z', 'A', mexico, southAfrica, 'Mexico City Stadium'),
  m('2026-06-12T02:00:00Z', 'A', southKorea, czechia, 'Los Angeles Stadium'),
  m('2026-06-12T19:00:00Z', 'B', canada, bosnia, 'Toronto Stadium'),
  m('2026-06-13T01:00:00Z', 'D', usa, paraguay, 'Los Angeles Stadium'),
  m('2026-06-13T19:00:00Z', 'B', qatar, switzerland, 'San Francisco Bay Area Stadium'),
  m('2026-06-13T22:00:00Z', 'C', brazil, morocco, 'Boston Stadium'),
  m('2026-06-14T01:00:00Z', 'C', haiti, scotland, 'New York New Jersey Stadium'),
  m('2026-06-14T04:00:00Z', 'D', australia, turkey, 'BC Place, Vancouver'),
  m('2026-06-14T17:00:00Z', 'E', germany, curacao, 'Philadelphia Stadium'),
  m('2026-06-14T20:00:00Z', 'F', netherlands, japan, 'Dallas Stadium'),
  m('2026-06-14T23:00:00Z', 'E', ivoryCoast, ecuador, 'Atlanta Stadium'),
  m('2026-06-15T02:00:00Z', 'F', sweden, tunisia, 'Houston Stadium'),
  m('2026-06-15T16:00:00Z', 'H', spain, capeVerde, 'Miami Stadium'),
  m('2026-06-15T19:00:00Z', 'G', belgium, egypt, 'Kansas City Stadium'),
  m('2026-06-15T22:00:00Z', 'H', saudiArabia, uruguay, 'Seattle Stadium'),
  m('2026-06-16T01:00:00Z', 'G', iran, newZealand, 'San Francisco Bay Area Stadium'),
  m('2026-06-16T19:00:00Z', 'I', france, senegal, 'New York New Jersey Stadium'),
  m('2026-06-16T22:00:00Z', 'I', iraq, norway, 'Dallas Stadium'),
  m('2026-06-17T01:00:00Z', 'J', argentina, algeria, 'Atlanta Stadium'),
  m('2026-06-17T04:00:00Z', 'J', austria, jordan, 'Estadio Monterrey'),
  m('2026-06-17T17:00:00Z', 'K', portugal, drCongo, 'Toronto Stadium'),
  m('2026-06-17T20:00:00Z', 'L', england, croatia, 'Boston Stadium'),
  m('2026-06-17T23:00:00Z', 'L', ghana, panama, 'Philadelphia Stadium'),
  m('2026-06-18T02:00:00Z', 'K', uzbekistan, colombia, 'BC Place, Vancouver'),

  // ── MATCHDAY 2 ─────────────────────────────────────────────────────────
  m('2026-06-18T16:00:00Z', 'A', czechia, southAfrica, 'Estadio Guadalajara'),
  m('2026-06-18T19:00:00Z', 'B', switzerland, bosnia, 'Seattle Stadium'),
  m('2026-06-18T22:00:00Z', 'B', canada, qatar, 'Toronto Stadium'),
  m('2026-06-19T01:00:00Z', 'A', mexico, southKorea, 'Mexico City Stadium'),
  m('2026-06-19T19:00:00Z', 'D', usa, australia, 'San Francisco Bay Area Stadium'),
  m('2026-06-19T22:00:00Z', 'C', scotland, morocco, 'New York New Jersey Stadium'),
  m('2026-06-20T00:30:00Z', 'C', brazil, haiti, 'Los Angeles Stadium'),
  m('2026-06-20T03:00:00Z', 'D', turkey, paraguay, 'BC Place, Vancouver'),
  m('2026-06-20T17:00:00Z', 'F', netherlands, sweden, 'Philadelphia Stadium'),
  m('2026-06-20T20:00:00Z', 'E', germany, ivoryCoast, 'Atlanta Stadium'),
  m('2026-06-21T03:00:00Z', 'E', ecuador, curacao, 'Houston Stadium'),
  m('2026-06-21T04:00:00Z', 'F', tunisia, japan, 'Dallas Stadium'),
  m('2026-06-21T16:00:00Z', 'H', spain, saudiArabia, 'Miami Stadium'),
  m('2026-06-21T19:00:00Z', 'G', belgium, iran, 'Kansas City Stadium'),
  m('2026-06-21T22:00:00Z', 'H', uruguay, capeVerde, 'Seattle Stadium'),
  m('2026-06-22T01:00:00Z', 'G', newZealand, egypt, 'San Francisco Bay Area Stadium'),
  m('2026-06-22T17:00:00Z', 'J', argentina, austria, 'Estadio Monterrey'),
  m('2026-06-22T21:00:00Z', 'I', france, iraq, 'New York New Jersey Stadium'),
  m('2026-06-23T00:00:00Z', 'I', norway, senegal, 'Dallas Stadium'),
  m('2026-06-23T03:00:00Z', 'J', jordan, algeria, 'Houston Stadium'),
  m('2026-06-23T17:00:00Z', 'K', portugal, uzbekistan, 'Toronto Stadium'),
  m('2026-06-23T20:00:00Z', 'L', england, ghana, 'Boston Stadium'),
  m('2026-06-23T23:00:00Z', 'L', panama, croatia, 'Philadelphia Stadium'),
  m('2026-06-24T02:00:00Z', 'K', colombia, drCongo, 'BC Place, Vancouver'),

  // ── MATCHDAY 3 (simultaneous kickoffs within each group) ───────────────
  m('2026-06-24T19:00:00Z', 'B', switzerland, canada, 'BC Place, Vancouver'),
  m('2026-06-24T19:00:00Z', 'B', bosnia, qatar, 'Seattle Stadium'),
  m('2026-06-24T22:00:00Z', 'C', scotland, brazil, 'Miami Stadium'),
  m('2026-06-24T22:00:00Z', 'C', morocco, haiti, 'Boston Stadium'),
  m('2026-06-25T01:00:00Z', 'A', czechia, mexico, 'Mexico City Stadium'),
  m('2026-06-25T01:00:00Z', 'A', southAfrica, southKorea, 'Estadio Guadalajara'),
  m('2026-06-25T20:00:00Z', 'E', ecuador, germany, 'Philadelphia Stadium'),
  m('2026-06-25T20:00:00Z', 'E', curacao, ivoryCoast, 'Atlanta Stadium'),
  m('2026-06-25T23:00:00Z', 'F', japan, sweden, 'Dallas Stadium'),
  m('2026-06-25T23:00:00Z', 'F', tunisia, netherlands, 'Houston Stadium'),
  m('2026-06-26T02:00:00Z', 'D', turkey, usa, 'San Francisco Bay Area Stadium'),
  m('2026-06-26T02:00:00Z', 'D', paraguay, australia, 'Los Angeles Stadium'),
  m('2026-06-26T19:00:00Z', 'I', norway, france, 'New York New Jersey Stadium'),
  m('2026-06-26T19:00:00Z', 'I', senegal, iraq, 'Dallas Stadium'),
  m('2026-06-27T00:00:00Z', 'H', capeVerde, saudiArabia, 'Seattle Stadium'),
  m('2026-06-27T00:00:00Z', 'H', uruguay, spain, 'Miami Stadium'),
  m('2026-06-27T03:00:00Z', 'G', egypt, iran, 'Kansas City Stadium'),
  m('2026-06-27T03:00:00Z', 'G', newZealand, belgium, 'San Francisco Bay Area Stadium'),
  m('2026-06-27T21:00:00Z', 'L', panama, england, 'Boston Stadium'),
  m('2026-06-27T21:00:00Z', 'L', croatia, ghana, 'Philadelphia Stadium'),
  m('2026-06-27T23:30:00Z', 'K', colombia, portugal, 'Toronto Stadium'),
  m('2026-06-27T23:30:00Z', 'K', drCongo, uzbekistan, 'BC Place, Vancouver'),
  m('2026-06-28T02:00:00Z', 'J', algeria, austria, 'Estadio Monterrey'),
  m('2026-06-28T02:00:00Z', 'J', jordan, argentina, 'Houston Stadium'),
].sort((a, b) => a.kickoffUTC.getTime() - b.kickoffUTC.getTime());

// ── Lookups ──────────────────────────────────────────────────────────────

const MATCH_DURATION_MS = 110 * 60 * 1000; // 110 min covers a full 90' + stoppage

/**
 * Returns the match currently being played (kickoff <= now < kickoff + 110m),
 * or the next upcoming match if none is live, or null if the group stage is
 * over.
 */
export function findCurrentOrNextMatch(now: Date = new Date()): Match | null {
  const t = now.getTime();
  // Currently live?
  for (const match of MATCHES) {
    const start = match.kickoffUTC.getTime();
    if (t >= start && t < start + MATCH_DURATION_MS) return match;
  }
  // Next upcoming
  for (const match of MATCHES) {
    if (match.kickoffUTC.getTime() > t) return match;
  }
  return null;
}
