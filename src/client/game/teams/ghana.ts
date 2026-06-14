import { buildSquad, type TeamData } from './types';
import { F_4231 } from './formations';

// Ghana — 4-2-3-1.
export const ghana: TeamData = {
  name: 'Ghana',
  abbr: 'GHA',
  formation: '4-2-3-1',
  color: '#0a7a3b',
  textColor: '#ffffff',
  kit: { shirt: '#ffffff', sleeve: '#e6e6e6', outline: '#9ca3af' },
  gkKit: { shirt: '#0a7a3b', sleeve: '#075c2c', outline: '#033017' },
  kickoffFwd: 9,
  players: buildSquad(F_4231, [
    { num: 1, name: 'ATI-ZIGI' },
    { num: 2, name: 'SEIDU' },
    { num: 4, name: 'ADJETEY' },
    { num: 6, name: 'MUMIN' },
    { num: 14, name: 'MENSAH' },
    { num: 5, name: 'PARTEY' },
    { num: 8, name: 'SIBO' },
    { num: 11, name: 'SEMENYO' },
    { num: 7, name: 'FATAWU' },
    { num: 9, name: 'JORDAN AYEW' },
    { num: 19, name: 'I. WILLIAMS' },
  ]),
};
