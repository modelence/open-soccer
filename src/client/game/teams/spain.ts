import { buildSquad, type TeamData } from './types';
import { F_433 } from './formations';

// Spain — 4-3-3 (Euro 2024 winning XI).
export const spain: TeamData = {
  name: 'Spain',
  abbr: 'ESP',
  formation: '4-3-3',
  color: '#e10b1a',
  textColor: '#ffffff',
  kit: { shirt: '#e10b1a', sleeve: '#b00813', outline: '#6e040b' },
  gkKit: { shirt: '#ffb52e', sleeve: '#cc8512', outline: '#7a4d08' },
  kickoffFwd: 9,
  players: buildSquad(F_433, [
    { num: 23, name: 'SIMÓN' },
    { num: 2, name: 'CARVAJAL' },
    { num: 3, name: 'LE NORMAND' },
    { num: 14, name: 'LAPORTE' },
    { num: 24, name: 'CUCURELLA' },
    { num: 16, name: 'RODRI' },
    { num: 8, name: 'PEDRI' },
    { num: 10, name: 'OLMO' },
    { num: 19, name: 'YAMAL' },
    { num: 7, name: 'MORATA' },
    { num: 17, name: 'WILLIAMS' },
  ]),
};
