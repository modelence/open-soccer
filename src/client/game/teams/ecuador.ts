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
    { num: 17, name: 'PRECIADO' },
    { num: 6, name: 'PACHO' },
    { num: 3, name: 'HINCAPIÉ' },
    { num: 7, name: 'ESTUPIÑÁN' },
    { num: 23, name: 'CAICEDO' },
    { num: 21, name: 'FRANCO' },
    { num: 10, name: 'PÁEZ' },
    { num: 19, name: 'PLATA' },
    { num: 13, name: 'VALENCIA' },
    { num: 14, name: 'MINDA' },
  ]),
};
