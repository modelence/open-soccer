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
    { num: 2, name: 'HEGAZI' },
    { num: 6, name: 'ABDELMONEM' },
    { num: 20, name: 'HAMDI' },
    { num: 13, name: 'FATHY' },
    { num: 17, name: 'ELNENY' },
    { num: 8, name: 'ATTIA' },
    { num: 14, name: 'TREZEGUET' },
    { num: 7, name: 'SALAH' },
    { num: 9, name: 'MARMOUSH' },
    { num: 21, name: 'ZIZO' },
  ]),
};
