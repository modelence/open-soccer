import { buildSquad, type TeamData } from './types';
import { F_4231 } from './formations';

// Belgium — 4-2-3-1 (best-effort current XI).
export const belgium: TeamData = {
  name: 'Belgium',
  abbr: 'BEL',
  formation: '4-2-3-1',
  color: '#e30613',
  textColor: '#ffffff',
  kit: { shirt: '#e30613', sleeve: '#b3050f', outline: '#5e0308' },
  gkKit: { shirt: '#f6e94a', sleeve: '#d4c920', outline: '#7a7010' },
  kickoffFwd: 9,
  players: buildSquad(F_4231, [
    { num: 1, name: 'COURTOIS' },
    { num: 2, name: 'DEBAST' },
    { num: 3, name: 'THEATE' },
    { num: 4, name: 'MECHELE' },
    { num: 5, name: 'DE CUYPER' },
    { num: 6, name: 'WITSEL' },
    { num: 8, name: 'TIELEMANS' },
    { num: 7, name: 'DE BRUYNE' },
    { num: 11, name: 'DOKU' },
    { num: 9, name: 'LUKAKU' },
    { num: 10, name: 'TROSSARD' },
  ]),
};
