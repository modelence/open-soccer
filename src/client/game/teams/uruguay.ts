import { buildSquad, type TeamData } from './types';
import { F_433 } from './formations';

// Uruguay — 4-3-3 (best-effort current XI).
export const uruguay: TeamData = {
  name: 'Uruguay',
  abbr: 'URU',
  formation: '4-3-3',
  color: '#5aa6dd',
  textColor: '#15171c',
  kit: { shirt: '#5aa6dd', sleeve: '#3d87bd', outline: '#1f4d70' },
  gkKit: { shirt: '#1f1f24', sleeve: '#34343c', outline: '#000000' },
  kickoffFwd: 9,
  players: buildSquad(F_433, [
    { num: 1, name: 'ROCHET' },
    { num: 13, name: 'VARELA' },
    { num: 4, name: 'ARAÚJO' },
    { num: 2, name: 'GIMÉNEZ' },
    { num: 16, name: 'OLIVERA' },
    { num: 5, name: 'UGARTE' },
    { num: 6, name: 'BENTANCUR' },
    { num: 8, name: 'VALVERDE' },
    { num: 11, name: 'PELLISTRI' },
    { num: 9, name: 'NÚÑEZ' },
    { num: 10, name: 'DE ARRASCAETA' },
  ]),
};
