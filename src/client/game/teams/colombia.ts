import { buildSquad, type TeamData } from './types';
import { F_4231 } from './formations';

// Colombia — 4-2-3-1 (best-effort current XI).
export const colombia: TeamData = {
  name: 'Colombia',
  abbr: 'COL',
  formation: '4-2-3-1',
  color: '#fcd116',
  textColor: '#15171c',
  kit: { shirt: '#fcd116', sleeve: '#d8b00e', outline: '#7a6300' },
  gkKit: { shirt: '#2b7fff', sleeve: '#1f63cc', outline: '#0a2f6e' },
  kickoffFwd: 9,
  players: buildSquad(F_4231, [
    { num: 1, name: 'VARGAS' },
    { num: 4, name: 'MUÑOZ' },
    { num: 2, name: 'CUESTA' },
    { num: 23, name: 'S. ARIAS' },
    { num: 17, name: 'MOJICA' },
    { num: 15, name: 'C. SÁNCHEZ' },
    { num: 16, name: 'LERMA' },
    { num: 10, name: 'J. RODRÍGUEZ' },
    { num: 11, name: 'D. DÍAZ' },
    { num: 9, name: 'J. CÓRDOBA' },
    { num: 7, name: 'L. DÍAZ' },
  ]),
};
