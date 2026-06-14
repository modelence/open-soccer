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
    { num: 16, name: 'FOFANA Y.' },
    { num: 2, name: 'SINGO' },
    { num: 4, name: 'NDICKA' },
    { num: 22, name: 'BOLY' },
    { num: 3, name: 'AURIER' },
    { num: 5, name: 'SECK' },
    { num: 6, name: 'SANGARE' },
    { num: 13, name: 'KESSIE' },
    { num: 7, name: 'PEPE' },
    { num: 9, name: 'HALLER' },
    { num: 10, name: 'GRADEL' },
  ]),
};
