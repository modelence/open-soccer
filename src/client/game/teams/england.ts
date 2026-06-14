import { buildSquad, type TeamData } from './types';
import { F_4231 } from './formations';

// England — 4-2-3-1 (best-effort current XI).
export const england: TeamData = {
  name: 'England',
  abbr: 'ENG',
  formation: '4-2-3-1',
  color: '#f4f4f4',
  textColor: '#0a1f44',
  kit: { shirt: '#f4f4f4', sleeve: '#dfe3ea', outline: '#13235b' },
  gkKit: { shirt: '#2bb673', sleeve: '#1d9159', outline: '#0c4f30' },
  kickoffFwd: 9,
  players: buildSquad(F_4231, [
    { num: 1, name: 'PICKFORD' },
    { num: 2, name: 'WALKER' },
    { num: 5, name: 'STONES' },
    { num: 6, name: 'GUÉHI' },
    { num: 3, name: 'SHAW' },
    { num: 4, name: 'RICE' },
    { num: 26, name: 'MAINOO' },
    { num: 10, name: 'BELLINGHAM' },
    { num: 7, name: 'SAKA' },
    { num: 9, name: 'KANE' },
    { num: 11, name: 'FODEN' },
  ]),
};
