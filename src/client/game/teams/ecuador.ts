import { buildSquad, type TeamData } from './types';
import { F_433 } from './formations';

// Ecuador — 4-3-3 (best-effort current XI).
export const ecuador: TeamData = {
  name: 'Ecuador',
  abbr: 'ECU',
  formation: '4-3-3',
  color: '#ffd100',
  textColor: '#15171c',
  kit: { shirt: '#ffd100', sleeve: '#1a4fa0', outline: '#0c2452' },
  gkKit: { shirt: '#2bd47a', sleeve: '#17a95c', outline: '#0a5f33' },
  kickoffFwd: 9,
  players: buildSquad(F_433, [
    { num: 1, name: 'GALÍNDEZ' },
    { num: 2, name: 'PRECIADO' },
    { num: 3, name: 'TORRES' },
    { num: 4, name: 'HINCAPIÉ' },
    { num: 7, name: 'ESTUPIÑÁN' },
    { num: 5, name: 'CAICEDO' },
    { num: 13, name: 'FRANCO' },
    { num: 8, name: 'PAGE' },
    { num: 16, name: 'PLATA' },
    { num: 9, name: 'VALENCIA' },
    { num: 11, name: 'RODRÍGUEZ' },
  ]),
};
