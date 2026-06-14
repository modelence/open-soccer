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
    { num: 1, name: 'MASTIL' },
    { num: 17, name: 'BELGHALI' },
    { num: 2, name: 'MANDI' },
    { num: 21, name: 'BENSEBAINI' },
    { num: 15, name: 'AÏT-NOURI' },
    { num: 6, name: 'ZERROUKI' },
    { num: 8, name: 'AOUAR' },
    { num: 10, name: 'CHAÏBI' },
    { num: 7, name: 'MAHREZ' },
    { num: 9, name: 'GOUIRI' },
    { num: 18, name: 'AMOURA' },
  ]),
};
