import { buildSquad, type TeamData } from './types';
import { F_433 } from './formations';

// Egypt — 4-3-3.
export const egypt: TeamData = {
  name: 'Egypt',
  abbr: 'EGY',
  formation: '4-3-3',
  color: '#c8102e',
  textColor: '#ffffff',
  kit: { shirt: '#c8102e', sleeve: '#a00b24', outline: '#5e0714' },
  gkKit: { shirt: '#111827', sleeve: '#0a0f1c', outline: '#000000' },
  kickoffFwd: 9,
  players: buildSquad(F_433, [
    { num: 1, name: 'EL SHENAWY' },
    { num: 3, name: 'HANY' },
    { num: 6, name: 'ABDELMONEM' },
    { num: 4, name: 'ABDELMAGUID' },
    { num: 13, name: 'FATOUH' },
    { num: 8, name: 'ASHOUR' },
    { num: 14, name: 'FATHY' },
    { num: 25, name: 'ZIZO' },
    { num: 7, name: 'TRÉZÉGUET' },
    { num: 22, name: 'MARMOUSH' },
    { num: 10, name: 'SALAH' },
  ]),
};
