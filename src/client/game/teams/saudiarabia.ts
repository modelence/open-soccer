import { buildSquad, type TeamData } from './types';
import { F_433 } from './formations';

// Saudi Arabia — 4-3-3.
export const saudiArabia: TeamData = {
  name: 'Saudi Arabia',
  abbr: 'KSA',
  formation: '4-3-3',
  color: '#0a7a3b',
  textColor: '#ffffff',
  kit: { shirt: '#0a7a3b', sleeve: '#075c2c', outline: '#033017' },
  gkKit: { shirt: '#f59e0b', sleeve: '#c47b06', outline: '#7a4d02' },
  kickoffFwd: 9,
  players: buildSquad(F_433, [
    { num: 21, name: 'AL-OWAIS' },
    { num: 2, name: 'AL-GHANNAM' },
    { num: 5, name: 'AL-AMRI' },
    { num: 3, name: 'AL-BULAYHI' },
    { num: 13, name: 'AL-SHAHRANI' },
    { num: 7, name: 'AL-FARAJ' },
    { num: 8, name: 'KANNO' },
    { num: 14, name: 'AL-MALKI' },
    { num: 18, name: 'AL-DAWSARI' },
    { num: 9, name: 'AL-SHEHRI' },
    { num: 10, name: 'AL-BURAYK' },
  ]),
};
