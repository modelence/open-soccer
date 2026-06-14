import { buildSquad, type TeamData } from './types';
import { F_4231 } from './formations';

// Iran — 4-2-3-1.
export const iran: TeamData = {
  name: 'Iran',
  abbr: 'IRN',
  formation: '4-2-3-1',
  color: '#d11a2a',
  textColor: '#ffffff',
  kit: { shirt: '#ffffff', sleeve: '#e6e6e6', outline: '#9ca3af' },
  gkKit: { shirt: '#1f9d55', sleeve: '#147a40', outline: '#0a4523' },
  kickoffFwd: 9,
  players: buildSquad(F_4231, [
    { num: 1, name: 'BEIRANVAND' },
    { num: 23, name: 'REZAEIAN' },
    { num: 8, name: 'HOSSEINI' },
    { num: 19, name: 'KHALILZADEH' },
    { num: 5, name: 'MOHARRAMI' },
    { num: 6, name: 'EZATOLAHI' },
    { num: 3, name: 'NOUROLLAHI' },
    { num: 18, name: 'JAHANBAKHSH' },
    { num: 7, name: 'GHODDOS' },
    { num: 9, name: 'TAREMI' },
    { num: 20, name: 'AZMOUN' },
  ]),
};
