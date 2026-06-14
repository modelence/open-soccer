import { buildSquad, type TeamData } from './types';
import { F_4231 } from './formations';

// France — 4-2-3-1.
export const france: TeamData = {
  name: 'France',
  abbr: 'FRA',
  formation: '4-2-3-1',
  color: '#21356e',
  textColor: '#ffffff',
  kit: { shirt: '#21356e', sleeve: '#172a5c', outline: '#0c1838' },
  gkKit: { shirt: '#d6e34a', sleeve: '#b4c130', outline: '#6f7a14' },
  kickoffFwd: 9,
  players: buildSquad(F_4231, [
    { num: 16, name: 'MAIGNAN' },
    { num: 5, name: 'KOUNDÉ' },
    { num: 4, name: 'UPAMECANO' },
    { num: 17, name: 'SALIBA' },
    { num: 19, name: 'T. HERNANDEZ' },
    { num: 8, name: 'TCHOUAMÉNI' },
    { num: 6, name: 'KONÉ' },
    { num: 11, name: 'OLISE' },
    { num: 7, name: 'DEMBÉLÉ' },
    { num: 10, name: 'MBAPPÉ' },
    { num: 9, name: 'THURAM' },
  ]),
};
