import { buildSquad, type TeamData } from './types';
import { F_433 } from './formations';

// Algeria — 4-3-3.
export const algeria: TeamData = {
  name: 'Algeria',
  abbr: 'ALG',
  formation: '4-3-3',
  color: '#0a7a3b',
  textColor: '#ffffff',
  kit: { shirt: '#ffffff', sleeve: '#e6e6e6', outline: '#9ca3af' },
  gkKit: { shirt: '#0a7a3b', sleeve: '#075c2c', outline: '#033017' },
  kickoffFwd: 9,
  players: buildSquad(F_433, [
    { num: 1, name: 'M\u2019BOLHI' },
    { num: 2, name: 'ATAL' },
    { num: 4, name: 'MANDI' },
    { num: 5, name: 'BENSEBAINI' },
    { num: 21, name: 'AIT NOURI' },
    { num: 8, name: 'BENNACER' },
    { num: 17, name: 'ZERROUKI' },
    { num: 13, name: 'CHAIBI' },
    { num: 7, name: 'MAHREZ' },
    { num: 9, name: 'AMOURA' },
    { num: 10, name: 'BELAILI' },
  ]),
};
