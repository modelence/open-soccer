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
    { num: 5, name: 'AGUERD' },
    { num: 18, name: 'EL YAMIQ' },
    { num: 3, name: 'MAZRAOUI' },
    { num: 4, name: 'AMRABAT' },
    { num: 8, name: 'OUNAHI' },
    { num: 15, name: 'AMALLAH' },
    { num: 7, name: 'ZIYECH' },
    { num: 19, name: 'EN-NESYRI' },
    { num: 11, name: 'BOUFAL' },
  ]),
};
