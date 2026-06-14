import { buildSquad, type TeamData } from './types';
import { F_433 } from './formations';

// USA — 4-3-3 (best-effort current XI).
export const usa: TeamData = {
  name: 'United States',
  abbr: 'USA',
  formation: '4-3-3',
  color: '#1a3a6b',
  textColor: '#ffffff',
  kit: { shirt: '#f4f4f4', sleeve: '#1a3a6b', outline: '#0c2452' },
  gkKit: { shirt: '#2bd47a', sleeve: '#17a95c', outline: '#0a5f33' },
  kickoffFwd: 9,
  players: buildSquad(F_433, [
    { num: 1, name: 'TURNER' },
    { num: 2, name: 'DEST' },
    { num: 3, name: 'RICHARDS' },
    { num: 13, name: 'REAM' },
    { num: 5, name: 'ROBINSON' },
    { num: 6, name: 'MUSAH' },
    { num: 8, name: 'MCKENNIE' },
    { num: 4, name: 'ADAMS' },
    { num: 10, name: 'PULISIC' },
    { num: 9, name: 'BALOGUN' },
    { num: 11, name: 'WEAH' },
  ]),
};
