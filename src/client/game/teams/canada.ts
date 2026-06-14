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
    { num: 1, name: 'CRÉPEAU' },
    { num: 2, name: 'JOHNSTON' },
    { num: 4, name: 'VITÓRIA' },
    { num: 5, name: 'CORNELIUS' },
    { num: 3, name: 'DAVIES' },
    { num: 13, name: 'KONÉ' },
    { num: 7, name: 'EUSTÁQUIO' },
    { num: 6, name: 'OSORIO' },
    { num: 19, name: 'BUCHANAN' },
    { num: 9, name: 'LARIN' },
    { num: 20, name: 'DAVID' },
  ]),
};
