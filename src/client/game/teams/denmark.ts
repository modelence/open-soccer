import { buildSquad, type TeamData } from './types';
import { F_343 } from './formations';

// Denmark — 3-4-3 (best-effort current XI).
export const denmark: TeamData = {
  name: 'Denmark',
  abbr: 'DEN',
  formation: '3-4-3',
  color: '#c8102e',
  textColor: '#ffffff',
  kit: { shirt: '#c8102e', sleeve: '#9d0c24', outline: '#5e0715' },
  gkKit: { shirt: '#2bd4c4', sleeve: '#17a99b', outline: '#0a5f57' },
  kickoffFwd: 9,
  players: buildSquad(F_343, [
    { num: 1, name: 'SCHMEICHEL' },
    { num: 6, name: 'ANDERSEN' },
    { num: 4, name: 'KJÆR' },
    { num: 3, name: 'VESTERGAARD' },
    { num: 5, name: 'KRISTIANSEN' },
    { num: 23, name: 'HØJBJERG' },
    { num: 19, name: 'HJULMAND' },
    { num: 17, name: 'MÆHLE' },
    { num: 10, name: 'ERIKSEN' },
    { num: 9, name: 'HØJLUND' },
    { num: 14, name: 'DAMSGAARD' },
  ]),
};
