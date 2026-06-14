import { buildSquad, type TeamData } from './types';
import { F_352 } from './formations';

// Italy — 3-5-2 (best-effort current XI).
export const italy: TeamData = {
  name: 'Italy',
  abbr: 'ITA',
  formation: '3-5-2',
  color: '#1c4fb3',
  textColor: '#ffffff',
  kit: { shirt: '#1c4fb3', sleeve: '#163f90', outline: '#0c2452' },
  gkKit: { shirt: '#f6e94a', sleeve: '#d4c920', outline: '#7a7010' },
  kickoffFwd: 9,
  players: buildSquad(F_352, [
    { num: 21, name: 'DONNARUMMA' },
    { num: 23, name: 'BASTONI' },
    { num: 6, name: 'CALAFIORI' },
    { num: 19, name: 'DI LORENZO' },
    { num: 18, name: 'BARELLA' },
    { num: 2, name: 'CAMBIASO' },
    { num: 16, name: 'TONALI' },
    { num: 8, name: 'FRATTESI' },
    { num: 3, name: 'DIMARCO' },
    { num: 10, name: 'RETEGUI' },
    { num: 14, name: 'CHIESA' },
  ]),
};
