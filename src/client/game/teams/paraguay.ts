import { buildSquad, type TeamData } from './types';
import { F_442 } from './formations';

// Paraguay — 4-4-2 (best-effort current XI).
export const paraguay: TeamData = {
  name: 'Paraguay',
  abbr: 'PAR',
  formation: '4-4-2',
  color: '#d52b1e',
  textColor: '#ffffff',
  kit: { shirt: '#d52b1e', sleeve: '#1a4fa0', outline: '#0c2452' },
  gkKit: { shirt: '#1f1f24', sleeve: '#34343c', outline: '#000000' },
  kickoffFwd: 9,
  players: buildSquad(F_442, [
    { num: 1, name: 'FERNÁNDEZ' },
    { num: 2, name: 'VELÁZQUEZ' },
    { num: 15, name: 'G. GÓMEZ' },
    { num: 3, name: 'ALDERETE' },
    { num: 6, name: 'ALONSO' },
    { num: 7, name: 'SOSA' },
    { num: 14, name: 'CUBAS' },
    { num: 8, name: 'D. GÓMEZ' },
    { num: 10, name: 'ALMIRÓN' },
    { num: 9, name: 'SANABRIA' },
    { num: 19, name: 'ENCISO' },
  ]),
};
