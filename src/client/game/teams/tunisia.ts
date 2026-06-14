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
    { num: 20, name: 'VALERY' },
    { num: 3, name: 'TALBI' },
    { num: 6, name: 'BRONN' },
    { num: 2, name: 'ABDI' },
    { num: 17, name: 'SKHIRI' },
    { num: 13, name: 'KHEDIRA' },
    { num: 10, name: 'MEJBRI' },
    { num: 7, name: 'ACHOURI' },
    { num: 9, name: 'MASTOURI' },
    { num: 8, name: 'SAAD' },
  ]),
};
