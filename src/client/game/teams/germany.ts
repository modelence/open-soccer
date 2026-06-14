import { buildSquad, type TeamData } from './types';
import { F_4231 } from './formations';

// Germany — 4-2-3-1 (Euro 2024 XI).
export const germany: TeamData = {
  name: 'Germany',
  abbr: 'GER',
  formation: '4-2-3-1',
  color: '#f4f4f4',
  textColor: '#15171c',
  kit: { shirt: '#f4f4f4', sleeve: '#d2d2d2', outline: '#2b2b2b' },
  gkKit: { shirt: '#27e0a6', sleeve: '#12a878', outline: '#0a5c42' },
  kickoffFwd: 9,
  players: buildSquad(F_4231, [
    { num: 1, name: 'NEUER' },
    { num: 6, name: 'KIMMICH' },
    { num: 4, name: 'TAH' },
    { num: 2, name: 'RÜDIGER' },
    { num: 18, name: 'MITTELSTÄDT' },
    { num: 8, name: 'KROOS' },
    { num: 23, name: 'ANDRICH' },
    { num: 21, name: 'GÜNDOĞAN' },
    { num: 17, name: 'WIRTZ' },
    { num: 7, name: 'HAVERTZ' },
    { num: 10, name: 'MUSIALA' },
  ]),
};
