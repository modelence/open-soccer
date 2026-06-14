import { buildSquad, type TeamData } from './types';
import { F_433 } from './formations';

// Mexico — 4-3-3 (best-effort current XI).
export const mexico: TeamData = {
  name: 'Mexico',
  abbr: 'MEX',
  formation: '4-3-3',
  color: '#0a6b3a',
  textColor: '#ffffff',
  kit: { shirt: '#0a6b3a', sleeve: '#08572f', outline: '#043019' },
  gkKit: { shirt: '#fb3acb', sleeve: '#d41ba8', outline: '#7a0a60' },
  kickoffFwd: 9,
  players: buildSquad(F_433, [
    { num: 1, name: 'RANGEL' },
    { num: 2, name: 'SÁNCHEZ' },
    { num: 3, name: 'MONTES' },
    { num: 5, name: 'VÁSQUEZ' },
    { num: 23, name: 'GALLARDO' },
    { num: 4, name: 'ÁLVAREZ' },
    { num: 6, name: 'LIRA' },
    { num: 17, name: 'PINEDA' },
    { num: 25, name: 'ALVARADO' },
    { num: 9, name: 'JIMÉNEZ' },
    { num: 10, name: 'VEGA' },
  ]),
};
