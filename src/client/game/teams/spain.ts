import { buildSquad, type TeamData } from './types';
import { F_433 } from './formations';

// Spain — 4-3-3.
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
    { num: 1, name: 'RAYA' },
    { num: 12, name: 'PORRO' },
    { num: 4, name: 'GARCÍA' },
    { num: 14, name: 'LAPORTE' },
    { num: 24, name: 'CUCURELLA' },
    { num: 16, name: 'RODRI' },
    { num: 20, name: 'PEDRI' },
    { num: 6, name: 'MERINO' },
    { num: 19, name: 'YAMAL' },
    { num: 21, name: 'OYARZABAL' },
    { num: 17, name: 'WILLIAMS' },
  ]),
};
