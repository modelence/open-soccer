import { buildSquad, type TeamData } from './types';
import { F_442 } from './formations';

// New Zealand — 4-4-2.
export const newZealand: TeamData = {
  name: 'New Zealand',
  abbr: 'NZL',
  formation: '4-4-2',
  color: '#111827',
  textColor: '#ffffff',
  kit: { shirt: '#ffffff', sleeve: '#e6e6e6', outline: '#9ca3af' },
  gkKit: { shirt: '#111827', sleeve: '#0a0f1c', outline: '#000000' },
  kickoffFwd: 9,
  players: buildSquad(F_442, [
    { num: 1, name: 'CROCOMBE' },
    { num: 2, name: 'SURMAN' },
    { num: 5, name: 'BOXALL' },
    { num: 19, name: 'TUILOMA' },
    { num: 3, name: 'CACACE' },
    { num: 7, name: 'STAMENIC' },
    { num: 14, name: 'BELL' },
    { num: 13, name: 'LUST' },
    { num: 11, name: 'JUST' },
    { num: 9, name: 'WOOD' },
    { num: 10, name: 'GARBETT' },
  ]),
};
