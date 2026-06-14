import { buildSquad, type TeamData } from './types';
import { F_442 } from './formations';

// Panama — 4-4-2.
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
    { num: 1, name: 'MEJÍA' },
    { num: 23, name: 'MURILLO' },
    { num: 3, name: 'CÓRDOBA' },
    { num: 4, name: 'ESCOBAR' },
    { num: 15, name: 'DAVIS' },
    { num: 7, name: 'J. RODRÍGUEZ' },
    { num: 8, name: 'CARRASQUILLA' },
    { num: 20, name: 'GODOY' },
    { num: 11, name: 'BÁRCENAS' },
    { num: 17, name: 'FAJARDO' },
    { num: 18, name: 'WATERMAN' },
  ]),
};
