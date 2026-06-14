import { buildSquad, type TeamData } from './types';
import { F_352 } from './formations';

// Poland — 3-5-2 (best-effort current XI).
export const poland: TeamData = {
  name: 'Poland',
  abbr: 'POL',
  formation: '3-5-2',
  color: '#dc143c',
  textColor: '#ffffff',
  kit: { shirt: '#e7e7e7', sleeve: '#dc143c', outline: '#9c0e2a' },
  gkKit: { shirt: '#2bd47a', sleeve: '#17a95c', outline: '#0a5f33' },
  kickoffFwd: 9,
  players: buildSquad(F_352, [
    { num: 1, name: 'SZCZĘSNY' },
    { num: 2, name: 'BEDNAREK' },
    { num: 15, name: 'KIWIOR' },
    { num: 4, name: 'DAWIDOWICZ' },
    { num: 16, name: 'SLISZ' },
    { num: 21, name: 'FRANKOWSKI' },
    { num: 10, name: 'ZIELIŃSKI' },
    { num: 8, name: 'MODER' },
    { num: 5, name: 'ZALEWSKI' },
    { num: 9, name: 'LEWANDOWSKI' },
    { num: 7, name: 'ŚWIDERSKI' },
  ]),
};
