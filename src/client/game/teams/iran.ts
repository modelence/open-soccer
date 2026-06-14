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
    { num: 2, name: 'HARDANI' },
    { num: 4, name: 'KHALILZADEH' },
    { num: 13, name: 'KANAANIZADEGAN' },
    { num: 5, name: 'MOHAMMADI' },
    { num: 6, name: 'EZATOLAHI' },
    { num: 14, name: 'GHODDOS' },
    { num: 7, name: 'JAHANBAKHSH' },
    { num: 8, name: 'MOHEBI' },
    { num: 9, name: 'TAREMI' },
    { num: 10, name: 'GHAYEDI' },
  ]),
};
