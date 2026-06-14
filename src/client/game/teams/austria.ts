import { buildSquad, type TeamData } from './types';
import { F_4231 } from './formations';

// Austria — 4-2-3-1 (best-effort current XI).
export const austria: TeamData = {
  name: 'Austria',
  abbr: 'AUT',
  formation: '4-2-3-1',
  color: '#ed2939',
  textColor: '#ffffff',
  kit: { shirt: '#ed2939', sleeve: '#bd1f2d', outline: '#5e0f16' },
  gkKit: { shirt: '#2bd47a', sleeve: '#17a95c', outline: '#0a5f33' },
  kickoffFwd: 9,
  players: buildSquad(F_4231, [
    { num: 1, name: 'PENTZ' },
    { num: 21, name: 'POSCH' },
    { num: 4, name: 'DANSO' },
    { num: 15, name: 'WÖBER' },
    { num: 17, name: 'PRASS' },
    { num: 6, name: 'SEIWALD' },
    { num: 7, name: 'SCHMID' },
    { num: 10, name: 'BAUMGARTNER' },
    { num: 9, name: 'SABITZER' },
    { num: 24, name: 'GREGORITSCH' },
    { num: 19, name: 'WIMMER' },
  ]),
};
