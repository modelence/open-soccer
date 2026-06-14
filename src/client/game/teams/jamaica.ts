import { buildSquad, type TeamData } from './types';
import { F_433 } from './formations';

// Jamaica — 4-3-3 (best-effort current XI).
export const jamaica: TeamData = {
  name: 'Jamaica',
  abbr: 'JAM',
  formation: '4-3-3',
  color: '#fed100',
  textColor: '#15171c',
  kit: { shirt: '#fed100', sleeve: '#0a7a3a', outline: '#055226' },
  gkKit: { shirt: '#1f1f24', sleeve: '#34343c', outline: '#000000' },
  kickoffFwd: 9,
  players: buildSquad(F_433, [
    { num: 1, name: 'BLAKE' },
    { num: 2, name: 'LOWE' },
    { num: 5, name: 'PINNOCK' },
    { num: 16, name: 'BENNETT' },
    { num: 3, name: 'MILLER' },
    { num: 17, name: 'LATIBEAUDIERE' },
    { num: 8, name: 'CAMPBELL' },
    { num: 10, name: 'GRAY' },
    { num: 7, name: 'BAILEY' },
    { num: 9, name: 'ANTONIO' },
    { num: 11, name: 'NICHOLSON' },
  ]),
};
