import { buildSquad, type TeamData } from './types';
import { F_433 } from './formations';

// Morocco — 4-3-3.
export const morocco: TeamData = {
  name: 'Morocco',
  abbr: 'MAR',
  formation: '4-3-3',
  color: '#c1272d',
  textColor: '#ffffff',
  kit: { shirt: '#c1272d', sleeve: '#991e23', outline: '#5a1114' },
  gkKit: { shirt: '#16a34a', sleeve: '#107a37', outline: '#08461f' },
  kickoffFwd: 9,
  players: buildSquad(F_433, [
    { num: 1, name: 'BOUNOU' },
    { num: 2, name: 'HAKIMI' },
    { num: 18, name: 'RIAD' },
    { num: 5, name: 'SAÂDANE' },
    { num: 3, name: 'MAZRAOUI' },
    { num: 4, name: 'AMRABAT' },
    { num: 8, name: 'OUNAHI' },
    { num: 23, name: 'EL KHANNOUSS' },
    { num: 7, name: 'TALBI' },
    { num: 20, name: 'EL KAABI' },
    { num: 10, name: 'DÍAZ' },
  ]),
};
