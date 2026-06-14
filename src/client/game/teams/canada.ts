import { buildSquad, type TeamData } from './types';
import { F_433 } from './formations';

// Canada — 4-3-3 (best-effort current XI).
export const canada: TeamData = {
  name: 'Canada',
  abbr: 'CAN',
  formation: '4-3-3',
  color: '#d52b1e',
  textColor: '#ffffff',
  kit: { shirt: '#d52b1e', sleeve: '#a81f16', outline: '#5e110c' },
  gkKit: { shirt: '#1f1f24', sleeve: '#34343c', outline: '#000000' },
  kickoffFwd: 9,
  players: buildSquad(F_433, [
    { num: 1, name: 'ST. CLAIR' },
    { num: 2, name: 'JOHNSTON' },
    { num: 13, name: 'CORNELIUS' },
    { num: 15, name: 'BOMBITO' },
    { num: 19, name: 'DAVIES' },
    { num: 7, name: 'EUSTÁQUIO' },
    { num: 8, name: 'KONÉ' },
    { num: 21, name: 'OSORIO' },
    { num: 17, name: 'BUCHANAN' },
    { num: 10, name: 'DAVID' },
    { num: 14, name: 'SHAFFELBURG' },
  ]),
};
