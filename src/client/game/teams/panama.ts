import { buildSquad, type TeamData } from './types';
import { F_442 } from './formations';

// Panama — 4-4-2 (best-effort current XI).
export const panama: TeamData = {
  name: 'Panama',
  abbr: 'PAN',
  formation: '4-4-2',
  color: '#c8102e',
  textColor: '#ffffff',
  kit: { shirt: '#c8102e', sleeve: '#1a3a6b', outline: '#0c2452' },
  gkKit: { shirt: '#2bd47a', sleeve: '#17a95c', outline: '#0a5f33' },
  kickoffFwd: 9,
  players: buildSquad(F_442, [
    { num: 1, name: 'MOSQUERA' },
    { num: 2, name: 'ANDRADE' },
    { num: 5, name: 'ESCOBAR' },
    { num: 3, name: 'CÓRDOBA' },
    { num: 17, name: 'DAVIS' },
    { num: 8, name: 'GÓDOY' },
    { num: 6, name: 'CARRASQUILLA' },
    { num: 20, name: 'AYARZA' },
    { num: 7, name: 'BÁRCENAS' },
    { num: 9, name: 'FAJARDO' },
    { num: 21, name: 'WATERMAN' },
  ]),
};
