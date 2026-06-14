import { buildSquad, type TeamData } from './types';
import { F_433 } from './formations';

// Haiti — 4-3-3.
export const haiti: TeamData = {
  name: 'Haiti',
  abbr: 'HAI',
  formation: '4-3-3',
  color: '#1f3a93',
  textColor: '#ffffff',
  kit: { shirt: '#1f3a93', sleeve: '#162b6f', outline: '#0a153a' },
  gkKit: { shirt: '#c8102e', sleeve: '#a00b24', outline: '#5e0714' },
  kickoffFwd: 9,
  players: buildSquad(F_433, [
    { num: 1, name: 'PLACIDE' },
    { num: 2, name: 'ARCUS' },
    { num: 4, name: 'ADÉ' },
    { num: 5, name: 'DELCROIX' },
    { num: 22, name: 'DUVERNE' },
    { num: 6, name: 'SAINTÉ' },
    { num: 17, name: 'JEAN JACQUES' },
    { num: 10, name: 'BELLEGARDE' },
    { num: 7, name: 'ETIENNE' },
    { num: 20, name: 'PIERROT' },
    { num: 11, name: 'DEEDSON' },
  ]),
};
