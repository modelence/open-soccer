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
    { num: 2, name: 'PAYNE' },
    { num: 4, name: 'BINDON' },
    { num: 5, name: 'BOXALL' },
    { num: 13, name: 'CACACE' },
    { num: 7, name: 'GARBETT' },
    { num: 6, name: 'BELL' },
    { num: 8, name: 'STAMENIĆ' },
    { num: 10, name: 'SINGH' },
    { num: 9, name: 'WOOD' },
    { num: 11, name: 'JUST' },
  ]),
};
