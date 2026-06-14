import { buildSquad, type TeamData } from './types';
import { F_4231 } from './formations';

// Nigeria — 4-2-3-1.
export const nigeria: TeamData = {
  name: 'Nigeria',
  abbr: 'NGA',
  formation: '4-2-3-1',
  color: '#0a7a3b',
  textColor: '#ffffff',
  kit: { shirt: '#0a7a3b', sleeve: '#075c2c', outline: '#033017' },
  gkKit: { shirt: '#f59e0b', sleeve: '#c47b06', outline: '#7a4d02' },
  kickoffFwd: 9,
  players: buildSquad(F_4231, [
    { num: 23, name: 'NWABALI' },
    { num: 2, name: 'AINA' },
    { num: 5, name: 'EKONG' },
    { num: 22, name: 'BASSEY' },
    { num: 3, name: 'SANUSI' },
    { num: 17, name: 'ONYEKA' },
    { num: 8, name: 'IWOBI' },
    { num: 10, name: 'NDIDI' },
    { num: 11, name: 'LOOKMAN' },
    { num: 9, name: 'OSIMHEN' },
    { num: 7, name: 'CHUKWUEZE' },
  ]),
};
