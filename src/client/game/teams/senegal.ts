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
    { num: 15, name: 'DIATTA' },
    { num: 3, name: 'KOULIBALY' },
    { num: 19, name: 'NIAKHATÉ' },
    { num: 14, name: 'JAKOBS' },
    { num: 5, name: 'GUEYE' },
    { num: 8, name: 'CAMARA' },
    { num: 17, name: 'P. M. SARR' },
    { num: 18, name: 'I. SARR' },
    { num: 11, name: 'JACKSON' },
    { num: 10, name: 'MANÉ' },
  ]),
};
