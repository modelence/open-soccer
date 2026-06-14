import { buildSquad, type TeamData } from './types';
import { F_4231 } from './formations';

// France — 4-2-3-1 (Deschamps era, best-effort current XI).
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
    { num: 22, name: 'T. HERNÁNDEZ' },
    { num: 8, name: 'TCHOUAMÉNI' },
    { num: 13, name: 'KANTÉ' },
    { num: 7, name: 'GRIEZMANN' },
    { num: 11, name: 'DEMBÉLÉ' },
    { num: 9, name: 'KOLO MUANI' },
    { num: 10, name: 'MBAPPÉ' },
  ]),
};
