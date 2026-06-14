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
    { num: 12, name: 'ATI-ZIGI' },
    { num: 2, name: 'LAMPTEY' },
    { num: 5, name: 'DJIKU' },
    { num: 4, name: 'SALISU' },
    { num: 3, name: 'MENSAH' },
    { num: 10, name: 'PARTEY' },
    { num: 8, name: 'KUDUS' },
    { num: 6, name: 'BAIDOO' },
    { num: 7, name: 'SEMENYO' },
    { num: 9, name: 'JORDAN AYEW' },
    { num: 18, name: 'SULEMANA' },
  ]),
};
