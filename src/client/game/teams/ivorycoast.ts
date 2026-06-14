import { buildSquad, type TeamData } from './types';
import { F_433 } from './formations';

// Ivory Coast — 4-3-3.
export const ivoryCoast: TeamData = {
  name: 'Ivory Coast',
  abbr: 'CIV',
  formation: '4-3-3',
  color: '#f77f00',
  textColor: '#ffffff',
  kit: { shirt: '#f77f00', sleeve: '#c66400', outline: '#7a3e00' },
  gkKit: { shirt: '#111827', sleeve: '#0a0f1c', outline: '#000000' },
  kickoffFwd: 9,
  players: buildSquad(F_433, [
    { num: 1, name: 'FOFANA' },
    { num: 5, name: 'SINGO' },
    { num: 7, name: 'KOSSOUNOU' },
    { num: 21, name: 'NDICKA' },
    { num: 3, name: 'KONAN' },
    { num: 8, name: 'KESSIÉ' },
    { num: 4, name: 'SERI' },
    { num: 18, name: 'SANGARÉ' },
    { num: 10, name: 'ADINGRA' },
    { num: 9, name: 'BONNY' },
    { num: 15, name: 'DIALLO' },
  ]),
};
