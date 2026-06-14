import { buildSquad, type TeamData } from './types';
import { F_433 } from './formations';

// Tunisia — 4-3-3.
export const tunisia: TeamData = {
  name: 'Tunisia',
  abbr: 'TUN',
  formation: '4-3-3',
  color: '#c8102e',
  textColor: '#ffffff',
  kit: { shirt: '#c8102e', sleeve: '#a00b24', outline: '#5e0714' },
  gkKit: { shirt: '#111827', sleeve: '#0a0f1c', outline: '#000000' },
  kickoffFwd: 9,
  players: buildSquad(F_433, [
    { num: 16, name: 'DAHMEN' },
    { num: 2, name: 'TALBI' },
    { num: 3, name: 'BRONN' },
    { num: 6, name: 'MERIAH' },
    { num: 21, name: 'ABDI' },
    { num: 8, name: 'LAIDOUNI' },
    { num: 13, name: 'SKHIRI' },
    { num: 7, name: 'LAABIDI' },
    { num: 10, name: 'MSAKNI' },
    { num: 9, name: 'JEBALI' },
    { num: 11, name: 'KHAZRI' },
  ]),
};
