import { buildSquad, type TeamData } from './types';
import { F_343 } from './formations';

// Serbia — 3-4-3 (best-effort current XI).
export const serbia: TeamData = {
  name: 'Serbia',
  abbr: 'SRB',
  formation: '3-4-3',
  color: '#c6363c',
  textColor: '#ffffff',
  kit: { shirt: '#c6363c', sleeve: '#9c2a2f', outline: '#5e1619' },
  gkKit: { shirt: '#2bd47a', sleeve: '#17a95c', outline: '#0a5f33' },
  kickoffFwd: 9,
  players: buildSquad(F_343, [
    { num: 1, name: 'RAJKOVIĆ' },
    { num: 4, name: 'MILENKOVIĆ' },
    { num: 23, name: 'PAVLOVIĆ' },
    { num: 5, name: 'VELJKOVIĆ' },
    { num: 22, name: 'ŽIVKOVIĆ' },
    { num: 20, name: 'GUDELJ' },
    { num: 8, name: 'LUKIĆ' },
    { num: 3, name: 'KOSTIĆ' },
    { num: 10, name: 'TADIĆ' },
    { num: 9, name: 'MITROVIĆ' },
    { num: 7, name: 'VLAHOVIĆ' },
  ]),
};
