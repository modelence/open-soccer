import { buildSquad, type TeamData } from './types';
import { F_433 } from './formations';

// Senegal — 4-3-3.
export const senegal: TeamData = {
  name: 'Senegal',
  abbr: 'SEN',
  formation: '4-3-3',
  color: '#1f9d55',
  textColor: '#ffffff',
  kit: { shirt: '#ffffff', sleeve: '#e6e6e6', outline: '#9ca3af' },
  gkKit: { shirt: '#1f9d55', sleeve: '#147a40', outline: '#0a4523' },
  kickoffFwd: 9,
  players: buildSquad(F_433, [
    { num: 16, name: 'MENDY' },
    { num: 2, name: 'KOULIBALY' },
    { num: 3, name: 'DIALLO' },
    { num: 22, name: 'SABALY' },
    { num: 12, name: 'JAKOBS' },
    { num: 6, name: 'GUEYE' },
    { num: 5, name: 'MENDY N.' },
    { num: 17, name: 'SARR' },
    { num: 7, name: 'ISMAILA SARR' },
    { num: 9, name: 'DIA' },
    { num: 18, name: 'JACKSON' },
  ]),
};
