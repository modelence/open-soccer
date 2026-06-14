import { buildSquad, type TeamData } from './types';
import { F_4231 } from './formations';

// Switzerland — 4-2-3-1 (best-effort current XI).
export const switzerland: TeamData = {
  name: 'Switzerland',
  abbr: 'SUI',
  formation: '4-2-3-1',
  color: '#d52b1e',
  textColor: '#ffffff',
  kit: { shirt: '#d52b1e', sleeve: '#a81f16', outline: '#5e110c' },
  gkKit: { shirt: '#2bd47a', sleeve: '#17a95c', outline: '#0a5f33' },
  kickoffFwd: 9,
  players: buildSquad(F_4231, [
    { num: 1, name: 'SOMMER' },
    { num: 2, name: 'WIDMER' },
    { num: 22, name: 'SCHÄR' },
    { num: 5, name: 'AKANJI' },
    { num: 13, name: 'RODRÍGUEZ' },
    { num: 10, name: 'XHAKA' },
    { num: 8, name: 'FREULER' },
    { num: 23, name: 'XHEMAILI' },
    { num: 15, name: 'NDOYE' },
    { num: 9, name: 'EMBOLO' },
    { num: 19, name: 'VARGAS' },
  ]),
};
