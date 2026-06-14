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
    { num: 12, name: 'ABDULHAMID' },
    { num: 4, name: 'AL-AMRI' },
    { num: 5, name: 'AL-TAMBAKTI' },
    { num: 2, name: 'MAJRASHI' },
    { num: 6, name: 'N. AL-DAWSARI' },
    { num: 23, name: 'KANNO' },
    { num: 7, name: 'AL-JUWAYR' },
    { num: 17, name: 'AL-GHANNAM' },
    { num: 9, name: 'AL-BURAIKAN' },
    { num: 10, name: 'S. AL-DAWSARI' },
  ]),
};
