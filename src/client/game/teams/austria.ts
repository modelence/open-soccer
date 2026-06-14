import { buildSquad, type TeamData } from './types';
import { F_4231 } from './formations';

// Austria — 4-2-3-1.
export const austria: TeamData = {
  name: 'Austria',
  abbr: 'AUT',
  formation: '4-2-3-1',
  color: '#ed2939',
  textColor: '#ffffff',
  kit: { shirt: '#ed2939', sleeve: '#bd1f2d', outline: '#5e0f16' },
  gkKit: { shirt: '#2bd47a', sleeve: '#17a95c', outline: '#0a5f33' },
  kickoffFwd: 9,
  players: buildSquad(F_4231, [
    { num: 1, name: 'A. SCHLAGER' },
    { num: 5, name: 'POSCH' },
    { num: 3, name: 'DANSO' },
    { num: 8, name: 'ALABA' },
    { num: 16, name: 'MWENE' },
    { num: 4, name: 'X. SCHLAGER' },
    { num: 6, name: 'SEIWALD' },
    { num: 9, name: 'SABITZER' },
    { num: 20, name: 'LAIMER' },
    { num: 7, name: 'ARNAUTOVIĆ' },
    { num: 24, name: 'WANNER' },
  ]),
};
