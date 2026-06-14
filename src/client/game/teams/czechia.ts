import { buildSquad, type TeamData } from './types';
import { F_4231 } from './formations';

// Czech Republic — 4-2-3-1.
export const czechia: TeamData = {
  name: 'Czech Republic',
  abbr: 'CZE',
  formation: '4-2-3-1',
  color: '#c8102e',
  textColor: '#ffffff',
  kit: { shirt: '#c8102e', sleeve: '#a00b24', outline: '#5e0714' },
  gkKit: { shirt: '#111827', sleeve: '#0a0f1c', outline: '#000000' },
  kickoffFwd: 9,
  players: buildSquad(F_4231, [
    { num: 1, name: 'KOVÁŘ' },
    { num: 5, name: 'COUFAL' },
    { num: 7, name: 'KREJČÍ' },
    { num: 4, name: 'HRANÁČ' },
    { num: 14, name: 'JURÁSEK' },
    { num: 22, name: 'SOUČEK' },
    { num: 18, name: 'SADÍLEK' },
    { num: 17, name: 'PROVOD' },
    { num: 9, name: 'HLOŽEK' },
    { num: 10, name: 'SCHICK' },
    { num: 15, name: 'ŠULC' },
  ]),
};
