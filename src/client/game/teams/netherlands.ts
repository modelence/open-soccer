import { buildSquad, type TeamData } from './types';
import { F_433 } from './formations';

// Netherlands — 4-3-3 (best-effort current XI).
export const netherlands: TeamData = {
  name: 'Netherlands',
  abbr: 'NED',
  formation: '4-3-3',
  color: '#f36c21',
  textColor: '#ffffff',
  kit: { shirt: '#f36c21', sleeve: '#d4571a', outline: '#7a3210' },
  gkKit: { shirt: '#1f1f24', sleeve: '#34343c', outline: '#000000' },
  kickoffFwd: 9,
  players: buildSquad(F_433, [
    { num: 1, name: 'VERBRUGGEN' },
    { num: 22, name: 'DUMFRIES' },
    { num: 4, name: 'VAN DIJK' },
    { num: 15, name: 'VAN DE VEN' },
    { num: 5, name: 'AKÉ' },
    { num: 21, name: 'DE JONG' },
    { num: 14, name: 'REIJNDERS' },
    { num: 8, name: 'GRAVENBERCH' },
    { num: 7, name: 'KLUIVERT' },
    { num: 10, name: 'DEPAY' },
    { num: 11, name: 'GAKPO' },
  ]),
};
